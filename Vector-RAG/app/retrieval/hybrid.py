"""Hybrid retriever: Dense + BM25 merged via Reciprocal Rank Fusion."""
import logging
from typing import Optional

from app.config.settings import settings
from app.retrieval.base import BaseRetriever, RetrievalResult
from app.retrieval.semantic import SemanticRetriever
from app.retrieval.bm25 import BM25Retriever

logger = logging.getLogger("rag.retrieval.hybrid")


def _get_doc_id(r: RetrievalResult) -> str:
    m = r.metadata
    return f"{m.get('doc_uri')}_{m.get('chunk_id')}_{m.get('page')}"


def _rrf_fuse(
    dense: list[RetrievalResult],
    sparse: list[RetrievalResult],
    dense_weight: float,
    bm25_weight: float,
    rrf_k: int,
    fusion_k: int,
) -> list[RetrievalResult]:
    """Reciprocal Rank Fusion over dense and sparse result lists."""
    rrf_scores: dict[str, float] = {}
    doc_map: dict[str, RetrievalResult] = {}

    for rank, r in enumerate(dense, 1):
        doc_id = _get_doc_id(r)
        doc_map[doc_id] = r
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + dense_weight * (1.0 / (rrf_k + rank))

    for rank, r in enumerate(sparse, 1):
        doc_id = _get_doc_id(r)
        doc_map[doc_id] = r
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + bm25_weight * (1.0 / (rrf_k + rank))

    # Sort descending by fused score
    fused = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

    # Lightweight deduplication (max 2 per section tuple)
    results: list[RetrievalResult] = []
    seen_sections: dict[tuple, int] = {}
    for doc_id, score in fused:
        r = doc_map[doc_id]
        section_key = (
            r.metadata.get("doc_uri", ""),
            r.metadata.get("section", ""),
            r.metadata.get("subsection", ""),
        )
        if seen_sections.get(section_key, 0) >= 2:
            continue
        seen_sections[section_key] = seen_sections.get(section_key, 0) + 1

        r.rrf_score = score
        r.source = "fused"
        results.append(r)
        if len(results) >= fusion_k:
            break

    return results


class HybridRetriever(BaseRetriever):
    """Dense + BM25 with Reciprocal Rank Fusion (no reranking)."""

    def __init__(self):
        self._semantic = SemanticRetriever()
        self._bm25 = BM25Retriever()

    @property
    def mode_name(self) -> str:
        return "hybrid"

    def retrieve(
        self,
        query: str,
        k: int = 5,
        brand_filter: Optional[str] = None,
        model_filter: Optional[str] = None,
    ) -> list[RetrievalResult]:
        dense = self._semantic.retrieve(query, k=settings.DENSE_K, brand_filter=brand_filter, model_filter=model_filter)
        sparse = self._bm25.retrieve(query, k=settings.BM25_K, brand_filter=brand_filter, model_filter=model_filter)

        logger.info(f"Dense={len(dense)}, BM25={len(sparse)}")

        fused = _rrf_fuse(
            dense, sparse,
            dense_weight=settings.DENSE_WEIGHT,
            bm25_weight=settings.BM25_WEIGHT,
            rrf_k=settings.RRF_K,
            fusion_k=settings.FUSION_K,
        )
        return fused[:k]
