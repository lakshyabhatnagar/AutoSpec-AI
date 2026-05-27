"""Query and Critical Query endpoints."""
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    QueryRequest, QueryResponse,
    CriticalQueryRequest, CriticalQueryResponse,
    RetrievedChunk, ChunkMetadata,
)
from app.services import query_service

router = APIRouter(tags=["Query"])


def _to_chunk_schema(r) -> RetrievedChunk:
    return RetrievedChunk(
        page_content=r.text,
        metadata=ChunkMetadata(
            doc_uri=r.metadata.get("doc_uri"),
            brand=r.metadata.get("brand"),
            model=r.metadata.get("model"),
            years=r.metadata.get("years"),
            section=r.metadata.get("section"),
            subsection=r.metadata.get("subsection"),
            page=r.metadata.get("page"),
            score=r.score,
            chunk_id=r.metadata.get("chunk_id"),
            is_feature_record=r.is_feature_record,
        ),
    )


@router.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    """Standard retrieval + generation endpoint."""
    try:
        answer, chunks, mode_used = query_service.handle_query(
            query=req.query,
            mode=req.mode,
            k=req.k,
            brand_filter=req.brand_filter,
            model_filter=req.model_filter,
        )
        return QueryResponse(
            answer=answer,
            mode=mode_used,
            retrieved_chunks=[_to_chunk_schema(c) for c in chunks],
            chunk_count=len(chunks),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query/critical", response_model=CriticalQueryResponse)
def critical_query(req: CriticalQueryRequest):
    """High-precision critical retrieval via feature-store prioritization."""
    try:
        answer, chunks, is_critical, category = query_service.handle_critical_query(
            query=req.query,
            k=req.k,
            brand_filter=req.brand_filter,
            model_filter=req.model_filter,
        )
        return CriticalQueryResponse(
            answer=answer,
            is_critical=is_critical,
            category=category,
            retrieved_chunks=[_to_chunk_schema(c) for c in chunks],
            chunk_count=len(chunks),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
