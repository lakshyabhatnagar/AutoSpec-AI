"""
CLI client for running MLflow evaluation via the FastAPI /evaluate endpoint.

Usage:
    python evaluate_rag.py                                     # default settings
    python evaluate_rag.py --mode hybrid_rerank                # specific mode
    python evaluate_rag.py --run-name my_experiment_v2         # custom run name
    python evaluate_rag.py --dataset custom_eval_dataset.json  # custom dataset

Requires the FastAPI server to be running:
    uvicorn app.main:app --reload --port 8000
"""
import argparse
import json
import sys
import requests

API_BASE = "http://127.0.0.1:8000"


def _check_server():
    try:
        r = requests.get(f"{API_BASE}/health", timeout=3)
        r.raise_for_status()
        return True
    except Exception:
        print("ERROR: FastAPI server is not running.")
        print("Start it with: uvicorn app.main:app --reload --port 8000")
        return False


def run_evaluation(dataset: str, mode: str, run_name: str = None):
    payload = {"dataset": dataset, "mode": mode}
    if run_name:
        payload["run_name"] = run_name

    print(f"Triggering MLflow evaluation...")
    print(f"  Dataset: {dataset}")
    print(f"  Mode: {mode}")
    print(f"  Run Name: {run_name or '(auto-generated)'}")
    print()

    try:
        r = requests.post(f"{API_BASE}/evaluate", json=payload, timeout=600)
        r.raise_for_status()
        result = r.json()

        print(f"Status: {result['status']}")
        print(f"Run Name: {result['run_name']}")

        if result.get("run_id"):
            print(f"Run ID: {result['run_id']}")

        if result.get("metrics"):
            print("\nEvaluation Results:")
            for metric, value in result["metrics"].items():
                print(f"  {metric}: {value:.4f}")
        elif result.get("error"):
            print(f"\nError: {result['error']}")

    except requests.exceptions.RequestException as e:
        print(f"API error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run MLflow evaluation via FastAPI.")
    parser.add_argument("--dataset", type=str, default="eval_dataset.json", help="Evaluation dataset file")
    parser.add_argument("--mode", type=str, default="hybrid_rerank",
                        choices=["semantic", "bm25", "hybrid", "hybrid_rerank"],
                        help="Retrieval mode to evaluate")
    parser.add_argument("--run-name", type=str, default=None, help="MLflow run name")
    args = parser.parse_args()

    if not _check_server():
        sys.exit(1)

    run_evaluation(args.dataset, args.mode, args.run_name)
