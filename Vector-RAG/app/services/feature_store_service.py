"""Feature-store extraction service — triggers the Gemini extraction pipeline."""
import logging
import threading

logger = logging.getLogger("rag.services.feature_store")

# Track running extraction to prevent double-starts
_extraction_running = False
_extraction_lock = threading.Lock()


def trigger_extraction(start_index: int = 0) -> dict:
    """
    Start feature extraction in a background thread.
    Will not interfere with any currently running ingestion.
    """
    global _extraction_running

    with _extraction_lock:
        if _extraction_running:
            return {
                "status": "already_running",
                "message": "Feature extraction is already in progress. Wait for it to complete.",
            }
        _extraction_running = True

    def _run():
        global _extraction_running
        try:
            # Import at call-time to avoid circular imports during startup
            from utils.feature_extraction import run_extraction_pipeline
            run_extraction_pipeline(start_index=start_index)
        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
        finally:
            with _extraction_lock:
                _extraction_running = False

    thread = threading.Thread(target=_run, daemon=True, name="feature-extraction")
    thread.start()

    return {
        "status": "started",
        "message": f"Feature extraction started in background from chunk index {start_index}.",
    }
