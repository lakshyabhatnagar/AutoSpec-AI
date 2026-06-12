"""Evaluation service — triggers MLflow evaluation runs."""
import json
import logging
import os
from pathlib import Path
from typing import Optional

import mlflow
from mlflow.genai.scorers import (
    RetrievalRelevance,
    RetrievalSufficiency,
    RetrievalGroundedness,
)

from app.config.settings import settings
from app.services.query_service import handle_query
from app.models.schemas import RetrievalMode

logger = logging.getLogger("rag.services.eval")
_PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Ensure MLflow provider keys are available
if "GEMINI_API_KEY" not in os.environ and "GOOGLE_API_KEY" in os.environ:
    os.environ["GEMINI_API_KEY"] = os.environ["GOOGLE_API_KEY"]


def _resolve_dataset_path(dataset_path: str) -> Path:
    """Resolve a project-local JSON dataset path without allowing traversal."""
    requested = Path(dataset_path)
    if requested.is_absolute() or ".." in requested.parts:
        raise ValueError("Dataset path must be a project-relative JSON file.")
    if requested.suffix.lower() != ".json":
        raise ValueError("Dataset path must point to a JSON file.")

    resolved = (_PROJECT_ROOT / requested).resolve()
    try:
        resolved.relative_to(_PROJECT_ROOT.resolve())
    except ValueError:
        raise ValueError("Dataset path must stay within the project directory.")
    return resolved


def run_evaluation(
    dataset_path: str = "eval_dataset.json",
    mode: RetrievalMode = RetrievalMode.hybrid_rerank,
    run_name: Optional[str] = None,
) -> dict:
    """
    Execute an MLflow evaluation run.
    Returns dict with run_id, run_name, metrics or error.
    """
    try:
        resolved_dataset_path = _resolve_dataset_path(dataset_path)
    except ValueError as e:
        logger.warning("Rejected evaluation dataset path: %s", e)
        return {"status": "error", "run_name": run_name or "unknown", "error": "Invalid dataset path."}

    if not resolved_dataset_path.exists():
        return {"status": "error", "run_name": run_name or "unknown", "error": "Dataset not found."}

    with open(resolved_dataset_path, "r") as f:
        dataset = json.load(f)

    eval_dataset = [
        {
            "inputs": {"query": item["question"]},
            "expectations": {"expected_facts": item["expected_facts"]},
        }
        for item in dataset
    ]

    # Build a predict function that uses the selected retrieval mode
    def rag_predict(query: str):
        answer, _, _ = handle_query(query, mode=mode, k=5)
        return {"response": answer}

    mlflow.set_experiment(settings.MLFLOW_EXPERIMENT)
    _run_name = run_name or f"api_eval_{mode.value}"

    relevance = RetrievalRelevance(model=settings.JUDGE_MODEL)
    sufficiency = RetrievalSufficiency(model=settings.JUDGE_MODEL)
    groundedness = RetrievalGroundedness(model=settings.JUDGE_MODEL)

    try:
        with mlflow.start_run(run_name=_run_name) as run:
            mlflow.log_param("judge_model", settings.JUDGE_MODEL)
            mlflow.log_param("retrieval_mode", mode.value)

            eval_results = mlflow.genai.evaluate(
                data=eval_dataset,
                predict_fn=rag_predict,
                scorers=[relevance, sufficiency, groundedness],
            )

            metrics = {k: float(v) for k, v in eval_results.metrics.items()}

            return {
                "status": "completed",
                "run_name": _run_name,
                "run_id": run.info.run_id,
                "metrics": metrics,
            }
    except Exception as e:
        logger.exception("Evaluation failed.")
        return {"status": "error", "run_name": _run_name, "error": "Evaluation failed. Check server logs."}
