"""
Critical retriever: Dual-index retrieval over tables-data and feature-store
with optional vector augmentation.

Uses category-aware routing:
  - Maintenance/Inspection/Warranty → tables-data (OCR-extracted structured tables)
  - Safety/Malfunction/Emergency   → feature-store (Gemini-extracted narrative records)
"""
import logging
from typing import Optional

from rank_bm25 import BM25Okapi

from app.config.settings import settings
from app.db.mongodb import sync_db, feature_collection
from app.retrieval.base import BaseRetriever, RetrievalResult
from app.retrieval.bm25 import tokenize
from app.retrieval.semantic import SemanticRetriever
from app.retrieval.bm25 import BM25Retriever, bm25_index

logger = logging.getLogger("rag.retrieval.critical")

# Categories that should route to tables-data
TABLES_DATA_CATEGORIES = {"Maintenance Schedules", "Inspection Schedules", "Warranty"}
# Categories that should route to feature-store
FEATURE_STORE_CATEGORIES = {"Safety and Security", "Malfunction of Parts", "Emergency Services"}

tables_collection = sync_db[settings.TABLE_COLLECTION]


class TablesDataIndex:
    """In-memory BM25 index over the tables-data collection."""

    def __init__(self):
        self.docs: list[dict] = []
        self.index: Optional[BM25Okapi] = None
        self._built = False

    def _build_searchable_text(self, doc: dict) -> str:
        """Synthesize a searchable text from tables-data fields."""
        parts = []
        parts.append(doc.get("table_type", ""))
        parts.append(doc.get("brand", ""))
        parts.append(doc.get("car_model", ""))

        nd = doc.get("normalized_data", {})
        if nd:
            if nd.get("maintenance_item"):
                parts.append(nd["maintenance_item"])
            if nd.get("vehicle_variant"):
                parts.append(nd["vehicle_variant"])
            if nd.get("condition"):
                parts.append(nd["condition"])
            if nd.get("duration"):
                parts.append(nd["duration"])
            for sched in (nd.get("schedule") or []):
                if sched.get("action_display"):
                    parts.append(sched["action_display"])

        return " ".join(filter(None, parts))

    def build(self):
        logger.info("Building BM25 tables-data index from MongoDB...")
        self.docs = list(tables_collection.find({}))

        corpus = [tokenize(self._build_searchable_text(doc)) for doc in self.docs]
        if corpus:
            self.index = BM25Okapi(corpus, k1=1.5, b=0.75)
        self._built = True
        logger.info(f"Tables-data BM25 index ready — {len(self.docs)} records.")

    @property
    def is_ready(self) -> bool:
        return self._built and self.index is not None


class FeatureStoreIndex:
    """In-memory BM25 index over the feature-store collection."""

    def __init__(self):
        self.docs: list[dict] = []
        self.index: Optional[BM25Okapi] = None
        self._built = False

    def build(self):
        logger.info("Building BM25 feature-store index from MongoDB...")
        self.docs = list(feature_collection.find({}))

        corpus = [tokenize(doc.get("semantic_text", "")) for doc in self.docs]
        if corpus:
            self.index = BM25Okapi(corpus, k1=1.5, b=0.75)
        self._built = True
        logger.info(f"Feature-store BM25 index ready — {len(self.docs)} records.")

    @property
    def is_ready(self) -> bool:
        return self._built and self.index is not None


# Module-level singletons
tables_bm25_index = TablesDataIndex()
feature_bm25_index = FeatureStoreIndex()


