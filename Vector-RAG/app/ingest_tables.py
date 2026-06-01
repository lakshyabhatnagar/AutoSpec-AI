import os
import argparse
import time
import logging
import base64
import json
from pathlib import Path
from typing import List, Optional

import fitz  # PyMuPDF
from mistralai.client import Mistral
from pydantic import ValidationError

from app.models.table_schemas import TableDocument, TableType, NormalizedTableData
from app.config.settings import settings
from app.db.mongodb import sync_db

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("rag.ingest_tables")

# Keywords to identify target pages
TARGET_KEYWORDS = [
    "maintenance", "inspection", "service schedule", "recommended service",
    "warranty", "replacement interval", "inspection interval"
]

# Ensure table collection name
TABLE_COLLECTION_NAME = getattr(settings, "TABLE_COLLECTION", "tables-data")
tables_collection = sync_db[TABLE_COLLECTION_NAME]

class MistralRateLimiter:
    def __init__(self, rps_limit: float = 0.5, tpm_limit: int = 50000):
        self.rps_limit = rps_limit
        self.tpm_limit = tpm_limit
        self.last_request_time = 0.0
        self.total_requests = 0
        self.total_tokens = 0
        self.retry_count = 0

    def wait_if_needed(self):
        elapsed = time.time() - self.last_request_time
        wait_time = (1.0 / self.rps_limit) - elapsed
        if wait_time > 0:
            time.sleep(wait_time)
        self.last_request_time = time.time()

    def record_usage(self, tokens: int):
        self.total_requests += 1
        self.total_tokens += tokens
        
def contains_target_keywords(text: str) -> bool:
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in TARGET_KEYWORDS)

def extract_page_as_base64_pdf(doc: fitz.Document, page_num: int) -> str:
    new_doc = fitz.open()
    new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
    pdf_bytes = new_doc.write()
    base64_pdf = base64.b64encode(pdf_bytes).decode('utf-8')
    new_doc.close()
    return base64_pdf

def parse_with_mistral(
    client: Mistral, 
    raw_markdown: str, 
    rate_limiter: MistralRateLimiter,
    max_retries: int = 3
) -> List[NormalizedTableData]:
    """Uses a Mistral LLM to convert raw OCR markdown into structured NormalizedTableData."""
    prompt = f"""
You are an expert data extraction assistant.
Extract operational data from the following OCR markdown of a car manual table into structured JSON.
You MUST output a JSON object with a single key 'records' containing a list of objects that strictly match the NormalizedTableData schema.

Normalization rules for action codes:
R -> R (Replace)
I -> I (Inspect)
C -> C (Clean)
L -> L (Lubricate)
T -> T (Tighten)
Check -> CHECK
Adjust -> ADJUST

Return ONE semantically complete item per record (e.g. one for "Engine oil", one for "Coolant").
Do NOT dump the entire page as one record.

Markdown:
{raw_markdown}
"""
    
    schema = NormalizedTableData.model_json_schema()
    
    for attempt in range(max_retries):
        rate_limiter.wait_if_needed()
        try:
            response = client.chat.complete(
                model="mistral-large-latest",
                messages=[{"role": "user", "content": prompt}],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "ExtractionResponse",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "records": {
                                    "type": "array",
                                    "items": schema
                                }
                            },
                            "required": ["records"]
                        }
                    }
                }
            )
            rate_limiter.record_usage(response.usage.total_tokens)
            
            content = response.choices[0].message.content
            data = json.loads(content)
            
            records = []
            for item in data.get("records", []):
                try:
                    record = NormalizedTableData(**item)
                    records.append(record)
                except ValidationError as ve:
                    logger.warning(f"Validation error for record {item}: {ve}")
                    
            return records
            
        except Exception as e:
            rate_limiter.retry_count += 1
            logger.error(f"Error during structured extraction (Attempt {attempt+1}/{max_retries}): {e}")
            if "429" in str(e):
                time.sleep(10 + (2 ** attempt)) # Longer exponential backoff
            else:
                time.sleep(2.0)
    
    return []

