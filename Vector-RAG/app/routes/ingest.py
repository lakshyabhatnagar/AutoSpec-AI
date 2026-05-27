"""Ingestion endpoint."""
from fastapi import APIRouter, HTTPException

from app.models.schemas import IngestResponse
from app.services import ingest_service

router = APIRouter(tags=["Ingestion"])


@router.post("/ingest", response_model=IngestResponse)
def ingest():
    """Trigger document ingestion pipeline."""
    try:
        result = ingest_service.trigger_ingestion()
        return IngestResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
