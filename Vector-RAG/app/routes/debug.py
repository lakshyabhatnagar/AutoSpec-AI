"""Debug retrieval endpoint — full introspection."""
from fastapi import APIRouter

from app.models.schemas import (
    DebugRetrieveRequest, DebugRetrieveResponse,
    DebugChunk, ChunkMetadata,
)
from app.routes.errors import raise_route_error
from app.services import query_service

router = APIRouter(tags=["Debug"])


@router.post("/debug/retrieve", response_model=DebugRetrieveResponse)
def debug_retrieve(req: DebugRetrieveRequest):
    """Inspect retrieval quality with full scoring breakdown."""
    try:
        result = query_service.handle_debug_retrieve(
            query=req.query,
            mode=req.mode,
            k=req.k,
            brand_filter=req.brand_filter,
            model_filter=req.model_filter,
        )

        debug_chunks = [
            DebugChunk(
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
                retrieval_source=r.source,
                rrf_score=r.rrf_score,
                reranker_score=r.reranker_score,
            )
            for r in result["chunks"]
        ]

        return DebugRetrieveResponse(
            query=result["query"],
            mode=result["mode"],
            is_critical=result["is_critical"],
            category=result["category"],
            dense_count=result["dense_count"],
            bm25_count=result["bm25_count"],
            feature_store_count=result["feature_store_count"],
            fused_count=result["fused_count"],
            final_count=result["final_count"],
            chunks=debug_chunks,
        )
    except Exception as e:
        raise_route_error("Debug retrieval", e)
