"""Ingestion endpoint."""
from fastapi import APIRouter, HTTPException, Query, Request
from starlette.concurrency import run_in_threadpool

from app.models.schemas import IngestResponse, PdfUploadIngestResponse
from app.routes.errors import raise_route_error
from app.services import ingest_service, pdf_upload_service

router = APIRouter(tags=["Ingestion"])


@router.post("/ingest", response_model=IngestResponse)
def ingest():
    """Trigger document ingestion pipeline."""
    try:
        result = ingest_service.trigger_ingestion()
        return IngestResponse(**result)
    except Exception as e:
        raise_route_error("Ingestion", e)


@router.post("/ingest/upload-pdf", response_model=PdfUploadIngestResponse)
async def upload_pdf_manual(
    request: Request,
    filename: str = Query(..., min_length=1, max_length=180, description="Original PDF filename"),
):
    """
    Upload a public automotive manual PDF, validate it, then ingest it using
    the canonical LLM semantic chunking pipeline.

    Send the raw PDF as the request body with Content-Type: application/pdf.
    """
    content_type = request.headers.get("content-type", "").split(";")[0].lower()
    if content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Content-Type must be application/pdf.")

    body = await request.body()
    try:
        result = await run_in_threadpool(pdf_upload_service.ingest_uploaded_pdf, body, filename)
        return PdfUploadIngestResponse(**result)
    except pdf_upload_service.PdfUploadError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise_route_error("PDF upload ingestion", e)
