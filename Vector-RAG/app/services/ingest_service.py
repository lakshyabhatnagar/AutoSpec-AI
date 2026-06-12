"""Ingestion service — triggers the canonical root-level ingest.py pipeline."""
import importlib.util
import logging
import sys
from pathlib import Path

logger = logging.getLogger("rag.services.ingest")
_PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _load_ingest_manuals():
    """Load root-level ingest.py without conflicting with the FastAPI app package."""
    ingest_path = _PROJECT_ROOT / "ingest.py"
    spec = importlib.util.spec_from_file_location("canonical_ingestion_pipeline", ingest_path)
    if spec is None or spec.loader is None:
        raise ImportError("Could not load ingestion module.")

    if str(_PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(_PROJECT_ROOT))

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    ingest_manuals = getattr(module, "ingest_manuals", None)
    if ingest_manuals is None:
        raise ImportError("Ingestion function not found.")
    return ingest_manuals


def trigger_ingestion() -> dict:
    """
    Trigger document ingestion pipeline.
    This imports and calls the single canonical ingestion implementation from
    root-level ingest.py.
    """
    try:
        ingest_manuals = _load_ingest_manuals()
        ingest_manuals()
        return {"status": "completed", "message": "Ingestion pipeline finished."}
    except ImportError:
        logger.warning("Canonical ingestion module ingest.py is not importable.")
        return {
            "status": "not_available",
            "message": (
                "Ingestion is currently only available via the CLI: python ingest.py. "
                "The canonical ingestion module could not be imported."
            ),
        }
    except Exception as e:
        logger.exception("Ingestion failed.")
        return {"status": "error", "message": "Ingestion failed. Check server logs."}
