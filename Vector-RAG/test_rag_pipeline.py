"""
CLI client for testing the RAG pipeline via FastAPI endpoints.

Usage:
    python test_rag_pipeline.py                    # interactive mode (default)
    python test_rag_pipeline.py --mode batch       # batch keyword evaluation
    python test_rag_pipeline.py --mode debug       # debug retrieval introspection

Requires the FastAPI server to be running:
    uvicorn app.main:app --reload --port 8000
"""
import argparse
import json
import requests
import sys

API_BASE = "http://127.0.0.1:8000"

TEST_CASES = [
    {
        "question": "How can the driver adjust the instrument cluster illumination settings?",
        "expected_keywords": ["illumination", "UP", "DOWN", "SET"],
        "brand_filter": "Tata",
        "model_filter": "Nexon",
    },
    {
        "question": "What is the recommended tyre pressure?",
        "expected_keywords": ["tyre", "pressure", "psi", "bar"],
        "brand_filter": "Tata",
        "model_filter": "Nexon",
    },
]


def _check_server():
    try:
        r = requests.get(f"{API_BASE}/health", timeout=3)
        r.raise_for_status()
        return True
    except Exception:
        print("ERROR: FastAPI server is not running.")
        print("Start it with: uvicorn app.main:app --reload --port 8000")
        return False


def _query(query: str, mode: str = "hybrid_rerank", brand: str = None, model: str = None, k: int = 5) -> dict:
    payload = {"query": query, "mode": mode, "k": k}
    if brand:
        payload["brand_filter"] = brand
    if model:
        payload["model_filter"] = model
    r = requests.post(f"{API_BASE}/query", json=payload, timeout=120)
    r.raise_for_status()
    return r.json()


def _critical_query(query: str, brand: str = None, model: str = None, k: int = 5) -> dict:
    payload = {"query": query, "k": k}
    if brand:
        payload["brand_filter"] = brand
    if model:
        payload["model_filter"] = model
    r = requests.post(f"{API_BASE}/query/critical", json=payload, timeout=120)
    r.raise_for_status()
    return r.json()


def _debug_retrieve(query: str, mode: str = "hybrid_rerank", brand: str = None, model: str = None, k: int = 5) -> dict:
    payload = {"query": query, "mode": mode, "k": k}
    if brand:
        payload["brand_filter"] = brand
    if model:
        payload["model_filter"] = model
    r = requests.post(f"{API_BASE}/debug/retrieve", json=payload, timeout=120)
    r.raise_for_status()
    return r.json()


def print_chunk(rank: int, chunk: dict, matches: int = None, total_keywords: int = None):
    meta = chunk.get("metadata", {})
    score = meta.get("score", 0.0)

    print("\n" + "=" * 50)
    print(f"Rank: {rank}")
    if isinstance(score, (int, float)):
        print(f"Score: {score:.4f}")
    else:
        print(f"Score: {score}")
    if matches is not None and total_keywords is not None:
        print(f"Keyword Matches: {matches}/{total_keywords}")
    print()
    print(f"Brand: {meta.get('brand', 'Unknown')}")
    print(f"Model: {meta.get('model', 'Unknown')}")
    print(f"Years: {meta.get('years', 'Unknown')}")
    print()
    print(f"Section: {meta.get('section', 'Unknown')}")
    print(f"Subsection: {meta.get('subsection', 'Unknown')}")
    print()
    print(f"Page: {meta.get('page', 'Unknown')}")
    if meta.get("is_feature_record"):
        print("*** FEATURE STORE RECORD ***")
    print()
    print("Chunk:")
    print(chunk.get("page_content", "").strip())
    print("=" * 50)


def interactive_mode():
    print("\n--- Interactive Query Mode (via FastAPI) ---")
    print("Modes: query | critical | debug")
    print("Type 'exit' to quit.\n")

    while True:
        query = input("Enter query: ").strip()
        if query.lower() in ["exit", "quit"]:
            break

        mode_input = input("Mode [query/critical/debug] (default: query): ").strip().lower()
        if not mode_input:
            mode_input = "query"

        print("\nSearching...\n")

        try:
            if mode_input == "critical":
                result = _critical_query(query)
                print(f"Is Critical: {result['is_critical']}")
                print(f"Category: {result.get('category')}")
            elif mode_input == "debug":
                result = _debug_retrieve(query)
                print(f"Is Critical: {result['is_critical']}")
                print(f"Category: {result.get('category')}")
                print(f"Dense: {result['dense_count']} | BM25: {result['bm25_count']} | "
                      f"Feature Store: {result['feature_store_count']} | Final: {result['final_count']}")
            else:
                result = _query(query)

            print(f"\nFINAL ANSWER:\n")
            print(result.get("answer", "(no answer)"))

            chunks = result.get("retrieved_chunks", result.get("chunks", []))
            if not chunks:
                print("\nNo results found.")
            else:
                for i, chunk in enumerate(chunks, 1):
                    print_chunk(i, chunk)

        except requests.exceptions.RequestException as e:
            print(f"API error: {e}")

        print()


