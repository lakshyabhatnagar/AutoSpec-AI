"""
Abstract base retriever interface.
All retrieval strategies implement this contract.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class RetrievalResult:
    """Standardized result from any retriever."""
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)
    score: float = 0.0
    source: str = "unknown"          # dense | bm25 | feature_store | fused
    rrf_score: Optional[float] = None
    reranker_score: Optional[float] = None
    is_feature_record: bool = False


class BaseRetriever(ABC):
    """Abstract interface that all retrieval strategies must implement."""

    @abstractmethod
    def retrieve(
        self,
        query: str,
        k: int = 5,
        brand_filter: Optional[str] = None,
        model_filter: Optional[str] = None,
    ) -> list[RetrievalResult]:
        """Return ranked retrieval results for the given query."""
        ...

    @property
    @abstractmethod
    def mode_name(self) -> str:
        """Human-readable name of this retrieval strategy."""
        ...
