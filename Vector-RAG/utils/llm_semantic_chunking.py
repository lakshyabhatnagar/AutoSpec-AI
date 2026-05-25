"""
LLM-based semantic chunking using Vertex AI Gemini.

Uses Gemini to identify natural semantic boundaries in automotive owner's manuals,
producing chunks that preserve complete topics, procedural sequences, and
feature-warning relationships.

Chunking mode: "llm_semantic"
"""

import json
import logging
import os
import re

import fitz
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Resolve credentials path for Vertex AI
_creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
if _creds_path and not os.path.isabs(_creds_path):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(_creds_path)

_client = genai.Client(
    vertexai=True,
    project="ppp-v4",
    location="us-central1"
)

LLM_MODEL = os.getenv("GENERATION_MODEL", "gemini-2.5-flash-lite")

_logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# ─────────────────────────────────────────────────────────────────────────────
# Prompt template for semantic boundary detection
# ─────────────────────────────────────────────────────────────────────────────

_CHUNKING_PROMPT = """\
You are analyzing an automotive owner's manual.
Identify SEMANTIC CHUNK BOUNDARIES in the following text extracted from pages {start_page}-{end_page}.

Rules:
- Each chunk should cover ONE complete topic, feature, or procedure.
- Keep numbered/lettered procedural steps together — NEVER split a sequence mid-way.
- Keep WARNING/CAUTION/NOTE blocks together with the feature they describe.
- Each chunk should be roughly 200-800 words. Shorter is acceptable if it's a self-contained topic.
- Derive section_heading (the broad manual section, e.g. "CLIMATE CONTROL", "STARTING AND DRIVING").
- Derive subsection_heading (the specific topic, e.g. "Auto ON Selection Button", "Drive Modes").
- The "text" field must contain the EXACT original text for that chunk — do NOT summarize, rewrite, or omit content.
- start_page and end_page indicate which PDF pages the chunk spans.

Return ONLY a valid JSON array. No markdown, no explanation, no extra text.

[
  {{
    "section_heading": "...",
    "subsection_heading": "...",
    "text": "...",
    "start_page": N,
    "end_page": N
  }}
]

--- TEXT FROM PAGES {start_page}-{end_page} ---
{batch_text}
"""

# ─────────────────────────────────────────────────────────────────────────────
# Page extraction and batching
# ─────────────────────────────────────────────────────────────────────────────


def _extract_pages(pdf_path, max_pages=None):
    """Extract page text from PDF using PyMuPDF. Returns list of (page_num, text)."""
    doc = fitz.open(pdf_path)
    pages = []
    for page_num, page in enumerate(doc, 1):
        if max_pages is not None and page_num > max_pages:
            break
        text = page.get_text().strip()
        if text and len(text) > 30:  # Skip near-empty pages (TOC stubs, blanks)
            pages.append((page_num, text))
    doc.close()
    return pages


def _batch_pages(pages, max_chars=4000):
    """
    Group consecutive pages into batches of roughly max_chars total.
    Each batch is (start_page, end_page, combined_text).
    """
    batches = []
    current_text = ""
    start_page = None

    for page_num, text in pages:
        if start_page is None:
            start_page = page_num

        if len(current_text) + len(text) > max_chars and current_text:
            batches.append((start_page, page_num - 1, current_text.strip()))
            current_text = text + "\n\n"
            start_page = page_num
        else:
            current_text += f"\n--- Page {page_num} ---\n{text}\n\n"

    # Flush remaining
    if current_text.strip() and start_page is not None:
        last_page = pages[-1][0] if pages else start_page
        batches.append((start_page, last_page, current_text.strip()))

    return batches


# ─────────────────────────────────────────────────────────────────────────────
# LLM call with retry and JSON parsing
# ─────────────────────────────────────────────────────────────────────────────


def _parse_llm_response(response_text):
    """
    Robustly parse the LLM JSON response.
    Handles markdown fences, trailing commas, and other common issues.
    """
    text = response_text.strip()

    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    # Try direct parse
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "chunks" in data:
            return data["chunks"]
        return [data]
    except json.JSONDecodeError:
        pass

    # Try extracting JSON array from within the text
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return None


