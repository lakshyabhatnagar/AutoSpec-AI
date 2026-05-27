"""Hybrid retriever with Voyage AI API reranking."""
import logging
from typing import Optional

import voyageai

from app.config.settings import settings
from app.retrieval.base import BaseRetriever, RetrievalResult
from app.retrieval.hybrid import HybridRetriever

logger = logging.getLogger("rag.retrieval.hybrid_rerank")

# Voyage AI client singleton
_vo_client = voyageai.Client(api_key=settings.VOYAGE_API_KEY) if settings.VOYAGE_API_KEY else None


class HybridRerankRetriever(BaseRetriever):
    """Dense + BM25 + RRF + Voyage AI reranking."""

    def __init__(self):
        self._hybrid = HybridRetriever()

    @property
    def mode_name(self) -> str:
        return "hybrid_rerank"

    def retrieve(
        self,
        query: str,
        k: int = 5,
        brand_filter: Optional[str] = None,
        model_filter: Optional[str] = None,
    ) -> list[RetrievalResult]:
        # Get fused candidates (more than k so reranker has room)
        fused = self._hybrid.retrieve(
            query, k=settings.FUSION_K, brand_filter=brand_filter, model_filter=model_filter
        )

        if not fused:
            return []

        if _vo_client is None:
            logger.warning("Voyage AI client not configured. Returning RRF results.")
            return fused[:k]

        try:
            texts = [r.text for r in fused]
            rerank_response = _vo_client.rerank(
                query=query,
                documents=texts,
                model=settings.VOYAGE_RERANK_MODEL,
            )

            reranked: list[RetrievalResult] = []
            for result in rerank_response.results:
                r = fused[result.index]
                r.reranker_score = result.relevance_score
                r.score = result.relevance_score
                reranked.append(r)

            reranked.sort(key=lambda x: x.score, reverse=True)
            return reranked[:k]

        except Exception as e:
            logger.error(f"Voyage AI reranking failed: {e}. Falling back to RRF.")
            return fused[:k]
