import fitz

def extract_text_from_pdf(pdf_path):

    pages = []

    try:

        doc = fitz.open(pdf_path)
        toc = doc.get_toc()  # Format: [[level, title, page], ...]
        
        page_to_heading = {}
        current_hierarchy = {}  # Dictionary to track {level: title}
        
        toc_idx = 0
        for page_num in range(1, len(doc) + 1):
            
            # While there are TOC entries for the current page
            while toc_idx < len(toc) and toc[toc_idx][2] == page_num:
                level, title, _ = toc[toc_idx]
                current_hierarchy[level] = title
                
                # If we jump to a higher level (e.g., H2 -> H1), discard the stale sub-levels (H2, H3)
                stale_levels = [lvl for lvl in current_hierarchy.keys() if lvl > level]
                for lvl in stale_levels:
                    del current_hierarchy[lvl]
                    
                toc_idx += 1
                
            # Build the breadcrumb string (e.g., "Main Title > Sub Title > Sub Sub Title")
            if current_hierarchy:
                sorted_levels = sorted(current_hierarchy.keys())
                full_heading_path = " > ".join([current_hierarchy[l] for l in sorted_levels])
                page_to_heading[page_num] = full_heading_path
            else:
                page_to_heading[page_num] = "General Information"

        for page_num, page in enumerate(doc):
            
            p_num = page_num + 1
            text = page.get_text()

            if text.strip():
                pages.append({
                    "page_num": p_num,
                    "heading": page_to_heading.get(p_num, "General Information"),
                    "text": text
                })

    except Exception as e:

        print(f"PDF extraction failed: {pdf_path}")

        print(e)

    return pages