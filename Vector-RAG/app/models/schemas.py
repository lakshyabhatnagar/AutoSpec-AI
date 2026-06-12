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


class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class MaintenanceActionCode(str, Enum):
    R = "R"  # Replace
    I = "I"  # Inspect
    C = "C"  # Clean
    L = "L"  # Lubricate
    T = "T"  # Tighten
    CHECK = "CHECK" # generic check


# ── Request Schemas ───────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000, description="User question")
    mode: RetrievalMode = Field(RetrievalMode.hybrid_rerank, description="Retrieval mode")
    brand_filter: Optional[str] = Field(None, max_length=100, description="Filter by vehicle brand")
    model_filter: Optional[str] = Field(None, max_length=100, description="Filter by vehicle model")
    k: int = Field(5, ge=1, le=20, description="Number of final results")


class CriticalQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    brand_filter: Optional[str] = Field(None, max_length=100)
    model_filter: Optional[str] = Field(None, max_length=100)
    k: int = Field(5, ge=1, le=20)


class DebugRetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    mode: RetrievalMode = Field(RetrievalMode.hybrid_rerank)
    brand_filter: Optional[str] = Field(None, max_length=100)
    model_filter: Optional[str] = Field(None, max_length=100)
    k: int = Field(5, ge=1, le=20)


class EvaluateRequest(BaseModel):
    dataset: str = Field("eval_dataset.json", max_length=200, description="Evaluation dataset filename")
    mode: RetrievalMode = Field(RetrievalMode.hybrid_rerank)
    run_name: Optional[str] = Field(None, max_length=100, description="MLflow run name override")


class FeatureExtractRequest(BaseModel):
    start_index: int = Field(0, ge=0, description="Chunk index to start from")


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=254)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=254)
    password: str = Field(..., min_length=1, max_length=128)


class ChatSessionCreateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=120)


class MessageCreateRequest(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=20000)
    metadata: Optional[dict[str, Any]] = None


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
    structured_data: Optional[dict[str, Any]] = None


# ── Feature Store Extraction Schemas ──────────────────────────────────────
class StructuredRecord(BaseModel):
    category: str = Field(..., description="E.g. Maintenance Schedules, Safety and Security, Warranty, etc.")
    semantic_text: str = Field(..., description="Natural language summary of this specific extracted fact.")
    
    # Common structured fields (populated depending on category)
    maintenance_item: Optional[str] = None
    action_code: Optional[MaintenanceActionCode] = None
    action_display: Optional[str] = None
    interval_km: Optional[int] = None
    interval_months: Optional[int] = None
    condition: Optional[str] = None
    
    severity: Optional[SeverityLevel] = None
    symptoms: Optional[list[str]] = None
    possible_causes: Optional[list[str]] = None
    recommended_actions: Optional[list[str]] = None
    
    warnings: Optional[list[str]] = None
    prohibited_actions: Optional[list[str]] = None
    precautions: Optional[list[str]] = None
    
    duration: Optional[str] = None
    covered_parts: Optional[list[str]] = None
    exclusions: Optional[list[str]] = None
    
    emergency_steps: Optional[list[str]] = None

class FeatureStoreRecords(BaseModel):
    records: list[StructuredRecord]


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
    ui_card: Optional[dict[str, Any]] = None


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
    api: str = "healthy"
    mongodb: str
    vertex_ai: Optional[str] = None
    mlflow: Optional[str] = None


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


class PdfUploadIngestResponse(BaseModel):
    status: str
    message: str
    source_file: str
    brand: str
    car_model: str
    supported_years: list[int]
    chunks_inserted: int


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    createdAt: str
    updatedAt: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class ChatSessionResponse(BaseModel):
    id: str
    userId: str
    title: str
    createdAt: str
    updatedAt: str


class MessageResponse(BaseModel):
    id: str
    sessionId: str
    userId: str
    role: str
    content: str
    metadata: Optional[dict[str, Any]] = None
    createdAt: str


class ChatSessionDetailResponse(BaseModel):
    session: ChatSessionResponse
    messages: list[MessageResponse]