def _validate_chunk(chunk):
    """Validate that a parsed chunk has all required fields."""
    required = {"section_heading", "subsection_heading", "text", "start_page", "end_page"}
    if not isinstance(chunk, dict):
        return False
    if not required.issubset(chunk.keys()):
        return False
    if not chunk["text"] or len(chunk["text"].strip()) < 20:
        return False
    return True


def _call_gemini_chunker(batch_text, start_page, end_page, max_retries=3):
    """
    Send a page batch to Gemini for semantic boundary detection.
    Returns a list of chunk dicts, or None on complete failure.
    """
    prompt = _CHUNKING_PROMPT.format(
        start_page=start_page,
        end_page=end_page,
        batch_text=batch_text
    )

    for attempt in range(1, max_retries + 1):
        try:
            response = _client.models.generate_content(
                model=LLM_MODEL,
                contents=prompt,
                config={
                    "temperature": 0.0,
                    "max_output_tokens": 8192,
                }
            )

            parsed = _parse_llm_response(response.text)
            if parsed is None:
                _logger.warning(
                    f"  Attempt {attempt}/{max_retries}: Malformed JSON for pages {start_page}-{end_page}"
                )
                continue

            # Validate each chunk
            valid_chunks = [c for c in parsed if _validate_chunk(c)]
            if not valid_chunks:
                _logger.warning(
                    f"  Attempt {attempt}/{max_retries}: No valid chunks parsed for pages {start_page}-{end_page}"
                )
                continue

            invalid_count = len(parsed) - len(valid_chunks)
            if invalid_count > 0:
                _logger.warning(f"  Dropped {invalid_count} invalid chunks from pages {start_page}-{end_page}")

            return valid_chunks

        except Exception as e:
            _logger.warning(f"  Attempt {attempt}/{max_retries}: Gemini call failed for pages {start_page}-{end_page}: {e}")

    _logger.error(f"  All {max_retries} attempts failed for pages {start_page}-{end_page}. Using fallback.")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Semantic overlap
# ─────────────────────────────────────────────────────────────────────────────


def _apply_semantic_overlap(chunks, overlap_pct=0.20):
    """
    Apply 20% semantic overlap: prepend the trailing portion of chunk[i-1]
    to chunk[i]. Uses sentence boundaries to avoid cutting mid-sentence.
    """
    if len(chunks) < 2:
        return chunks

    for i in range(1, len(chunks)):
        prev_text = chunks[i - 1]["text"]
        overlap_chars = int(len(prev_text) * overlap_pct)

        if overlap_chars < 30:
            continue

        # Find a sentence boundary near the overlap point
        tail = prev_text[-overlap_chars:]
        # Try to start at a sentence boundary (after ". " or "\n")
        sentence_break = tail.find(". ")
        if sentence_break != -1 and sentence_break < len(tail) * 0.5:
            tail = tail[sentence_break + 2:]
        else:
            newline_break = tail.find("\n")
            if newline_break != -1 and newline_break < len(tail) * 0.5:
                tail = tail[newline_break + 1:]

        if tail.strip():
            chunks[i]["text"] = tail.strip() + "\n\n" + chunks[i]["text"]

    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# Fallback chunking (reuses existing layout_contextual for failed batches)
# ─────────────────────────────────────────────────────────────────────────────


def _fallback_chunks_for_batch(batch_text, start_page, end_page, base_metadata):
    """
    Simple fallback: split by double newlines and create basic chunks.
    Used when Gemini fails for a batch.
    """
    paragraphs = [p.strip() for p in batch_text.split("\n\n") if p.strip() and len(p.strip()) > 30]
    chunks = []

    # Merge small paragraphs into ~800 char chunks
    buffer = ""
    for para in paragraphs:
        if len(buffer) + len(para) > 800 and buffer:
            chunks.append({
                "section_heading": "General Information",
                "subsection_heading": "General Information",
                "text": buffer.strip(),
                "start_page": start_page,
                "end_page": end_page,
            })
            buffer = para + "\n\n"
        else:
            buffer += para + "\n\n"

    if buffer.strip():
        chunks.append({
            "section_heading": "General Information",
            "subsection_heading": "General Information",
            "text": buffer.strip(),
            "start_page": start_page,
            "end_page": end_page,
        })

    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# Main entry point
