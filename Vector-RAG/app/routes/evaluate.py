"""MLflow evaluation endpoint."""
from fastapi import APIRouter

from app.models.schemas import EvaluateRequest, EvaluateResponse
from app.routes.errors import raise_route_error
from app.services import eval_service

router = APIRouter(tags=["Evaluation"])


@router.post("/evaluate", response_model=EvaluateResponse)
def evaluate(req: EvaluateRequest):
    """Trigger an MLflow evaluation run."""
    try:
        result = eval_service.run_evaluation(
            dataset_path=req.dataset,
            mode=req.mode,
            run_name=req.run_name,
        )
        return EvaluateResponse(**result)
    except Exception as e:
        raise_route_error("Evaluation", e)
