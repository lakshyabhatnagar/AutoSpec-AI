"""Feature-store extraction endpoint."""
from fastapi import APIRouter

from app.models.schemas import FeatureExtractRequest, FeatureExtractResponse
from app.routes.errors import raise_route_error
from app.services import feature_store_service

router = APIRouter(tags=["Feature Store"])


@router.post("/feature-store/extract", response_model=FeatureExtractResponse)
def extract_features(req: FeatureExtractRequest):
    """
    Trigger feature extraction pipeline in background.
    Will NOT interfere with any currently running ingestion.
    """
    try:
        result = feature_store_service.trigger_extraction(start_index=req.start_index)
        return FeatureExtractResponse(**result)
    except Exception as e:
        raise_route_error("Feature extraction", e)
