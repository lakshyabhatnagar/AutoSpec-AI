import argparse
import re
from typing import List
import mlflow
from mlflow.entities import Document
from rank_bm25 import BM25Okapi

try:
    from sentence_transformers import CrossEncoder
    _reranker = CrossEncoder('BAAI/bge-reranker-base')
    _reranker_available = True
    print("CrossEncoder model initialized.")
except ImportError:
    _reranker_available = False
    print("Warning: sentence-transformers not installed. Reranking disabled.")

from utils.embeddings import generate_embedding
from utils.mongodb import collection
from utils.test_generation import generate_final_response

def tokenize(text):
    return re.findall(r'\b\w+\b', text.lower())

print("Initializing BM25 Index from MongoDB...")
_all_docs = list(collection.find({}, {
    "text": 1, "source_file": 1, "chunk_id": 1, "brand": 1, 
    "car_model": 1, "car_year_start": 1, "car_year_end": 1, 
    "supported_years": 1, "section_heading": 1, 
    "subsection_heading": 1, "page_number": 1
}))

_bm25_corpus = []
for doc in _all_docs:
    section = doc.get("section_heading", "")
    subsection = doc.get("subsection_heading", "")
    content = doc.get("text", "")
    full_text = f"Section: {section}\nSubsection: {subsection}\nContent: {content}"
    _bm25_corpus.append(tokenize(full_text))

_bm25 = BM25Okapi(_bm25_corpus, k1=1.5, b=0.75)
print(f"BM25 Index initialized with {len(_all_docs)} chunks.")

TEST_CASES = [
    {
        "question": "How can the driver adjust the instrument cluster illumination settings?",
        "expected_keywords": [
            "illumination",
            "UP",
            "DOWN",
            "SET"
        ],
        "brand_filter": "Tata",
        "model_filter": "Nexon"
    },
    {
        "question": "What is the recommended tyre pressure?",
        "expected_keywords": [
            "tyre",
            "pressure",
            "psi",
            "bar"
        ],
        "brand_filter": "Tata",
        "model_filter": "Nexon"
    }
]

