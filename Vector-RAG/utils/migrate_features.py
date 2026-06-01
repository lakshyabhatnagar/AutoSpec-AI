import os
import json
from google import genai
from pydantic import ValidationError
from dotenv import load_dotenv

from app.db.mongodb import feature_collection, feature_collection_v2
from app.models.schemas import StructuredRecord

load_dotenv()

_creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
if _creds_path and not os.path.isabs(_creds_path):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(_creds_path)

_client = genai.Client(
    vertexai=True,
    project=os.environ.get("VERTEX_PROJECT", "ppp-v4"),
    location=os.environ.get("VERTEX_LOCATION", "us-central1")
)

EXTRACTION_MODEL = os.getenv("EXTRACTION_MODEL", "gemini-2.5-flash")

MIGRATION_PROMPT = """
You are migrating legacy unstructured automotive records into a strictly typed schema.
Read the legacy JSON record. Extract and normalize the data according to the schema.
CRITICAL RULES:
1. `severity` MUST be one of: LOW, MEDIUM, HIGH, CRITICAL (if applicable).
2. `action_code` MUST be one of: R (Replace), I (Inspect), C (Clean), L (Lubricate), T (Tighten), CHECK.
3. Keep `semantic_text` exactly as is, or clean it up if it's malformed OCR.
4. Numerical intervals (like interval_km) MUST be integers (e.g. 75000), not strings ("75,000 km").
"""

def migrate_record(legacy_record: dict) -> dict | None:
    # Remove MongoDB internal ID for clean processing
    legacy_id = legacy_record.pop("_id", None)
    
    try:
        response = _client.models.generate_content(
            model=EXTRACTION_MODEL,
            contents=f"Legacy Record:\n{json.dumps(legacy_record, indent=2)}\n\nMigrate to schema:",
            config={
                "system_instruction": MIGRATION_PROMPT,
                "temperature": 0.0,
                "response_mime_type": "application/json",
                "response_schema": StructuredRecord,
            }
        )
        
        migrated = json.loads(response.text)
        
        # Attach the metadata fields manually to ensure they aren't lost
        metadata_fields = ["source_file", "page_number", "chunk_id", "section_heading", "subsection_heading", "brand", "car_model"]
        for field in metadata_fields:
            if field in legacy_record:
                migrated[field] = legacy_record[field]
                
        return migrated
    except Exception as e:
        print(f"Migration failed for record {legacy_id}: {e}")
        return None

def run_migration():
    print("Starting Feature Store Migration (v1 -> v2)...")
    
    # We fetch all legacy records
    legacy_records = list(feature_collection.find({}))
    total_legacy = len(legacy_records)
    print(f"Found {total_legacy} legacy records.")
    
    # Check if v2 already has data to resume
    v2_count = feature_collection_v2.count_documents({})
    if v2_count > 0:
        print(f"Found {v2_count} records already in v2 collection. Resuming...")
        legacy_records = legacy_records[v2_count:]
        
    print(f"Records to migrate: {len(legacy_records)}")
    
    migrated_count = 0
    batch = []
    
    for i, record in enumerate(legacy_records):
        print(f"Migrating record {i + 1}/{len(legacy_records)}...", end="\r")
        migrated = migrate_record(record)
        
        if migrated:
            batch.append(migrated)
            
        # Write in small batches
        if len(batch) >= 20:
            feature_collection_v2.insert_many(batch)
            migrated_count += len(batch)
            batch = []
            
    # Final flush
    if batch:
        feature_collection_v2.insert_many(batch)
        migrated_count += len(batch)
        
    print(f"\nMigration completed. Inserted {migrated_count} strict schema records into feature_store_v2.")

if __name__ == "__main__":
    run_migration()
