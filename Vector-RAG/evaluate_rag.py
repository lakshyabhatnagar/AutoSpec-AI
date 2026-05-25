import os
import json
import mlflow
from mlflow.genai.scorers import (
    RetrievalRelevance,
    RetrievalSufficiency,
    RetrievalGroundedness
)
from test_rag_pipeline import search_vector_db
from utils.test_generation import generate_final_response
from dotenv import load_dotenv

load_dotenv()

# Provider API key mappings — MLflow looks for specific env vars per provider.
# GOOGLE_API_KEY → GEMINI_API_KEY (for gemini:/ provider)
if "GEMINI_API_KEY" not in os.environ and "GOOGLE_API_KEY" in os.environ:
    os.environ["GEMINI_API_KEY"] = os.environ["GOOGLE_API_KEY"]

# Resolve VERTEX_CREDENTIALS to absolute path (dotenv loads relative paths as-is)
if creds := os.environ.get("VERTEX_CREDENTIALS"):
    abs_creds = os.path.abspath(creds)
    if os.path.isfile(abs_creds):
        os.environ["VERTEX_CREDENTIALS"] = abs_creds

# Configuration
EVAL_DATASET = "eval_dataset.json"
EXPERIMENT_NAME = "Automotive-RAG-Eval"

# Judge model URI — format: <provider>:/<model-name>
# Examples: vertex_ai:/gemini-2.0-flash-lite, openrouter:/gpt-4o-mini, gemini:/gemini-2.0-flash
JUDGE_MODEL = os.getenv("JUDGE_MODEL", "vertex_ai:/gemini-2.0-flash-lite")

mlflow.set_experiment(EXPERIMENT_NAME)

def load_dataset(file_path):
    with open(file_path, "r") as f:
        return json.load(f)

@mlflow.trace
def rag_agent(query: str):
    """
    Root trace for the RAG pipeline.
    1. Retrieves documents (traced as RETRIEVER span)
    2. Generates a grounded answer (traced as LLM span)
    Returns the generated answer so groundedness can be evaluated.
    """
    retrieved_docs = search_vector_db(query, k=5)

    # Generate a grounded answer from the retrieved context
    answer = generate_final_response(query, retrieved_docs)

    return {"response": answer}

def run_evaluation():
    dataset = load_dataset(EVAL_DATASET)
    
    # Build evaluation dataset with correct schema:
    # - inputs: dict with key matching predict_fn parameter name
    # - expectations: dict with expected_facts as a LIST (not joined string)
    eval_dataset = []
    for item in dataset:
        eval_dataset.append({
            "inputs": {"query": item["question"]},
            "expectations": {
                "expected_facts": item["expected_facts"]  # keep as list
            }
        })

    # Scorers using the configured judge model
    relevance = RetrievalRelevance(model=JUDGE_MODEL)
    sufficiency = RetrievalSufficiency(model=JUDGE_MODEL)
    groundedness = RetrievalGroundedness(model=JUDGE_MODEL)
    
    with mlflow.start_run(run_name="bm25+vector_dw2.0_bw0.1_dk20_bk1_fk15_rrf100_nc1000_reranking"):
        mlflow.log_param("judge_model", JUDGE_MODEL)
        
        eval_results = mlflow.genai.evaluate(
            data=eval_dataset,
            predict_fn=rag_agent,
            scorers=[
                relevance,
                sufficiency,
                groundedness
            ],
        )
        
        print("\nEvaluation Results:")
        print(eval_results.metrics)

if __name__ == "__main__":
    if not os.path.exists(EVAL_DATASET):
        print(f"Dataset {EVAL_DATASET} not found. Please create it first.")
    else:
        run_evaluation()
