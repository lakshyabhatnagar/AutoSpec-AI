"""Public PDF upload ingestion for automotive manuals."""
from __future__ import annotations

import json
import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Any

import fitz
from google import genai

from app.config.settings import settings
from app.db.mongodb import chunk_collection
from app.retrieval.bm25 import bm25_index
from utils.embeddings import generate_embedding
from utils.llm_semantic_chunking import process_pdf_llm_semantic

logger = logging.getLogger("rag.services.pdf_upload")

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
VALIDATION_PAGES = 8
VALIDATION_CHARS = 12000


class PdfUploadError(Exception):
    """Expected upload failure with an HTTP status code."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _sanitize_filename(filename: str) -> str:
    safe = Path(filename).name.strip().replace(" ", "_")
    safe = re.sub(r"[^A-Za-z0-9_.-]", "_", safe)
    if not safe.lower().endswith(".pdf"):
        safe = f"{safe}.pdf"
    return safe[:180]


def _year_from_filename(filename: str) -> int | None:
    match = re.search(r"(19[5-9]\d|20\d{2}|2100)", filename)
    if not match:
        return None
    return int(match.group(1))


def _parse_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise
        data = json.loads(match.group())

    if not isinstance(data, dict):
        raise ValueError("Validator returned non-object JSON.")
    return data


def _extract_validation_text(pdf_path: str) -> str:
    try:
        doc = fitz.open(pdf_path)
    except Exception as exc:
        raise PdfUploadError("Uploaded file is not a readable PDF.", 400) from exc

    parts: list[str] = []
    try:
        for page_num, page in enumerate(doc, 1):
            if page_num > VALIDATION_PAGES:
                break
            text = page.get_text().strip()
            if text:
                parts.append(f"--- Page {page_num} ---\n{text}")
            if sum(len(part) for part in parts) >= VALIDATION_CHARS:
                break
    finally:
        doc.close()

    validation_text = "\n\n".join(parts)[:VALIDATION_CHARS]
    if len(validation_text.strip()) < 300:
        raise PdfUploadError("PDF has too little readable text to validate.", 400)
    return validation_text


def _validate_automotive_manual(pdf_path: str, filename: str) -> dict[str, Any]:
    validation_text = _extract_validation_text(pdf_path)
    client = genai.Client(vertexai=True, project=settings.VERTEX_PROJECT, location=settings.VERTEX_LOCATION)

    prompt = f"""\
Classify whether the uploaded PDF is an automotive car owner's manual, service manual, or vehicle handbook.

Reject brochures, invoices, generic articles, research papers, legal documents, unrelated product manuals, and PDFs that are not primarily about operating, maintaining, servicing, or troubleshooting a car.

Return ONLY valid JSON:
{{
  "is_car_manual": true,
  "reason": "short reason",
  "brand": "vehicle brand or Unknown",
  "car_model": "vehicle model or Unknown",
  "model_year": 2025
}}

Filename: {filename}

PDF text sample:
{validation_text}
"""

    try:
        response = client.models.generate_content(
            model=settings.GENERATION_MODEL,
            contents=prompt,
            config={"temperature": 0.0, "max_output_tokens": 512},
        )
        data = _parse_json_object(response.text or "")
    except Exception as exc:
        logger.warning("PDF manual validation failed.", exc_info=True)
        raise PdfUploadError("Could not validate the uploaded PDF. Try again later.", 503) from exc

    if data.get("is_car_manual") is not True:
        reason = str(data.get("reason") or "The PDF does not look like a car manual.")
        raise PdfUploadError(f"Upload rejected: {reason}", 400)

    brand = str(data.get("brand") or "Unknown").strip()[:80] or "Unknown"
    car_model = str(data.get("car_model") or "Unknown").strip()[:100] or "Unknown"
    try:
        model_year = int(data.get("model_year") or 0)
    except (TypeError, ValueError):
        model_year = 0

    if model_year < 1950 or model_year > 2100:
        model_year = _year_from_filename(filename) or 2025

    if car_model.lower() == "unknown":
        stem = Path(filename).stem
        car_model = re.sub(r"[_-]?(19[5-9]\d|20\d{2}|2100)$", "", stem).strip("_- ") or "Unknown"

    return {
        "brand": brand,
        "car_model": car_model.replace(" ", "_"),
        "car_year_start": model_year - 1,
        "car_year_end": model_year + 1,
        "supported_years": [model_year - 1, model_year, model_year + 1],
    }


def ingest_uploaded_pdf(pdf_bytes: bytes, filename: str) -> dict[str, Any]:
    """Validate, chunk, embed, and store an uploaded public automotive manual."""
    if not pdf_bytes:
        raise PdfUploadError("No PDF bytes received.", 400)
    if len(pdf_bytes) > MAX_UPLOAD_BYTES:
        raise PdfUploadError("PDF upload exceeds the 50 MB limit.", 413)
    if not pdf_bytes.startswith(b"%PDF"):
        raise PdfUploadError("Uploaded file must be a PDF.", 400)

    source_file = _sanitize_filename(filename)
    if chunk_collection.find_one({"source_file": source_file}, {"_id": 1}):
        raise PdfUploadError(f"{source_file} is already ingested.", 409)

    tmp_path = ""
    try:
        with tempfile.NamedTemporaryFile(prefix="autospec-upload-", suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        metadata = _validate_automotive_manual(tmp_path, source_file)
        metadata["source_file"] = source_file

        chunks = process_pdf_llm_semantic(tmp_path, metadata)
        if not chunks:
            raise PdfUploadError("No chunks were generated from the PDF.", 422)

        inserted = 0
        inserted_ids = []
        try:
            for chunk_doc in chunks:
                chunk_doc["embedding"] = generate_embedding(chunk_doc["text"])
                result = chunk_collection.insert_one(chunk_doc)
                inserted_ids.append(result.inserted_id)
                inserted += 1
        except Exception:
            if inserted_ids:
                chunk_collection.delete_many({"_id": {"$in": inserted_ids}})
            raise

        bm25_index.build()

        return {
            "status": "completed",
            "message": "PDF manual ingested and indexed.",
            "source_file": source_file,
            "brand": metadata["brand"],
            "car_model": metadata["car_model"],
            "supported_years": metadata["supported_years"],
            "chunks_inserted": inserted,
        }
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                logger.warning("Could not delete temporary upload file: %s", tmp_path)
