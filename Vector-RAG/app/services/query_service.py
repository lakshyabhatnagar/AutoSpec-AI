"""
Query service — orchestration layer between routes and retrievers.
Handles retrieval mode dispatch, query routing, and generation.
"""
import json
import logging
from typing import Optional

from google import genai

from app.config.settings import settings
from app.models.schemas import RetrievalMode
from app.retrieval.base import BaseRetriever, RetrievalResult
from app.retrieval.semantic import SemanticRetriever
from app.retrieval.bm25 import BM25Retriever
from app.retrieval.hybrid import HybridRetriever
from app.retrieval.hybrid_rerank import HybridRerankRetriever
from app.retrieval.critical import CriticalRetriever

logger = logging.getLogger("rag.services.query")

# ── Retriever registry ───────────────────────────────────────────────────
_retrievers: dict[RetrievalMode, BaseRetriever] = {
    RetrievalMode.semantic: SemanticRetriever(),
    RetrievalMode.bm25: BM25Retriever(),
    RetrievalMode.hybrid: HybridRetriever(),
    RetrievalMode.hybrid_rerank: HybridRerankRetriever(),
}

_critical_retriever = CriticalRetriever()

# ── Generation client ────────────────────────────────────────────────────
_gen_client = genai.Client(
    vertexai=True,
    project=settings.VERTEX_PROJECT,
    location=settings.VERTEX_LOCATION,
)

_SYSTEM_PROMPT = (
    "You are an automotive owner's manual assistant. "
    "Answer ONLY using the provided retrieved context. "
    "If the answer is not present in the context, say: "
    '"The answer is not available in the retrieved context." '
    "Do not use external knowledge. Be concise and factual."
)

_CRITICAL_SYSTEM_PROMPT = """
You are an automotive owner's manual assistant.
Your goal is to answer the user query based ONLY on the provided context, and format your output as a single, valid JSON object. 

### Output Format Schema
Your response must be a JSON object with the following structure:
{
  "answer": "A factual, concise natural language answer to the user question based on the retrieved context.",
  "card": {
    "type": "table" | "steps" | "alert" | null,
    "title": "A short, meaningful title for the card.",
    "brand": "The vehicle brand if specified in the context, else null",
    "model": "The vehicle model if specified in the context, else null",
    
    // Populate ONLY if type is "table"
    "table_data": {
      "headers": ["Column Header 1", "Column Header 2"],
      "rows": [
        ["Row 1 Col 1", "Row 1 Col 2"],
        ["Row 2 Col 1", "Row 2 Col 2"]
      ]
    },
    
    // Populate ONLY if type is "steps"
    "steps_data": {
      "title": "Optional Title",
      "steps": [
        { "step_number": 1, "action": "string", "caution": "string or null" }
      ]
    },
    
    // Populate ONLY if type is "alert"
    "alert_data": {
      "risk_level": "low" | "medium" | "high" | "critical",
      "warnings": ["Warning 1"],
      "prohibited_actions": ["Prohibited action 1"],
      "precautions": ["Precaution 1"]
    }
  }
}

### Critical Instructions:
1. Grounding: Answer ONLY using the provided retrieved context. Do not use external knowledge. 
2. Unavailable Information: If the answer is not present in the context, set "answer" to: "The answer is not available in the retrieved context." and set "card" to null.
3. Card Selection & Relevance Filtering:
   - YOU MUST generate a "card" whenever there is structured data, lists, or warnings.
   - DO NOT put markdown tables or markdown lists in the "answer" field. The "answer" MUST be pure conversational text. All structured data MUST go in the "card" object!
   - Choose "table" for ANY specifications, service intervals, maintenance schedules, or warranty lists. Ensure columns are dynamically generated to fit the nature of the data. (e.g. ["Item", "Interval", "Action"])
   - Choose "steps" for procedures or sequences (e.g., how to jumpstart).
   - Choose "alert" for safety warnings and malfunctions.
4. Output only valid JSON. No markdown wrappers.
"""

# ── Query router (lightweight Gemini call) ────────────────────────────────
_ROUTER_PROMPT = """
You are a highly precise intent classification router for an automotive RAG system.
Determine if the user's query asks for CRITICAL FACTUAL INFORMATION in one of these categories:
1. Warranty
2. Maintenance Schedules
3. Inspection Schedules
4. Emergency Services
5. Malfunction of Parts
6. Safety and Security

If yes, respond with is_critical=true and the category name.
If it is a general question, respond with is_critical=false and category=null.
Output valid JSON only.
"""


def classify_query(query: str) -> dict:
    """Lightweight Gemini intent classifier."""
    try:
        response = _gen_client.models.generate_content(
            model=settings.ROUTER_MODEL,
            contents=f"Query: {query}\n\nOutput JSON:",
            config={
                "system_instruction": _ROUTER_PROMPT,
                "temperature": 0.0,
                "response_mime_type": "application/json",
            },
        )
        result = json.loads(response.text)
        return {
            "is_critical": bool(result.get("is_critical", False)),
            "category": result.get("category"),
        }
    except Exception as e:
        logger.error(f"Query routing failed: {e}")
        return {"is_critical": False, "category": None}


