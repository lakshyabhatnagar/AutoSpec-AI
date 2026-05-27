"""Pydantic request/response schemas for all API endpoints."""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────
class RetrievalMode(str, Enum):
    semantic = "semantic"
    bm25 = "bm25"
    hybrid = "hybrid"
    hybrid_rerank = "hybrid_rerank"


# ── Request Schemas ───────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User question")
    mode: RetrievalMode = Field(RetrievalMode.hybrid_rerank, description="Retrieval mode")
    brand_filter: Optional[str] = Field(None, description="Filter by vehicle brand")
    model_filter: Optional[str] = Field(None, description="Filter by vehicle model")
    k: int = Field(5, ge=1, le=20, description="Number of final results")


class CriticalQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    brand_filter: Optional[str] = None
    model_filter: Optional[str] = None
    k: int = Field(5, ge=1, le=20)


class DebugRetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1)
    mode: RetrievalMode = Field(RetrievalMode.hybrid_rerank)
    brand_filter: Optional[str] = None
    model_filter: Optional[str] = None
    k: int = Field(5, ge=1, le=20)


class EvaluateRequest(BaseModel):
    dataset: str = Field("eval_dataset.json", description="Evaluation dataset filename")
    mode: RetrievalMode = Field(RetrievalMode.hybrid_rerank)
    run_name: Optional[str] = Field(None, description="MLflow run name override")


class FeatureExtractRequest(BaseModel):
    start_index: int = Field(0, ge=0, description="Chunk index to start from")


# ── Response Schemas ──────────────────────────────────────────────────────
class ChunkMetadata(BaseModel):
    doc_uri: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    years: Optional[str] = None
    section: Optional[str] = None
    subsection: Optional[str] = None
    page: Optional[Any] = None
    score: Optional[float] = None
    chunk_id: Optional[Any] = None
    is_feature_record: bool = False


class RetrievedChunk(BaseModel):
    page_content: str
    metadata: ChunkMetadata


class QueryResponse(BaseModel):
    answer: str
    mode: str
    retrieved_chunks: list[RetrievedChunk]
    chunk_count: int


class CriticalQueryResponse(BaseModel):
    answer: str
    is_critical: bool
    category: Optional[str]
    retrieved_chunks: list[RetrievedChunk]
    chunk_count: int


class DebugChunk(BaseModel):
    page_content: str
    metadata: ChunkMetadata
    retrieval_source: str = Field(description="dense | bm25 | feature_store | fused")
    rrf_score: Optional[float] = None
    reranker_score: Optional[float] = None


class DebugRetrieveResponse(BaseModel):
    query: str
    mode: str
    is_critical: bool
    category: Optional[str]
    dense_count: int
    bm25_count: int
    feature_store_count: int
    fused_count: int
    final_count: int
    chunks: list[DebugChunk]


class HealthResponse(BaseModel):
    mongodb: str
    vertex_ai: str
    mlflow: str


class EvaluateResponse(BaseModel):
    status: str
    run_name: str
    run_id: Optional[str] = None
    metrics: Optional[dict[str, Any]] = None
    error: Optional[str] = None


class FeatureExtractResponse(BaseModel):
    status: str
    message: str


class IngestResponse(BaseModel):
    status: str
    message: str
