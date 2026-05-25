import json
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Setup the OpenAI client for OpenRouter
openrouter_api_key = os.environ.get("OPENROUTER_API_KEY")
if not openrouter_api_key:
    # Use a dummy key if not set, to allow module import, but it will fail on call
    openrouter_api_key = "dummy_key"

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=openrouter_api_key
)

def get_chunk_metadata(chunk_text, raw_heading=""):
    """
    Uses OpenRouter's API (Owl Alpha model) to generate a chunk heading 
    and clean up the subsection heading.
    """
    prompt = f"""
Analyze the following excerpt from a car manual.
Raw heading context: {raw_heading}

Chunk text: {chunk_text}

Provide:
1. chunk_heading: A single, short, and accurate section heading (maximum 3 words) describing the chunk.
2. subsection_heading: A cleaned up version of the raw heading context (if it's long, simplify it). If raw heading is missing, derive a brief subsection heading.

Return ONLY a JSON object:
{{
    "chunk_heading": "...",
    "subsection_heading": "..."
}}
"""
    if client.api_key == "dummy_key":
        print("Warning: OPENROUTER_API_KEY environment variable not set.")
        return "General Information", "General Information"

    try:
        response = client.chat.completions.create(
            model="poolside/laguna-xs.2:free",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates concise section headings. Respond ONLY with valid JSON formatting."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        content = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return data.get("chunk_heading", "General Information"), data.get("subsection_heading", "General Information")
    except Exception as e:
        print(f"LLM Metadata extraction failed: {e}")
        return "General Information", "General Information"
