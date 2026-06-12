"""Health check endpoint."""
from fastapi import APIRouter

from app.db.mongodb import ping_mongo
from app.models.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API and MongoDB connectivity."""

    mongo_ok = await ping_mongo()

    return HealthResponse(
        api="healthy",
        mongodb="healthy" if mongo_ok else "unhealthy",
    )
