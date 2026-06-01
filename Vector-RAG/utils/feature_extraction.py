import os
import json
from google import genai
from dotenv import load_dotenv
from utils.mongodb import collection, feature_collection

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

EXTRACTION_PROMPT = """
You are an expert automotive data extraction pipeline.
Your job is to read the provided text chunk and determine if it contains high-precision factual data regarding ONE of the following Critical Categories:
1. Warranty
2. Maintenance Schedules
3. Inspection Schedules
4. Emergency Services
5. Malfunction of Parts
6. Safety and Security

If the text DOES NOT contain structured or highly factual critical data for these categories (e.g. it's just a general description), return:
{"records": []}

If it DOES, extract the information into structured records.
CRITICAL: For Maintenance Schedules and Inspection Schedules, the text often contains flattened tabular data (e.g., "I I R I R" or rows of intervals). YOU MUST RECONSTRUCT this into explicit individual records for EACH maintenance item/interval.
Do NOT just dump the raw OCR string. Create a distinct record mapping the item, interval, and action.

Every record MUST have a generated 'semantic_text' field that clearly and completely explains the record in natural language (e.g., "The generator drive belt should be inspected at 10,000 km and replaced at 30,000 km."). This field is crucial for later retrieval.

Return JSON matching this schema:
{
  "records": [
    {
      "category": "Maintenance Schedules",
      "criticality": "high",
      "retrieval_priority": 5,
      "semantic_text": "Natural language summary of this specific extracted fact.",
      ... (include any other relevant specific fields like maintenance_item, action, interval_km, symptoms, etc.)
    }
  ]
}
"""

def extract_features_from_chunk(chunk: dict):
    text = chunk.get("text", "")
    if not text.strip():
        return []
        
    try:
        response = _client.models.generate_content(
            model=EXTRACTION_MODEL,
            contents=f"Text Chunk:\n{text}\n\nExtract records:",
            config={
                "system_instruction": EXTRACTION_PROMPT,
                "temperature": 0.0,
                "response_mime_type": "application/json"
            }
        )
        
        result = json.loads(response.text)
        records = result.get("records", [])
        
        # Attach base chunk metadata to all extracted records
        for record in records:
            record["source_file"] = chunk.get("source_file")
            record["page_number"] = chunk.get("page_number")
            record["chunk_id"] = chunk.get("chunk_id")
            record["section_heading"] = chunk.get("section_heading")
            record["subsection_heading"] = chunk.get("subsection_heading")
            record["brand"] = chunk.get("brand")
            record["car_model"] = chunk.get("car_model")
            
        return records
    except Exception as e:
        print(f"Extraction failed for chunk {chunk.get('chunk_id')}: {e}")
        return []

def run_extraction_pipeline(start_index: int = 0):
    print("Starting Critical-Information Feature Extraction Pipeline...")
    all_chunks = list(collection.find({}))
    
    if start_index > 0:
        print(f"Resuming from chunk index {start_index}...")
        all_chunks_to_process = all_chunks[start_index:]
    else:
        all_chunks_to_process = all_chunks
        
    total_processed = start_index
    total_extracted = 0
    
    for idx, chunk in enumerate(all_chunks_to_process):
        print(f"Processing chunk {total_processed + 1}/{len(all_chunks)}...", end="\r")
        records = extract_features_from_chunk(chunk)
        
        if records:
            feature_collection.insert_many(records)
            total_extracted += len(records)
            
        total_processed += 1
        
    print(f"\nPipeline completed. Processed {total_processed} chunks. Extracted {total_extracted} critical records.")

if __name__ == "__main__":
    # You can change the start_index to resume from a specific chunk index if it crashes.
    # For example, to resume from chunk 540, set start_index=539.
    run_extraction_pipeline(start_index=1760)
