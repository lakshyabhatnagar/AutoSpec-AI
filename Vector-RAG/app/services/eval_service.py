"""Evaluation service — triggers MLflow evaluation runs."""
import json
import logging
import os
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

# Ensure MLflow provider keys are available
if "GEMINI_API_KEY" not in os.environ and "GOOGLE_API_KEY" in os.environ:
    os.environ["GEMINI_API_KEY"] = os.environ["GOOGLE_API_KEY"]


def run_evaluation(
    dataset_path: str = "eval_dataset.json",
    mode: RetrievalMode = RetrievalMode.hybrid_rerank,
    run_name: Optional[str] = None,
) -> dict:
    """
    Execute an MLflow evaluation run.
    Returns dict with run_id, run_name, metrics or error.
    """
    if not os.path.exists(dataset_path):
        return {"status": "error", "run_name": run_name or "unknown", "error": f"Dataset {dataset_path} not found."}

    with open(dataset_path, "r") as f:
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
        logger.error(f"Evaluation failed: {e}")
        return {"status": "error", "run_name": _run_name, "error": str(e)}