def process_pdf(file_path: str, brand: str, model: str):
    logger.info(f"Starting Mistral OCR Table Ingestion for {file_path}")
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return

    mistral_api_key = os.environ.get("MISTRAL_API_KEY")
    if not mistral_api_key:
        logger.error("MISTRAL_API_KEY not found in environment variables.")
        return

    mistral_model = os.environ.get("MISTRAL_MODEL", "mistral-ocr-latest")
    client = Mistral(api_key=mistral_api_key)
    rate_limiter = MistralRateLimiter()

    doc = fitz.open(file_path)
    file_name = Path(file_path).name
    total_pages = len(doc)
    
    pages_scanned = 0
    pages_skipped = 0
    pages_processed = 0
    records_inserted = 0
    
    for page_index in range(total_pages):
        pages_scanned += 1
        page = doc[page_index]
        page_num = page_index + 1
        text = page.get_text()
        
        if not contains_target_keywords(text):
            pages_skipped += 1
            logger.debug(f"Skipping page {page_num} - no target keywords found.")
            continue
            
        logger.info(f"Target keywords found on page {page_num}. Extracting...")
        pages_processed += 1
        
        # 1. OCR via Mistral
        base64_pdf = extract_page_as_base64_pdf(doc, page_index)
        
        ocr_markdown = ""
        max_ocr_retries = 3
        for attempt in range(max_ocr_retries):
            rate_limiter.wait_if_needed()
            try:
                ocr_response = client.ocr.process(
                    model=mistral_model,
                    document={
                        "type": "document_url",
                        "document_url": f"data:application/pdf;base64,{base64_pdf}"
                    }
                )
                # Mistral OCR API does not return usage tokens in the same way, or at all.
                rate_limiter.record_usage(0)
                if ocr_response.pages:
                    ocr_markdown = ocr_response.pages[0].markdown
                break
            except Exception as e:
                rate_limiter.retry_count += 1
                logger.error(f"OCR Error on page {page_num} (Attempt {attempt+1}/{max_ocr_retries}): {e}")
                if "429" in str(e):
                    time.sleep(2 ** attempt)
                else:
                    time.sleep(1.0)
                    
        if not ocr_markdown:
            logger.warning(f"No OCR output obtained for page {page_num}. Skipping extraction.")
            continue
            
        # 2. Structured Extraction via Mistral LLM
        normalized_records = parse_with_mistral(client, ocr_markdown, rate_limiter)
        
        if not normalized_records:
            logger.warning(f"No valid structured records extracted from page {page_num}.")
            continue
            
        # 3. Determine TableType heuristically or default to unknown
        table_type = TableType.unknown
        text_lower = text.lower()
        if "maintenance" in text_lower or "service schedule" in text_lower:
            table_type = TableType.maintenance_schedule
        elif "inspection" in text_lower:
            table_type = TableType.inspection_schedule
        elif "warranty" in text_lower:
            table_type = TableType.warranty_table
            
        # 4. Save to MongoDB
        for record in normalized_records:
            doc_model = TableDocument(
                brand=brand,
                car_model=model,
                source_file=file_name,
                page_number=page_num,
                table_type=table_type,
                raw_ocr=ocr_markdown,
                normalized_data=record
            )
            
            try:
                tables_collection.insert_one(doc_model.model_dump())
                records_inserted += 1
            except Exception as e:
                logger.error(f"MongoDB insertion failed for page {page_num}: {e}")

    logger.info("==================================================")
    logger.info("INGESTION SUMMARY")
    logger.info("==================================================")
    logger.info(f"Pages Scanned:      {pages_scanned}")
    logger.info(f"Pages Skipped:      {pages_skipped}")
    logger.info(f"Pages Processed:    {pages_processed}")
    logger.info(f"Mistral Requests:   {rate_limiter.total_requests}")
    logger.info(f"Mistral Retries:    {rate_limiter.retry_count}")
    logger.info(f"Total Tokens Used:  {rate_limiter.total_tokens}")
    logger.info(f"Records Inserted:   {records_inserted}")
    logger.info("==================================================")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest operational tables from car manuals via Mistral OCR.")
    parser.add_argument("--file", required=True, help="Path to the PDF file")
    parser.add_argument("--brand", required=True, help="Brand of the car (e.g., 'maruti suzuki')")
    parser.add_argument("--model", required=True, help="Model of the car (e.g., 'VICTORIS')")
    
    args = parser.parse_args()
    process_pdf(args.file, args.brand, args.model)
