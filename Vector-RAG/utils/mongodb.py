"""
MongoDB connection — re-exports from the FastAPI app's centralized DB module.

This file exists for backward compatibility with standalone scripts
(ingest.py, utils/feature_extraction.py) that import from utils.mongodb.
"""
from app.db.mongodb import chunk_collection as collection, feature_collection

__all__ = ["collection", "feature_collection"]