def _generate_answer(query: str, chunks: list[RetrievalResult]) -> str:
    """Generate a grounded answer from retrieved chunks."""
    context_parts = [f"[Chunk {i}]\n{c.text}" for i, c in enumerate(chunks, 1)]
    context = "\n\n".join(context_parts)

    if not context.strip():
        return "No relevant context was retrieved to answer this question."

    prompt = f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"

    response = _gen_client.models.generate_content(
        model=settings.GENERATION_MODEL,
        contents=prompt,
        config={
            "system_instruction": _SYSTEM_PROMPT,
            "temperature": 0.0,
            "max_output_tokens": 512,
        },
    )
    return response.text


def _generate_critical_answer(query: str, chunks: list[RetrievalResult]) -> tuple[str, Optional[dict]]:
    """Generate a grounded answer and a UI card from retrieved chunks."""
    context_parts = [f"[Chunk {i}]\n{c.text}" for i, c in enumerate(chunks, 1)]
    context = "\n\n".join(context_parts)

    if not context.strip():
        return "No relevant context was retrieved to answer this question.", None

    prompt = f"Context:\n{context}\n\nQuestion: {query}\n\nIMPORTANT: You MUST generate a JSON 'card' object containing the structured data. Do NOT put markdown tables in the 'answer' string. Output JSON:"

    try:
        response = _gen_client.models.generate_content(
            model=settings.GENERATION_MODEL,
            contents=prompt,
            config={
                "system_instruction": _CRITICAL_SYSTEM_PROMPT,
                "temperature": 0.0,
                "max_output_tokens": 1024,
                "response_mime_type": "application/json",
            },
        )
        data = json.loads(response.text)
        return data.get("answer", ""), data.get("card", None)
    except Exception as e:
        logger.error(f"Critical generation failed: {e}")
        return "An error occurred during response generation.", None



# ── Public API ────────────────────────────────────────────────────────────
def handle_query(
    query: str,
    mode: RetrievalMode,
    k: int = 5,
    brand_filter: Optional[str] = None,
    model_filter: Optional[str] = None,
) -> tuple[str, list[RetrievalResult], str]:
    """
    Orchestrate retrieval + generation.
    Returns (answer, retrieved_chunks, mode_used).
    """
    retriever = _retrievers.get(mode)
    if retriever is None:
        raise ValueError(f"Unknown retrieval mode: {mode}")

    logger.info(f"Query: '{query}' | Mode: {mode.value}")
    chunks = retriever.retrieve(query, k=k, brand_filter=brand_filter, model_filter=model_filter)
    answer = _generate_answer(query, chunks)
    return answer, chunks, mode.value


def handle_critical_query(
    query: str,
    k: int = 5,
    brand_filter: Optional[str] = None,
    model_filter: Optional[str] = None,
) -> tuple[str, list[RetrievalResult], bool, Optional[str], Optional[dict]]:
    """
    Critical query flow: classify → feature-store-first retrieval → generate.
    Returns (answer, chunks, is_critical, category, ui_card).
    """
    intent = classify_query(query)
    is_critical = intent["is_critical"]
    category = intent["category"]

    logger.info(f"Critical query: '{query}' | is_critical={is_critical} | category={category}")

    if is_critical:
        chunks = _critical_retriever.retrieve(query, k=k, brand_filter=brand_filter, model_filter=model_filter, category=category)
        answer, ui_card = _generate_critical_answer(query, chunks)
    else:
        # Fall back to hybrid_rerank for non-critical queries
        chunks = _retrievers[RetrievalMode.hybrid_rerank].retrieve(
            query, k=k, brand_filter=brand_filter, model_filter=model_filter
        )
        answer = _generate_answer(query, chunks)
        ui_card = None

    return answer, chunks, is_critical, category, ui_card


def handle_debug_retrieve(
    query: str,
    mode: RetrievalMode,
    k: int = 5,
    brand_filter: Optional[str] = None,
    model_filter: Optional[str] = None,
) -> dict:
    """
    Debug retrieval: returns full introspection data for a query.
    """
    intent = classify_query(query)

    # Collect per-stage counts for debug
    semantic_retriever = _retrievers[RetrievalMode.semantic]
    bm25_retriever = _retrievers[RetrievalMode.bm25]

    dense_results = semantic_retriever.retrieve(query, k=settings.DENSE_K, brand_filter=brand_filter, model_filter=model_filter)
    bm25_results = bm25_retriever.retrieve(query, k=settings.BM25_K, brand_filter=brand_filter, model_filter=model_filter)

    # Feature-store results
    from app.retrieval.critical import feature_bm25_index
    from app.retrieval.bm25 import tokenize
    feature_count = 0
    if intent["is_critical"] and feature_bm25_index.is_ready:
        tokenized = tokenize(query)
        scores = feature_bm25_index.index.get_scores(tokenized)
        feature_count = sum(1 for s in scores if s >= settings.BM25_SCORE_THRESHOLD)

    # Full retrieval via selected mode
    retriever = _retrievers.get(mode)
    if mode == RetrievalMode.hybrid_rerank and intent["is_critical"]:
        final_results = _critical_retriever.retrieve(query, k=k, brand_filter=brand_filter, model_filter=model_filter)
    elif retriever:
        final_results = retriever.retrieve(query, k=k, brand_filter=brand_filter, model_filter=model_filter)
    else:
        final_results = []

    return {
        "query": query,
        "mode": mode.value,
        "is_critical": intent["is_critical"],
        "category": intent["category"],
        "dense_count": len(dense_results),
        "bm25_count": len(bm25_results),
        "feature_store_count": feature_count,
        "fused_count": len(final_results),
        "final_count": len(final_results),
        "chunks": final_results,
    }
