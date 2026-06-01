"""Semantic (dense vector) retriever using MongoDB Atlas Vector Search."""
import logging
from typing import Optional

from google import genai

from app.config.settings import settings
from app.db.mongodb import chunk_collection
from app.retrieval.base import BaseRetriever, RetrievalResult

logger = logging.getLogger("rag.retrieval.semantic")

# Vertex AI embedding client (module-level singleton)
_embed_client = genai.Client(
    vertexai=True,
    project=settings.VERTEX_PROJECT,
    location=settings.VERTEX_LOCATION,
)


def _generate_embedding(text: str) -> list[float]:
    result = _embed_client.models.embed_content(
        model=settings.EMBEDDING_MODEL,
        contents=text,
        config={"output_dimensionality": 768},
    )
    return result.embeddings[0].values


class SemanticRetriever(BaseRetriever):
    """Dense retrieval via MongoDB Atlas $vectorSearch."""

    @property
    def mode_name(self) -> str:
        return "semantic"

    def retrieve(
        self,
        query: str,
        k: int = 5,
        brand_filter: Optional[str] = None,
        model_filter: Optional[str] = None,
    ) -> list[RetrievalResult]:
        query_embedding = _generate_embedding(query)

        vector_search: dict = {
            "index": "vector_index",
            "path": "embedding",
            "queryVector": query_embedding,
            "numCandidates": settings.NUM_CANDIDATES,
            "limit": k,
        }
        if brand_filter or model_filter:
            vector_search["filter"] = {}
            if brand_filter:
                vector_search["filter"]["brand"] = brand_filter
            if model_filter:
                vector_search["filter"]["car_model"] = model_filter

        pipeline = [
            {"$vectorSearch": vector_search},
            {
                "$project": {
                    "text": 1, "source_file": 1, "chunk_id": 1, "brand": 1,
                    "car_model": 1, "car_year_start": 1, "car_year_end": 1,
                    "supported_years": 1, "section_heading": 1,
                    "subsection_heading": 1, "page_number": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            },
        ]

        try:
            results = list(chunk_collection.aggregate(pipeline))
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            results = []

        return [
            RetrievalResult(
                text=r.get("text", ""),
                metadata={
                    "doc_uri": r.get("source_file", ""),
                    "brand": r.get("brand"),
                    "model": r.get("car_model"),
                    "years": f"{r.get('car_year_start')}-{r.get('car_year_end')}",
                    "section": r.get("section_heading"),
                    "subsection": r.get("subsection_heading"),
                    "page": r.get("page_number"),
                    "chunk_id": r.get("chunk_id"),
                },
                score=r.get("score", 1.0 / (idx + 1)),  # fallback to rank if missing
                source="dense",
            )
            for idx, r in enumerate(results)
        ]
