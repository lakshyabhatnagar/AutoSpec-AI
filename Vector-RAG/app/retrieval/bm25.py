"""BM25 sparse retriever."""
import logging
import re
from typing import Optional

from rank_bm25 import BM25Okapi

from app.config.settings import settings
from app.db.mongodb import chunk_collection
from app.retrieval.base import BaseRetriever, RetrievalResult

logger = logging.getLogger("rag.retrieval.bm25")


def tokenize(text: str) -> list[str]:
    return re.findall(r'\b\w+\b', text.lower())


class BM25Index:
    """Holds in-memory BM25 index and the source documents."""

    def __init__(self):
        self.docs: list[dict] = []
        self.index: Optional[BM25Okapi] = None
        self._built = False

    def build(self):
        """Load all chunks from MongoDB and build the BM25 index."""
        logger.info("Building BM25 main index from MongoDB...")
        self.docs = list(chunk_collection.find({}, {
            "text": 1, "source_file": 1, "chunk_id": 1, "brand": 1,
            "car_model": 1, "car_year_start": 1, "car_year_end": 1,
            "supported_years": 1, "section_heading": 1,
            "subsection_heading": 1, "page_number": 1,
        }))

        corpus = []
        for doc in self.docs:
            section = doc.get("section_heading", "")
            subsection = doc.get("subsection_heading", "")
            content = doc.get("text", "")
            full_text = f"Section: {section}\nSubsection: {subsection}\nContent: {content}"
            corpus.append(tokenize(full_text))

        self.index = BM25Okapi(corpus, k1=1.5, b=0.75)
        self._built = True
        logger.info(f"BM25 main index ready — {len(self.docs)} chunks.")

    @property
    def is_ready(self) -> bool:
        return self._built and self.index is not None


# Module-level singleton — built once at startup via lifespan
bm25_index = BM25Index()


class BM25Retriever(BaseRetriever):
    """Sparse keyword retriever backed by BM25Okapi."""

    @property
    def mode_name(self) -> str:
        return "bm25"

    def retrieve(
        self,
        query: str,
        k: int = 5,
        brand_filter: Optional[str] = None,
        model_filter: Optional[str] = None,
    ) -> list[RetrievalResult]:
        if not bm25_index.is_ready:
            logger.warning("BM25 index not initialized.")
            return []

        tokenized_query = tokenize(query)
        scores = bm25_index.index.get_scores(tokenized_query)

        candidates: list[tuple[dict, float]] = []
        for idx, doc in enumerate(bm25_index.docs):
            if brand_filter and str(doc.get("brand", "")).lower() != brand_filter.lower():
                continue
            if model_filter and str(doc.get("car_model", "")).lower() != model_filter.lower():
                continue
            score = scores[idx]
            if score >= settings.BM25_SCORE_THRESHOLD:
                candidates.append((doc, score))

        candidates.sort(key=lambda x: x[1], reverse=True)

        return [
            RetrievalResult(
                text=doc.get("text", ""),
                metadata={
                    "doc_uri": doc.get("source_file", ""),
                    "brand": doc.get("brand"),
                    "model": doc.get("car_model"),
                    "years": f"{doc.get('car_year_start')}-{doc.get('car_year_end')}",
                    "section": doc.get("section_heading"),
                    "subsection": doc.get("subsection_heading"),
                    "page": doc.get("page_number"),
                    "chunk_id": doc.get("chunk_id"),
                },
                score=bm25_score,
                source="bm25",
            )
            for doc, bm25_score in candidates[:k]
        ]
