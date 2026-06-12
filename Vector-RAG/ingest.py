import os

from utils.pdf_utils import extract_text_from_pdf
from utils.metadata_extractor import extract_metadata
from utils.contextual_chunking import split_into_contextual_chunks
from utils.layout_contextual_chunking import process_pdf_layout
from utils.llm_semantic_chunking import process_pdf_llm_semantic
from utils.embeddings import generate_embedding
from utils.mongodb import collection

PDF_ROOT = "../Manuals"
TARGET_FILE = "Tiago_2025.pdf"
CHUNKING_MODE = "llm_semantic"  # Options: "contextual", "layout_contextual", "llm_semantic"

def ingest_manuals():
    for root, dirs, files in os.walk(PDF_ROOT):
        for file in files:
            if not file.endswith(".pdf"):
                continue
                
            if file != TARGET_FILE:
                continue

            # Skip duplicate PDFs
            existing = collection.find_one({"source_file": file})
            if existing:
                print(f"Skipping {file} - Already ingested.")
                continue

            pdf_path = os.path.join(root, file)
            print(f"\nProcessing: {pdf_path}")
            
            try:
                base_metadata = extract_metadata(pdf_path)
            except Exception as e:
                print(f"Skipping {file} due to metadata extraction failure: {e}")
                continue

            if CHUNKING_MODE == "llm_semantic":
                if file == "VICTORIS_2025.pdf":
                    chunks = process_pdf_llm_semantic(pdf_path, base_metadata, max_pages=663)
                else:
                    chunks = process_pdf_llm_semantic(pdf_path, base_metadata)
            elif CHUNKING_MODE == "layout_contextual":
                chunks = process_pdf_layout(pdf_path, base_metadata)
            else:
                pages = extract_text_from_pdf(pdf_path)
                chunks = split_into_contextual_chunks(pages, base_metadata)
            
            print(f"Chunks generated: {len(chunks)}")
            
            for chunk_doc in chunks:
                try:
                    # Generate embedding
                    embedding = generate_embedding(chunk_doc["text"])
                    chunk_doc["embedding"] = embedding
                    
                    # Insert immediately into MongoDB
                    collection.insert_one(chunk_doc)
                    print(f"Inserted chunk {chunk_doc['chunk_id']} from {file}")
                except Exception as e:
                    print(f"Chunk ingestion failed for {file} chunk_id {chunk_doc.get('chunk_id')}: {e}")

if __name__ == "__main__":
    ingest_manuals()
    print("\nIngestion completed.")