@mlflow.trace(span_type="RETRIEVER")
def search_vector_db(query, k=5, brand_filter=None, model_filter=None) -> List[Document]:
    """
    Performs hybrid retrieval using MongoDB Atlas vector search (dense) 
    and BM25 (sparse), combining results with Reciprocal Rank Fusion (RRF).
    Optionally applies a Cross-Encoder reranker.
    Returns List[Document] so the RETRIEVER span output contains
    page_content keys that MLflow scorers can parse.
    """
    dense_k = 15
    bm25_k = 3
    fusion_k = 15
    final_k = 5
    numCandidates = 800
    BM25_SCORE_THRESHOLD = 1.5
    DENSE_WEIGHT = 1.5
    BM25_WEIGHT = 0.2
    RRF_K = 100
    USE_RERANKER = True
    
    mlflow.set_tag("retrieval_k", final_k)
    mlflow.log_params({
        "retrieval_mode": "hybrid_rerank" if (USE_RERANKER and _reranker_available) else "hybrid",
        "dense_k": dense_k,
        "bm25_k": bm25_k,
        "fusion_k": fusion_k,
        "final_k": final_k,
        "reranker_model": "BAAI/bge-reranker-base" if (USE_RERANKER and _reranker_available) else "None",
        "numCandidates": numCandidates,
        "dense_weight": DENSE_WEIGHT,
        "bm25_weight": BM25_WEIGHT
    })
    
    # 1. DENSE RETRIEVAL (MongoDB Atlas Vector Search)
    query_embedding = generate_embedding(query)
    
    vector_search = {
        "index": "vector_index",
        "path": "embedding",
        "queryVector": query_embedding,
        "numCandidates": numCandidates,
        "limit": dense_k
    }
    
    if brand_filter or model_filter:
        vector_search["filter"] = {}
        if brand_filter:
            vector_search["filter"]["brand"] = brand_filter
        if model_filter:
            vector_search["filter"]["car_model"] = model_filter

    pipeline = [
        {
            "$vectorSearch": vector_search
        },
        {
            "$project": {
                "text": 1, "source_file": 1, "chunk_id": 1, "brand": 1,
                "car_model": 1, "car_year_start": 1, "car_year_end": 1,
                "supported_years": 1, "section_heading": 1,
                "subsection_heading": 1, "page_number": 1
            }
        }
    ]

    try:
        dense_results = list(collection.aggregate(pipeline))
    except Exception as e:
        print(f"Error executing vector search: {e}")
        dense_results = []

    # 2. SPARSE RETRIEVAL (BM25)
    tokenized_query = tokenize(query)
    bm25_scores = _bm25.get_scores(tokenized_query)
    
    sparse_candidates = []
    for idx, doc in enumerate(_all_docs):
        # Apply metadata filters (case-insensitive)
        if brand_filter and str(doc.get("brand", "")).lower() != str(brand_filter).lower():
            continue
        if model_filter and str(doc.get("car_model", "")).lower() != str(model_filter).lower():
            continue
            
        score = bm25_scores[idx]
        if score >= BM25_SCORE_THRESHOLD:
            sparse_candidates.append((doc, score))
            
    # Sort and take top bm25_k
    sparse_candidates.sort(key=lambda x: x[1], reverse=True)
    sparse_results = [doc for doc, _ in sparse_candidates[:bm25_k]]

    # 3. RECIPROCAL RANK FUSION (RRF)
    rrf_scores = {}
    doc_map = {}
    
    def get_doc_id(res):
        return f"{res.get('source_file')}_{res.get('chunk_id')}_{res.get('page_number')}"
        
    for rank, res in enumerate(dense_results, 1):
        doc_id = get_doc_id(res)
        doc_map[doc_id] = res
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + DENSE_WEIGHT * (1.0 / (RRF_K + rank))
        
    for rank, res in enumerate(sparse_results, 1):
        doc_id = get_doc_id(res)
        doc_map[doc_id] = res
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + BM25_WEIGHT * (1.0 / (RRF_K + rank))
        
    # Sort fused results by RRF score descending
    fused_docs = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    
    # 4. LIGHTWEIGHT DEDUPLICATION & RERANKING PREPARATION
    fusion_candidates = []
    seen_sections = {}
    
    for doc_id, rrf_score in fused_docs:
        res = doc_map[doc_id]
        
        # Deduplication key based on source and section structure
        section_key = (
            res.get("source_file", ""), 
            res.get("section_heading", ""), 
            res.get("subsection_heading", "")
        )
        
        if seen_sections.get(section_key, 0) >= 2:
            continue  # Skip if we already have 2 chunks from this exact section
            
        seen_sections[section_key] = seen_sections.get(section_key, 0) + 1
        fusion_candidates.append((res, rrf_score))
        
        if len(fusion_candidates) >= fusion_k:
            break
            
    # 5. CROSS-ENCODER RERANKING (Optional)
    if USE_RERANKER and _reranker_available and fusion_candidates:
        pairs = [(query, res.get("text", "")) for res, _ in fusion_candidates]
        rerank_scores = _reranker.predict(pairs)
        
        # Attach new scores and sort
        reranked_candidates = []
        for i, (res, _) in enumerate(fusion_candidates):
            reranked_candidates.append((res, float(rerank_scores[i])))
            
        reranked_candidates.sort(key=lambda x: x[1], reverse=True)
        final_candidates = reranked_candidates[:final_k]
    else:
        final_candidates = fusion_candidates[:final_k]

    # 6. FORMAT OUTPUT
    mlflow_docs = []
    for res, final_score in final_candidates:
        mlflow_docs.append(
            Document(
                page_content=res.get("text", ""),
                metadata={
                    "doc_uri": res.get("source_file", ""),
                    "brand": res.get("brand"),
                    "model": res.get("car_model"),
                    "years": f"{res.get('car_year_start')}-{res.get('car_year_end')}",
                    "section": res.get("section_heading"),
                    "subsection": res.get("subsection_heading"),
                    "page": res.get("page_number"),
                    "score": final_score,
                    "chunk_id": res.get("chunk_id")
                }
            )
        )
        
    return mlflow_docs

