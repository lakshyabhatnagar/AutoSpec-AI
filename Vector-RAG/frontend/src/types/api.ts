/* ── TypeScript interfaces mirroring FastAPI Pydantic schemas ── */

export type RetrievalMode = "semantic" | "bm25" | "hybrid" | "hybrid_rerank";

/* ── Request Types ── */
export interface QueryRequest {
  query: string;
  mode?: RetrievalMode;
  brand_filter?: string | null;
  model_filter?: string | null;
  k?: number;
}

export interface CriticalQueryRequest {
  query: string;
  brand_filter?: string | null;
  model_filter?: string | null;
  k?: number;
}

export interface DebugRetrieveRequest {
  query: string;
  mode?: RetrievalMode;
  brand_filter?: string | null;
  model_filter?: string | null;
  k?: number;
}

export interface EvaluateRequest {
  dataset?: string;
  mode?: RetrievalMode;
  run_name?: string;
}

export interface FeatureExtractRequest {
  start_index?: number;
}

/* ── Response Types ── */
export interface ChunkMetadata {
  doc_uri?: string | null;
  brand?: string | null;
  model?: string | null;
  years?: string | null;
  section?: string | null;
  subsection?: string | null;
  page?: string | number | null;
  score?: number | null;
  chunk_id?: string | number | null;
  is_feature_record?: boolean;
  structured_data?: any;
}

export interface RetrievedChunk {
  page_content: string;
  metadata: ChunkMetadata;
}

export interface QueryResponse {
  answer: string;
  mode: string;
  retrieved_chunks: RetrievedChunk[];
  chunk_count: number;
}

export interface CriticalQueryResponse {
  answer: string;
  is_critical: boolean;
  category: string | null;
  retrieved_chunks: RetrievedChunk[];
  chunk_count: number;
  ui_card?: any;
}

export interface DebugChunk {
  page_content: string;
  metadata: ChunkMetadata;
  retrieval_source: string;
  rrf_score: number | null;
  reranker_score: number | null;
}

export interface DebugRetrieveResponse {
  query: string;
  mode: string;
  is_critical: boolean;
  category: string | null;
  dense_count: number;
  bm25_count: number;
  feature_store_count: number;
  fused_count: number;
  final_count: number;
  chunks: DebugChunk[];
}

export interface HealthResponse {
  mongodb: string;
  vertex_ai: string;
  mlflow: string;
}

export interface EvaluateResponse {
  status: string;
  run_name: string;
  run_id?: string | null;
  metrics?: Record<string, number> | null;
  error?: string | null;
}

export interface FeatureExtractResponse {
  status: string;
  message: string;
}

export interface IngestResponse {
  status: string;
  message: string;
}
