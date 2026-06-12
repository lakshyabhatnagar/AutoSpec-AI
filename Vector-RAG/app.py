"""Compatibility wrapper for the canonical ingestion pipeline.

Use `python ingest.py` for direct CLI ingestion. This file remains only so any
older commands that run `python app.py` execute the same implementation.
"""
from ingest import CHUNKING_MODE, PDF_ROOT, ingest_manuals


if __name__ == "__main__":
    ingest_manuals()
    print(f"\nIngestion completed using {CHUNKING_MODE} chunking from {PDF_ROOT}.")