def _search_index(
    index_obj,
    query: str,
    k: int,
    brand_filter: Optional[str],
    model_filter: Optional[str],
    category_filter: Optional[set[str]] = None,
    source_label: str = "feature_store",
) -> list[RetrievalResult]:
    """Generic BM25 search over an index object."""
    if not index_obj.is_ready:
        return []

    tokenized_query = tokenize(query)
    scores = index_obj.index.get_scores(tokenized_query)
    candidates = []

    for idx, doc in enumerate(index_obj.docs):
        # Brand/model filtering
        if brand_filter and str(doc.get("brand", "")).lower() != brand_filter.lower():
            continue
        if model_filter and str(doc.get("car_model", "")).lower() != model_filter.lower():
            continue
        # Category filtering (for feature-store)
        if category_filter:
            doc_cat = doc.get("category", "")
            if not isinstance(doc_cat, str) or doc_cat not in category_filter:
                continue

        score = scores[idx]
        if score >= settings.BM25_SCORE_THRESHOLD:
            candidates.append((doc, score))

    candidates.sort(key=lambda x: x[1], reverse=True)

    results = []
    for doc, score in candidates[:k]:
        # Build searchable text for the result
        if "semantic_text" in doc:
            text = doc["semantic_text"]
        else:
            # tables-data: build a readable summary
            nd = doc.get("normalized_data", {})
            parts = [doc.get("table_type", ""), nd.get("maintenance_item", "")]
            for s in (nd.get("schedule") or []):
                parts.append(f"{s.get('action_display', '')} every {s.get('interval_km', '?')} km / {s.get('interval_months', '?')} months")
            text = " | ".join(filter(None, parts))

        # Build structured_data — pass the whole doc (minus _id and raw_ocr for size)
        structured = {k: v for k, v in doc.items() if k not in ("_id", "raw_ocr")}

        results.append(RetrievalResult(
            text=text,
            metadata={
                "doc_uri": doc.get("source_file", ""),
                "brand": doc.get("brand"),
                "model": doc.get("car_model"),
                "section": doc.get("section_heading"),
                "subsection": doc.get("subsection_heading"),
                "page": doc.get("page_number"),
                "chunk_id": doc.get("chunk_id"),
                "structured_data": structured,
            },
            score=score,
            source=source_label,
            is_feature_record=True,
        ))

    return results


class CriticalRetriever(BaseRetriever):
    """
    Dual-index retrieval: tables-data + feature-store + standard dense/BM25
    + RRF with FEATURE_STORE_WEIGHT boosting.
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
        category: Optional[str] = None,
    ) -> list[RetrievalResult]:

        # 1. Dense retrieval
        dense = self._semantic.retrieve(query, k=settings.DENSE_K, brand_filter=brand_filter, model_filter=model_filter)

        # 2. BM25 retrieval
        sparse = self._bm25.retrieve(query, k=settings.BM25_K, brand_filter=brand_filter, model_filter=model_filter)

        # 3. Category-aware feature retrieval
        feature_results: list[RetrievalResult] = []

        if category and category in TABLES_DATA_CATEGORIES:
            # Route to tables-data
            feature_results = _search_index(
                tables_bm25_index, query, settings.FEATURE_K,
                brand_filter, model_filter,
                source_label="tables_data",
            )
            logger.info(f"Tables-data retrieval for category '{category}': {len(feature_results)} results")
        elif category and category in FEATURE_STORE_CATEGORIES:
            # Route to feature-store, filtered by category
            feature_results = _search_index(
                feature_bm25_index, query, settings.FEATURE_K,
                brand_filter, model_filter,
                category_filter={category},
                source_label="feature_store",
            )
            logger.info(f"Feature-store retrieval for category '{category}': {len(feature_results)} results")
        else:
            # Unknown category or None — search both
            table_results = _search_index(
                tables_bm25_index, query, settings.FEATURE_K,
                brand_filter, model_filter,
                source_label="tables_data",
            )
            fs_results = _search_index(
                feature_bm25_index, query, settings.FEATURE_K,
                brand_filter, model_filter,
                source_label="feature_store",
            )
            feature_results = table_results + fs_results
            logger.info(f"Dual-index retrieval (no category): tables={len(table_results)}, feature-store={len(fs_results)}")

        logger.info(f"Critical retrieval — Dense={len(dense)}, BM25={len(sparse)}, Feature={len(feature_results)}")

        # 4. RRF Fusion with boosted feature weight
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
            # Strongly boost feature/tables-data records so they always appear at the top
            boosted_weight = settings.FEATURE_STORE_WEIGHT * 10.0
            rrf_scores[did] = rrf_scores.get(did, 0.0) + boosted_weight * (1.0 / (settings.RRF_K + rank))

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
            r.is_feature_record = getattr(r, "is_feature_record", False)
            r.source = "fused" if not r.is_feature_record else r.source
            fusion_candidates.append(r)
            if len(fusion_candidates) >= settings.FUSION_K:
                break

        return fusion_candidates[:k]
