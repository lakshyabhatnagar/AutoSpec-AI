"""
FastAPI application entry point.

Registers all routers and handles startup/shutdown lifecycle
(BM25 index construction, feature-store index construction).
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import cors_origins
from app.db.mongodb import chat_sessions_collection, messages_collection, users_collection
from app.retrieval.bm25 import bm25_index
from app.retrieval.critical import feature_bm25_index, tables_bm25_index
from app.routes import auth, chat_history, health, query, debug, evaluate, ingest, feature_store

# ── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-30s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("rag.main")


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Build in-memory indexes on startup."""
    users_collection.create_index("email", unique=True)
    chat_sessions_collection.create_index([("userId", 1), ("updatedAt", -1)])
    messages_collection.create_index([("sessionId", 1), ("createdAt", 1)])
    logger.info("Starting RAG backend — building BM25 indexes...")
    bm25_index.build()
    feature_bm25_index.build()
    tables_bm25_index.build()
    logger.info("All indexes ready. Server is accepting requests.")
    yield
    logger.info("Shutting down RAG backend.")


# ── Application ───────────────────────────────────────────────────────────
app = FastAPI(
    title="AutoSpec AI API",
    description=(
        "Production backend for AutoSpec AI.\n\n"
        "Supports semantic, BM25, hybrid, reranked hybrid, and critical "
        "feature-store retrieval modes with Vertex AI generation."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (allow Next.js frontend) ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(chat_history.router)
app.include_router(query.router)
app.include_router(debug.router)
app.include_router(evaluate.router)
app.include_router(ingest.router)
app.include_router(feature_store.router)
