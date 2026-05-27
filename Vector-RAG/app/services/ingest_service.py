"""Ingestion service — wraps the existing app.py ingestion logic."""
import logging

logger = logging.getLogger("rag.services.ingest")


def trigger_ingestion() -> dict:
    """
    Trigger document ingestion pipeline.
    This is a thin wrapper that imports and calls the existing ingestion logic
    from the root-level app.py without modifying it.
    """
    try:
        # Import the existing ingestion function
        import sys
        import os
        # Ensure the project root is importable
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)

        from app_legacy import ingest_manuals  # we'll alias app.py → app_legacy below
        ingest_manuals()
        return {"status": "completed", "message": "Ingestion pipeline finished."}
    except ImportError:
        logger.warning(
            "Legacy ingestion module (app.py) not importable as app_legacy. "
            "Ingestion must be triggered manually via: python app.py"
        )
        return {
            "status": "not_available",
            "message": (
                "Ingestion is currently only available via the CLI: python app.py. "
                "The legacy ingestion module could not be imported due to naming conflicts with the FastAPI app package."
            ),
        }
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        return {"status": "error", "message": str(e)}
