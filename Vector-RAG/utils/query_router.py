"""
Query router — re-exports from the FastAPI app's query service.

This file exists for backward compatibility with any scripts
that import classify_query_intent from utils.query_router.
"""
from app.services.query_service import classify_query as classify_query_intent

__all__ = ["classify_query_intent"]
