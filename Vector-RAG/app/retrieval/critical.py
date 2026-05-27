"""
Critical retriever: Feature-store prioritized retrieval with optional vector augmentation.
Mirrors the logic in test_rag_pipeline.py (steps 1-6) with feature-store boosting.
"""
import logging
from typing import Optional

import voyageai
from rank_bm25 import BM25Okapi

from app.config.settings import settings
from app.db.mongodb import feature_collection
from app.retrieval.base import BaseRetriever, RetrievalResult
from app.retrieval.bm25 import tokenize
from app.retrieval.semantic import SemanticRetriever
from app.retrieval.bm25 import BM25Retriever, bm25_index

logger = logging.getLogger("rag.retrieval.critical")

_vo_client = voyageai.Client(api_key=settings.VOYAGE_API_KEY) if settings.VOYAGE_API_KEY else None


class FeatureStoreIndex:
    """In-memory BM25 index over the feature-store collection."""

    def __init__(self):
        self.docs: list[dict] = []
        self.index: Optional[BM25Okapi] = None
        self._built = False

    def build(self):
        logger.info("Building BM25 feature-store index from MongoDB...")
        self.docs = list(feature_collection.find({}, {
            "semantic_text": 1, "source_file": 1, "chunk_id": 1, "brand": 1,
            "car_model": 1, "section_heading": 1, "subsection_heading": 1, "page_number": 1,
        }))

        corpus = [tokenize(doc.get("semantic_text", "")) for doc in self.docs]
        if corpus:
            self.index = BM25Okapi(corpus, k1=1.5, b=0.75)
        self._built = True
        logger.info(f"Feature-store BM25 index ready — {len(self.docs)} records.")

    @property
    def is_ready(self) -> bool:
        return self._built and self.index is not None


# Module-level singleton
feature_bm25_index = FeatureStoreIndex()


class CriticalRetriever(BaseRetriever):
    """
    Feature-store retrieval + standard dense/BM25 + RRF with FEATURE_STORE_WEIGHT
    boosting + Voyage AI reranking with feature-store score multiplier.
    """

    def __init__(self):
        self._semantic = SemanticRetriever()
        self._bm25 = BM25Retriever()

    @property
    def mode_name(self) -> str:
        return "critical"

    def retrieve(
        self,
        query: str,
        k: int = 5,
        brand_filter: Optional[str] = None,
        model_filter: Optional[str] = None,
    ) -> list[RetrievalResult]:

        # 1. Dense retrieval
        dense = self._semantic.retrieve(query, k=settings.DENSE_K, brand_filter=brand_filter, model_filter=model_filter)

        # 2. BM25 retrieval
        sparse = self._bm25.retrieve(query, k=settings.BM25_K, brand_filter=brand_filter, model_filter=model_filter)

        # 3. Feature-store BM25 retrieval
        feature_results: list[RetrievalResult] = []
        if feature_bm25_index.is_ready:
            tokenized_query = tokenize(query)
            feature_scores = feature_bm25_index.index.get_scores(tokenized_query)
            candidates = []
            for idx, doc in enumerate(feature_bm25_index.docs):
                if brand_filter and str(doc.get("brand", "")).lower() != brand_filter.lower():
                    continue
                if model_filter and str(doc.get("car_model", "")).lower() != model_filter.lower():
                    continue
                score = feature_scores[idx]
                if score >= settings.BM25_SCORE_THRESHOLD:
                    candidates.append((doc, score))

            candidates.sort(key=lambda x: x[1], reverse=True)
            for doc, score in candidates[:settings.FEATURE_K]:
                feature_results.append(RetrievalResult(
                    text=doc.get("semantic_text", ""),
                    metadata={
                        "doc_uri": doc.get("source_file", ""),
                        "brand": doc.get("brand"),
                        "model": doc.get("car_model"),
                        "section": doc.get("section_heading"),
                        "subsection": doc.get("subsection_heading"),
                        "page": doc.get("page_number"),
                        "chunk_id": doc.get("chunk_id"),
                    },
                    score=score,
                    source="feature_store",
                    is_feature_record=True,
                ))

        logger.info(f"Critical retrieval — Dense={len(dense)}, BM25={len(sparse)}, FeatureStore={len(feature_results)}")

        # 4. RRF Fusion with boosted feature-store weight
        rrf_scores: dict[str, float] = {}
        doc_map: dict[str, RetrievalResult] = {}

        def _id(r: RetrievalResult, suffix: str = "") -> str:
            m = r.metadata
            return f"{m.get('doc_uri')}_{m.get('chunk_id')}_{m.get('page')}{suffix}"

        for rank, r in enumerate(dense, 1):
            did = _id(r)
            doc_map[did] = r
            rrf_scores[did] = rrf_scores.get(did, 0.0) + settings.DENSE_WEIGHT * (1.0 / (settings.RRF_K + rank))

        for rank, r in enumerate(sparse, 1):
            did = _id(r)
            doc_map[did] = r
            rrf_scores[did] = rrf_scores.get(did, 0.0) + settings.BM25_WEIGHT * (1.0 / (settings.RRF_K + rank))

        for rank, r in enumerate(feature_results, 1):
            did = _id(r, "_feature")
            doc_map[did] = r
            rrf_scores[did] = rrf_scores.get(did, 0.0) + settings.FEATURE_STORE_WEIGHT * (1.0 / (settings.RRF_K + rank))

        fused = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

        # Dedup
        fusion_candidates: list[RetrievalResult] = []
        seen: dict[tuple, int] = {}
        for did, score in fused:
            r = doc_map[did]
            sk = (r.metadata.get("doc_uri", ""), r.metadata.get("section", ""), r.metadata.get("subsection", ""))
            if seen.get(sk, 0) >= 2:
                continue
            seen[sk] = seen.get(sk, 0) + 1
            r.rrf_score = score
            r.source = "fused" if not r.is_feature_record else "feature_store"
            fusion_candidates.append(r)
            if len(fusion_candidates) >= settings.FUSION_K:
                break

        # 5. Voyage AI reranking with feature-store score multiplier
        if fusion_candidates and _vo_client:
            try:
                texts = [r.text for r in fusion_candidates]
                rerank_response = _vo_client.rerank(
                    query=query, documents=texts, model=settings.VOYAGE_RERANK_MODEL,
                )
                reranked = []
                for result in rerank_response.results:
                    r = fusion_candidates[result.index]
                    score = result.relevance_score
                    if r.is_feature_record:
                        score *= settings.FEATURE_STORE_WEIGHT
                    r.reranker_score = result.relevance_score
                    r.score = score
                    reranked.append(r)

                reranked.sort(key=lambda x: x.score, reverse=True)
                return reranked[:k]
            except Exception as e:
                logger.error(f"Voyage AI reranking failed in critical retriever: {e}. Falling back to RRF.")

        return fusion_candidates[:k]