# ─────────────────────────────────────────────────────────────────────────────


def process_pdf_llm_semantic(pdf_path, base_metadata, max_pages=None):
    """
    LLM-based semantic chunking using Vertex AI Gemini.

    Args:
        pdf_path: Path to the PDF file.
        base_metadata: Dict with brand, car_model, car_year_start, car_year_end,
                       supported_years, source_file.
        max_pages: Optional maximum number of pages to process (useful for skipping indices).

    Returns:
        List of chunk documents compatible with MongoDB ingestion.
    """
    _logger.info(f"LLM semantic chunking: {pdf_path}")

    # Step 1: Extract pages
    pages = _extract_pages(pdf_path, max_pages=max_pages)
    _logger.info(f"  Extracted {len(pages)} non-empty pages")

    # Step 2: Batch pages
    batches = _batch_pages(pages, max_chars=4000)
    _logger.info(f"  Created {len(batches)} page batches")

    # Step 3: Process each batch through Gemini
    all_raw_chunks = []
    failed_batches = 0

    for batch_idx, (start_page, end_page, batch_text) in enumerate(batches, 1):
        _logger.info(f"  Processing batch {batch_idx}/{len(batches)} (pages {start_page}-{end_page})")

        llm_chunks = _call_gemini_chunker(batch_text, start_page, end_page)

        if llm_chunks is None:
            # Fallback
            fallback = _fallback_chunks_for_batch(batch_text, start_page, end_page, base_metadata)
            all_raw_chunks.extend(fallback)
            failed_batches += 1
            _logger.warning(f"  Batch {batch_idx}: Fallback produced {len(fallback)} chunks")
        else:
            all_raw_chunks.extend(llm_chunks)
            _logger.info(f"  Batch {batch_idx}: LLM produced {len(llm_chunks)} chunks")

    _logger.info(f"  Total raw chunks: {len(all_raw_chunks)} ({failed_batches} fallback batches)")

    # Step 4: Apply semantic overlap
    all_raw_chunks = _apply_semantic_overlap(all_raw_chunks, overlap_pct=0.30)

    # Step 5: Build final chunk documents (same format as layout_contextual)
    final_chunks = []
    for chunk_id, raw in enumerate(all_raw_chunks, 1):
        section = raw.get("section_heading", "General Information")
        subsection = raw.get("subsection_heading", "General Information")
        chunk_text = raw["text"]
        start_pg = raw.get("start_page", 1)

        # Prepend contextual metadata block (same as layout_contextual)
        context = (
            f"Brand: {base_metadata['brand']}, Model: {base_metadata['car_model']}, "
            f"Year: {base_metadata['car_year_start']}-{base_metadata['car_year_end']}\n"
            f"Section: {section}\n"
            f"Subsection: {subsection}\n\n"
        )

        chunk_doc = {
            "brand": base_metadata["brand"],
            "car_model": base_metadata["car_model"],
            "car_year_start": base_metadata["car_year_start"],
            "car_year_end": base_metadata["car_year_end"],
            "supported_years": base_metadata["supported_years"],
            "source_file": base_metadata["source_file"],
            "page_number": start_pg,
            "section_heading": section,
            "subsection_heading": subsection,
            "chunk_heading": subsection,  # Consistent with layout_contextual
            "chunk_id": chunk_id,
            "text": context + chunk_text,
        }
        final_chunks.append(chunk_doc)

    _logger.info(
        f"  Final: {len(final_chunks)} chunks "
        f"(avg {sum(len(c['text']) for c in final_chunks) // max(len(final_chunks), 1)} chars/chunk)"
    )

    return final_chunks
