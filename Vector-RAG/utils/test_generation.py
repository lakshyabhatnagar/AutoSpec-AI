"""
Generation utility — re-exports from the FastAPI app's query service.

This file exists for backward compatibility with any scripts
that import generate_final_response from utils.test_generation.

Note: The FastAPI app uses its own internal generation function.
This wrapper adapts it to accept mlflow.entities.Document objects
for backward compatibility with legacy callers.
"""
from app.services.query_service import _generate_answer
from app.retrieval.base import RetrievalResult


def generate_final_response(query, retrieved_docs):
    """
    Backward-compatible wrapper that accepts mlflow.entities.Document objects
    and delegates to the centralized generation function.
    """
    # Convert Document objects → RetrievalResult objects
    chunks = [
        RetrievalResult(text=doc.page_content, metadata=doc.metadata or {})
        for doc in retrieved_docs
    ]
    return _generate_answer(query, chunks)


__all__ = ["generate_final_response"]