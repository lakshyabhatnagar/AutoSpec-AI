import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

# Resolve credentials path early
_creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
if _creds_path and not os.path.isabs(_creds_path):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(_creds_path)


class Settings(BaseSettings):
    """Centralized configuration loaded from environment variables."""

    # MongoDB
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    MONGO_DB_NAME: str = "vectordb"
    CHUNK_COLLECTION: str = "llm-documents-30per-overlap"
    TABLE_COLLECTION: str = "tables-data"
    FEATURE_COLLECTION: str = "feature-store"
    FEATURE_COLLECTION_V2: str = "feature-store-v2"

    # Vertex AI
    VERTEX_PROJECT: str = os.getenv("VERTEX_PROJECT", "ppp-v4")
    VERTEX_LOCATION: str = os.getenv("VERTEX_LOCATION", "us-central1")
    EMBEDDING_MODEL: str = "text-embedding-005"
    GENERATION_MODEL: str = os.getenv("GENERATION_MODEL", "gemini-2.5-flash-lite")
    ROUTER_MODEL: str = os.getenv("ROUTER_MODEL", "gemini-2.5-flash")
    EXTRACTION_MODEL: str = os.getenv("EXTRACTION_MODEL", "gemini-2.5-flash")

    # Voyage AI
    VOYAGE_API_KEY: str = os.getenv("VOYAGE_API_KEY", "")
    VOYAGE_RERANK_MODEL: str = "rerank-2.5-lite"

    # MLflow
    MLFLOW_TRACKING_URI: str = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db")
    MLFLOW_EXPERIMENT: str = "Automotive-RAG-Eval"
    JUDGE_MODEL: str = os.getenv("JUDGE_MODEL", "vertex_ai:/gemini-2.5-flash-lite")

    # Retrieval Hyperparameters
    DENSE_K: int = 8
    BM25_K: int = 2
    FEATURE_K: int = 2
    FUSION_K: int = 10
    FINAL_K: int = 5
    NUM_CANDIDATES: int = 800
    BM25_SCORE_THRESHOLD: float = 1.5
    DENSE_WEIGHT: float = 1.5
    BM25_WEIGHT: float = 0.2
    FEATURE_STORE_WEIGHT: float = 1.3
    RRF_K: int = 60

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
