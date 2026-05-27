"""Health check endpoint."""
from fastapi import APIRouter

from app.db.mongodb import ping_mongo
from app.models.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check connectivity of MongoDB, Vertex AI, and MLflow."""

    # MongoDB
    mongo_ok = await ping_mongo()

    # Vertex AI — lightweight check: can we import the client?
    try:
        from app.retrieval.semantic import _embed_client  # noqa: F401
        vertex_status = "healthy"
    except Exception:
        vertex_status = "unhealthy"

    # MLflow — check if tracking URI is reachable
    try:
        import mlflow
        mlflow.set_experiment("health-check-probe")
        mlflow_status = "healthy"
    except Exception:
        mlflow_status = "unhealthy"

    return HealthResponse(
        mongodb="healthy" if mongo_ok else "unhealthy",
        vertex_ai=vertex_status,
        mlflow=mlflow_status,
    )