def evaluate_chunk(doc, expected_keywords):
    """
    Checks how many expected keywords appear in the retrieved Document.
    """
    text_lower = doc.page_content.lower()
    matches = sum(1 for keyword in expected_keywords if keyword.lower() in text_lower)
    return matches, len(expected_keywords)

def print_chunk(rank, doc, matches=None, total_keywords=None):
    """
    Pretty-prints a retrieved Document.
    """
    meta = doc.metadata or {}
    score = meta.get("score", 0.0)
    brand = meta.get("brand", "Unknown")
    model = meta.get("model", "Unknown")
    year_str = meta.get("years", "Unknown")
    
    section = meta.get("section", "Unknown")
    subsection = meta.get("subsection", "Unknown")
    page = meta.get("page", "Unknown")
    text = doc.page_content

    print("\n" + "="*50)
    print(f"Rank: {rank}")
    if isinstance(score, (int, float)):
        print(f"Score: {score:.4f}")
    else:
        print(f"Score: {score}")
    if matches is not None and total_keywords is not None:
        print(f"Keyword Matches: {matches}/{total_keywords}")
    print()
    print(f"Brand: {brand}")
    print(f"Model: {model}")
    print(f"Years: {year_str}")
    print()
    print(f"Section: {section}")
    print(f"Subsection: {subsection}")
    print()
    print(f"Page: {page}")
    print()
    print("Chunk:")
    print(text.strip())
    print("="*50)

def interactive_mode():
    """
    Interactive loop for manual query entry and inspection.
    """
    print("\n--- Interactive Query Mode ---")
    print("Type 'exit' to quit.")
    
    while True:
        query = input("\nEnter query: ")
        if query.lower() in ['exit', 'quit']:
            break
            
        print("\nSearching...")
        results = search_vector_db(query, k=5)
        final_answer = generate_final_response(query, results)
        print("\nFINAL ANSWER:\n")
        print(final_answer)
        
        if not results:
            print("No results found.")
            continue
            
        for i, doc in enumerate(results, 1):
            print_chunk(i, doc)

def batch_mode():
    """
    Iterates through predefined TEST_CASES, evaluates keywords, and displays RR metrics.
    """
    print("\n--- Batch Evaluation Mode ---")
    
    total_mrr = 0.0
    
    for case_idx, case in enumerate(TEST_CASES, 1):
        question = case["question"]
        expected_keywords = case["expected_keywords"]
        brand_filter = case.get("brand_filter")
        model_filter = case.get("model_filter")
        
        print(f"\nEvaluating Test Case #{case_idx}:")
        print(f"Question: {question}")
        print(f"Expected Keywords: {expected_keywords}")
        
        results = search_vector_db(
            query=question, 
            k=5, 
            brand_filter=brand_filter, 
            model_filter=model_filter
        )
        
        first_relevant_rank = None
        best_hit_chunk = None
        best_matches = 0
        
        if not results:
            print("  -> No results returned.")
            continue
            
        for rank, doc in enumerate(results, 1):
            matches, total = evaluate_chunk(doc, expected_keywords)
            print_chunk(rank, doc, matches, total)
            
            # Simple heuristic: If it matches more than 50% of keywords, we count it as "relevant"
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

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test and Evaluate the RAG pipeline.")
    parser.add_argument("--mode", type=str, choices=["interactive", "batch"], default="interactive", help="Run mode: interactive or batch")
    args = parser.parse_args()

    if args.mode == "batch":
        batch_mode()
    else:
        interactive_mode()