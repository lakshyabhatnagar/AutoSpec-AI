import fitz
import re
from collections import Counter
from langchain_text_splitters import RecursiveCharacterTextSplitter

def get_base_font_size(doc, max_pages=10):
    """Samples the PDF to find the most common font size (representing body text)."""
    sizes = []
    for page in doc[:max_pages]:
        page_dict = page.get_text("dict")
        for block in page_dict.get("blocks", []):
            if block.get("type") == 0:
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span["text"].strip()
                        # Only sample meaningful text strings (e.g., standard body text length)
                        if len(text) > 15:
                            sizes.append(round(span["size"], 1))
    if sizes:
        return Counter(sizes).most_common(1)[0][0]
    return 10.0 # Standard fallback

def process_pdf_layout(pdf_path, base_metadata):
    """
    Structure-aware contextual chunking using PyMuPDF layout metadata.
    Detects typography hierarchy to avoid excessive per-chunk LLM calls.
    """
    doc = fitz.open(pdf_path)
    base_size = get_base_font_size(doc)

    # Fallback recursive chunker used strictly inside extremely large structural blocks
    splitter = RecursiveCharacterTextSplitter(
        separators=["\nWARNING", "\nCAUTION", "\nNOTE", "\n\n", r"\n[0-9]+\.", "\n", " ", ""],
        chunk_size=1200, 
        chunk_overlap=600,
        is_separator_regex=True
    )

    chunks = []
    chunk_id = 1

    current_sec = "General Information"
    current_subsec = "General Information"
    
    buffer_text = ""
    buffer_page = 1

    def flush_buffer():
        nonlocal buffer_text, chunks, chunk_id, current_sec, current_subsec, buffer_page
        if not buffer_text.strip():
            return
        
        # Split accumulated sections recursively ONLY if they grew too large
        text_splits = splitter.split_text(buffer_text.strip())
        
        for split_text in text_splits:
            if len(split_text.strip()) < 20: 
                continue
            
            # Reattach layout-detected organizational headers contextually
            context = (
                f"Brand: {base_metadata['brand']}, Model: {base_metadata['car_model']}, Year: {base_metadata['car_year_start']}-{base_metadata['car_year_end']}\n"
                f"Section: {current_sec}\n"
                f"Subsection: {current_subsec}\n\n"
            )
            
            chunk_doc = {
                "brand": base_metadata["brand"],
                "car_model": base_metadata["car_model"],
                "car_year_start": base_metadata["car_year_start"],
                "car_year_end": base_metadata["car_year_end"],
                "supported_years": base_metadata["supported_years"],
                "source_file": base_metadata["source_file"],
                "page_number": buffer_page,
                "section_heading": current_sec,
                "subsection_heading": current_subsec,
                "chunk_heading": current_subsec, # Reuse subsection to significantly optimize LLM calls
                "chunk_id": chunk_id,
                "text": context + split_text,
            }
            chunks.append(chunk_doc)
            chunk_id += 1
            
        buffer_text = ""

    # Standard manual numbering e.g., "3.2 Battery" or "1 Engine"
    num_header_pattern = re.compile(r"^[0-9]+(\.[0-9]+)*\s+[A-Z]")

    for page_num, page in enumerate(doc, 1):
        if not buffer_text.strip():
            buffer_page = page_num

        blocks = page.get_text("dict").get("blocks", [])
        for block in blocks:
            if block.get("type") != 0:
                continue # Skip images/graphics

            block_text = ""
            max_size = 0.0
            is_bold_block = False
            
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span["text"].strip()
                    if not text: 
                        continue
                        
                    sz = round(span["size"], 1)
                    max_size = max(max_size, sz)
                    
                    font_flags = span.get("flags", 0)
                    font_name = span.get("font", "").lower()
                    
                    # Layout signal: Detect boldly weighted text
                    if "bold" in font_name or "black" in font_name or (font_flags & 2 ** 4):
                        is_bold_block = True
                    
                    block_text += span["text"] + " "
                block_text = block_text.strip() + "\n"
                
            block_text = block_text.strip()
            if not block_text: 
                continue

            # Heading Detection Rules (Typography inference)
            is_heading = False
            level = 2
            
            # Massive font sizes denote top-level Chapters/Sections
            if max_size >= base_size + 2.0:
                is_heading = True
                level = 1
            # Moderately larger sizes denote Subsections
            elif max_size >= base_size + 0.8:
                is_heading = True
                level = 2
            # Bolded solitary lines denote lower-level Subsections
            elif is_bold_block and len(block_text) < 80 and block_text.count("\n") == 0:
                is_heading = True
                level = 2
            # All caps solitary blocks
            elif block_text.isupper() and 5 < len(block_text) < 60 and block_text.count("\n") == 0:
                is_heading = True
                level = 2
            # Standard procedural index e.g., "3.2 General"
            elif num_header_pattern.match(block_text) and len(block_text) < 80:
                is_heading = True
                level = 2

            # Isolate critical alerts contextually
            if block_text.startswith("WARNING") or block_text.startswith("CAUTION"):
                flush_buffer()
                buffer_page = page_num
                buffer_text += block_text + "\n\n"
            # Flush on confirmed pure headings
            elif is_heading and "\n" not in block_text:
                flush_buffer()
                clean_header = re.sub(r'\s+', ' ', block_text).strip()
                if level == 1:
                    current_sec = clean_header
                    current_subsec = clean_header
                else:
                    current_subsec = clean_header
                buffer_page = page_num
            else:
                if not buffer_text.strip():
                    buffer_page = page_num
                buffer_text += block_text + "\n\n"
                
                # Boundary break: Prevent excessive unchunked blocks bridging unrelated concepts
                if len(buffer_text) > 1500:
                    flush_buffer()

    flush_buffer() # Final extraction
    return chunks