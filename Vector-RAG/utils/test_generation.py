import os
import mlflow
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Resolve credentials for Vertex AI authentication
_creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
if _creds_path and not os.path.isabs(_creds_path):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(_creds_path)

# Use the same Vertex AI Gemini setup as embeddings.py
_client = genai.Client(
    vertexai=True,
    project="ppp-v4",
    location="us-central1"
)

GENERATION_MODEL = os.getenv("GENERATION_MODEL", "gemini-2.5-flash-lite")

SYSTEM_PROMPT = (
    "You are an automotive owner's manual assistant. "
    "Answer ONLY using the provided retrieved context. "
    "If the answer is not present in the context, say: "
    '"The answer is not available in the retrieved context." '
    "Do not use external knowledge. Be concise and factual."
)


@mlflow.trace(span_type="LLM")
def generate_final_response(query, retrieved_docs):
    """
    Generate a grounded answer using Vertex AI Gemini.

    Args:
        query: The user's question.
        retrieved_docs: List of mlflow.entities.Document objects from the retriever.

    Returns:
        The generated answer string, grounded in the retrieved context.
    """
    # Build context from Document objects
    context_parts = []
    for i, doc in enumerate(retrieved_docs, 1):
        context_parts.append(f"[Chunk {i}]\n{doc.page_content}")
    context = "\n\n".join(context_parts)

    if not context.strip():
        return "No relevant context was retrieved to answer this question."

    prompt = (
        f"Context:\n{context}\n\n"
        f"Question: {query}\n\n"
        f"Answer:"
    )

    response = _client.models.generate_content(
        model=GENERATION_MODEL,
        contents=prompt,
        config={
            "system_instruction": SYSTEM_PROMPT,
            "temperature": 0.0,
            "max_output_tokens": 512,
        }
    )

    return response.text