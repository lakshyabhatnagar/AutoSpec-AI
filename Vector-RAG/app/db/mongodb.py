"""
MongoDB connection management.

Provides both sync (PyMongo) and async (Motor) clients:
- Sync client: used at startup for BM25 index construction and retrieval queries.
- Async client: used for non-blocking health checks and future async operations.
"""
import logging
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.config.settings import settings

logger = logging.getLogger("rag.db")

# ── Sync client (PyMongo) ────────────────────────────────────────────────
_sync_client = MongoClient(settings.MONGO_URI)
sync_db = _sync_client[settings.MONGO_DB_NAME]
chunk_collection = sync_db[settings.CHUNK_COLLECTION]
feature_collection = sync_db[settings.FEATURE_COLLECTION]

# ── Async client (Motor) ─────────────────────────────────────────────────
_async_client = AsyncIOMotorClient(settings.MONGO_URI)
async_db = _async_client[settings.MONGO_DB_NAME]


async def ping_mongo() -> bool:
    """Returns True if MongoDB is reachable."""
    try:
        await _async_client.admin.command("ping")
        return True
    except Exception as e:
        logger.error(f"MongoDB ping failed: {e}")
        return False
