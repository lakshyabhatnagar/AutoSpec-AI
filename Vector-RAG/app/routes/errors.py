"""Shared route error handling helpers."""
from typing import NoReturn
import logging

from fastapi import HTTPException

logger = logging.getLogger("rag.routes")


def raise_route_error(operation: str, exc: Exception) -> NoReturn:
    """Log full server-side details while returning safe client errors."""
    if isinstance(exc, ValueError):
        logger.warning("%s rejected invalid input: %s", operation, exc)
        raise HTTPException(status_code=400, detail="Invalid request.") from exc

    logger.exception("%s failed", operation)
    raise HTTPException(status_code=500, detail=f"{operation} failed.") from exc
