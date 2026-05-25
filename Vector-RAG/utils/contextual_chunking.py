from langchain_text_splitters import RecursiveCharacterTextSplitter
from utils.llm_metadata import get_chunk_metadata

def split_into_contextual_chunks(pages, base_metadata):
    """
    Groups page text and splits it based on document structure.
    Adds contextual metadata and LLM-generated headings to each chunk.
    """
    
    # We want to chunk using document structure and avoid breaking instructions.
    # Recursive character text splitter with Markdown or common procedure patterns works best.
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=500,
        separators=[
            "\n\n",
            "\nWARNING",
            "\nCAUTION",
            "\nNOTE",
            r"\n[0-9]+\.", # Numbered lists
            "\n-",        # Bullet points
            "\n",
            ". ",
            " ",
            ""
        ],
        is_separator_regex=True
    )
    
    chunks = []
    chunk_id = 0
    
    for page in pages:
        text = page["text"]
        page_num = page["page_num"]
        raw_heading = page.get("heading", "General Information")
        
        # Split page into chunks
        page_chunks = splitter.split_text(text)
        
        for chunk_text in page_chunks:
            if not chunk_text.strip():
                continue
                
            chunk_heading, subsection_heading = get_chunk_metadata(chunk_text, raw_heading)
            
            # Format the text with contextual block for embeddings to grasp context better
            context_text = f"Brand: {base_metadata['brand']}, Model: {base_metadata['car_model']}, File: {base_metadata['source_file']}\n"
            context_text += f"Section: {raw_heading}\n"
            context_text += f"{chunk_heading}\n\n"
            context_text += chunk_text
            
            chunk_doc = {
                "brand": base_metadata["brand"],
                "car_model": base_metadata["car_model"],
                "car_year_start": base_metadata["car_year_start"],
                "car_year_end": base_metadata["car_year_end"],
                "supported_years": base_metadata["supported_years"],
                "source_file": base_metadata["source_file"],
                "page_number": page_num,
                "section_heading": raw_heading,
                "subsection_heading": subsection_heading,
                "chunk_heading": chunk_heading,
                "chunk_id": chunk_id,
                "text": context_text,
                # "embedding" will be added during ingestion layer
            }
            chunks.append(chunk_doc)
            chunk_id += 1
            
    return chunks
