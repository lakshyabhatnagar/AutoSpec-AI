"""
Query service — orchestration layer between routes and retrievers.
Handles retrieval mode dispatch, query routing, and generation.
"""
import json
import logging
from typing import Any, Optional

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

_CRITICAL_CATEGORIES = {
    "Warranty",
    "Maintenance Schedules",
    "Inspection Schedules",
    "Emergency Services",
    "Malfunction of Parts",
    "Safety and Security",
}
_CARD_TYPES = {"table", "steps", "alert"}
_RISK_LEVELS = {"low", "medium", "high", "critical"}
_MAX_TEXT_LEN = 2000
_MAX_TABLE_COLUMNS = 12
_MAX_TABLE_ROWS = 100
_MAX_STEPS = 50
_MAX_LIST_ITEMS = 50


def _coerce_positive_int(value: Any, fallback: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback
    return parsed if parsed > 0 else fallback


def _coerce_text(value: Any, max_len: int = _MAX_TEXT_LEN) -> str:
    """Convert model-generated UI values into bounded plain strings."""
    if value is None:
        return ""
    text = str(value).strip()
    return text[:max_len]


def _coerce_optional_text(value: Any, max_len: int = _MAX_TEXT_LEN) -> Optional[str]:
    text = _coerce_text(value, max_len=max_len)
    return text or None


def _coerce_text_list(value: Any, max_items: int = _MAX_LIST_ITEMS) -> list[str]:
    if not isinstance(value, list):
        return []
    items = [_coerce_text(item, max_len=500) for item in value[:max_items]]
    return [item for item in items if item]


def _parse_json_object(text: Optional[str]) -> Optional[dict[str, Any]]:
    """Parse an LLM JSON response, tolerating accidental markdown fences."""
    if not text:
        return None
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate.strip("`")
        if candidate.lower().startswith("json"):
            candidate = candidate[4:].strip()
    try:
        data = json.loads(candidate)
    except json.JSONDecodeError:
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            data = json.loads(candidate[start:end + 1])
        except json.JSONDecodeError:
            return None
    return data if isinstance(data, dict) else None


def _normalize_category(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    for category in _CRITICAL_CATEGORIES:
        if normalized == category.lower():
            return category
    return None


def _sanitize_ui_card(card: Any) -> Optional[dict[str, Any]]:
    """Validate generated UI cards before returning them to the frontend."""
    if not isinstance(card, dict):
        return None

    card_type = card.get("type")
    if card_type is None:
        return None
    card_type = str(card_type).strip().lower()
    if card_type not in _CARD_TYPES:
        logger.warning("Dropped unsupported generated UI card type: %s", card_type)
        return None

    sanitized: dict[str, Any] = {
        "type": card_type,
        "title": _coerce_text(card.get("title"), max_len=200),
        "brand": _coerce_optional_text(card.get("brand"), max_len=100),
        "model": _coerce_optional_text(card.get("model"), max_len=100),
    }

    if card_type == "table":
        table = card.get("table_data")
        if not isinstance(table, dict):
            return None
        headers = _coerce_text_list(table.get("headers"), max_items=_MAX_TABLE_COLUMNS)
        rows = table.get("rows") if isinstance(table.get("rows"), list) else []
        sanitized_rows: list[list[str]] = []
        for row in rows[:_MAX_TABLE_ROWS]:
            if not isinstance(row, list):
                continue
            sanitized_row = [_coerce_text(cell, max_len=500) for cell in row[:_MAX_TABLE_COLUMNS]]
            if any(sanitized_row):
                sanitized_rows.append(sanitized_row)
        if not headers or not sanitized_rows:
            return None
        sanitized["table_data"] = {"headers": headers, "rows": sanitized_rows}
        return sanitized

    if card_type == "steps":
        steps_data = card.get("steps_data")
        if not isinstance(steps_data, dict):
            return None
        steps = steps_data.get("steps") if isinstance(steps_data.get("steps"), list) else []
        sanitized_steps = []
        for idx, step in enumerate(steps[:_MAX_STEPS], 1):
            if not isinstance(step, dict):
                continue
            action = _coerce_text(step.get("action"), max_len=1000)
            if not action:
                continue
            sanitized_steps.append({
                "step_number": _coerce_positive_int(step.get("step_number"), idx),
                "action": action,
                "caution": _coerce_optional_text(step.get("caution"), max_len=1000),
            })
        if not sanitized_steps:
            return None
        sanitized["steps_data"] = {
            "title": _coerce_optional_text(steps_data.get("title"), max_len=200),
            "steps": sanitized_steps,
        }
        return sanitized

    alert = card.get("alert_data")
    if not isinstance(alert, dict):
        return None
    risk_level = _coerce_text(alert.get("risk_level"), max_len=20).lower()
    if risk_level not in _RISK_LEVELS:
        risk_level = "medium"
    warnings = _coerce_text_list(alert.get("warnings"))
    prohibited_actions = _coerce_text_list(alert.get("prohibited_actions"))
    precautions = _coerce_text_list(alert.get("precautions"))
    if not warnings and not prohibited_actions and not precautions:
        return None
    sanitized["alert_data"] = {
        "risk_level": risk_level,
        "warnings": warnings,
        "prohibited_actions": prohibited_actions,
        "precautions": precautions,
    }
    return sanitized


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
        result = _parse_json_object(response.text) or {}
        return {
            "is_critical": bool(result.get("is_critical", False)),
            "category": _normalize_category(result.get("category")),
        }
    except Exception as e:
        logger.warning("Query routing failed; using non-critical fallback.", exc_info=True)
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
        data = _parse_json_object(response.text)
        if data is None:
            logger.warning("Critical generation returned invalid JSON.")
            return "An error occurred during response generation.", None
        return _coerce_text(data.get("answer")), _sanitize_ui_card(data.get("card"))
    except Exception as e:
        logger.exception("Critical generation failed.")
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

    logger.info("Query received | mode=%s | query_chars=%s", mode.value, len(query))
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

    logger.info(
        "Critical query received | query_chars=%s | is_critical=%s | category=%s",
        len(query),
        is_critical,
        category,
    )

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