def batch_mode():
    print("\n--- Batch Evaluation Mode (via FastAPI) ---\n")

    total_mrr = 0.0

    for case_idx, case in enumerate(TEST_CASES, 1):
        question = case["question"]
        expected_keywords = case["expected_keywords"]

        print(f"Evaluating Test Case #{case_idx}:")
        print(f"Question: {question}")
        print(f"Expected Keywords: {expected_keywords}")

        try:
            result = _query(
                question,
                brand=case.get("brand_filter"),
                model=case.get("model_filter"),
            )
        except requests.exceptions.RequestException as e:
            print(f"  -> API error: {e}")
            continue

        chunks = result.get("retrieved_chunks", [])
        if not chunks:
            print("  -> No results returned.")
            continue

        first_relevant_rank = None
        best_hit_chunk = None
        best_matches = 0

        for rank, chunk in enumerate(chunks, 1):
            text_lower = chunk.get("page_content", "").lower()
            matches = sum(1 for kw in expected_keywords if kw.lower() in text_lower)
            total = len(expected_keywords)
            print_chunk(rank, chunk, matches, total)

            if matches >= (total / 2) and first_relevant_rank is None:
                first_relevant_rank = rank

            if matches > best_matches:
                best_matches = matches
                best_hit_chunk = rank

        print("\n--- Summary for Test Case ---")
        if first_relevant_rank:
            rr = 1.0 / first_relevant_rank
            print(f"First Relevant Chunk Rank (RR): {first_relevant_rank}")
            print(f"Reciprocal Rank (Score): {rr:.4f}")
            total_mrr += rr
        else:
            print("First Relevant Chunk Rank (RR): None (0.0)")

        print(f"Best Keyword Match Found: {best_matches}/{len(expected_keywords)} in Rank {best_hit_chunk or 'None'}")
        print("-" * 30)

    avg_mrr = total_mrr / len(TEST_CASES) if TEST_CASES else 0
    print(f"\nFinal Batch Average MRR (Mean Reciprocal Rank): {avg_mrr:.4f}")


def debug_mode():
    print("\n--- Debug Retrieval Mode (via FastAPI) ---")
    print("Type 'exit' to quit.\n")

    while True:
        query = input("Enter query: ").strip()
        if query.lower() in ["exit", "quit"]:
            break

        print("\nRunning debug retrieval...\n")

        try:
            result = _debug_retrieve(query)

            print(f"Query: {result['query']}")
            print(f"Mode: {result['mode']}")
            print(f"Is Critical: {result['is_critical']}")
            print(f"Category: {result.get('category')}")
            print(f"Dense Count: {result['dense_count']}")
            print(f"BM25 Count: {result['bm25_count']}")
            print(f"Feature Store Count: {result['feature_store_count']}")
            print(f"Fused Count: {result['fused_count']}")
            print(f"Final Count: {result['final_count']}")

            for i, chunk in enumerate(result.get("chunks", []), 1):
                meta = chunk.get("metadata", {})
                print(f"\n--- Chunk {i} ---")
                print(f"  Source: {chunk.get('retrieval_source')}")
                print(f"  RRF Score: {chunk.get('rrf_score')}")
                print(f"  Reranker Score: {chunk.get('reranker_score')}")
                print(f"  Final Score: {meta.get('score')}")
                print(f"  Feature Record: {meta.get('is_feature_record')}")
                print(f"  Section: {meta.get('section')} > {meta.get('subsection')}")
                print(f"  Text: {chunk.get('page_content', '')[:200]}...")

        except requests.exceptions.RequestException as e:
            print(f"API error: {e}")

        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test the RAG pipeline via FastAPI endpoints.")
    parser.add_argument(
        "--mode",
        type=str,
        choices=["interactive", "batch", "debug"],
        default="interactive",
        help="Run mode: interactive, batch, or debug",
    )
    args = parser.parse_args()

    if not _check_server():
        sys.exit(1)

    if args.mode == "batch":
        batch_mode()
    elif args.mode == "debug":
        debug_mode()
    else:
        interactive_mode()