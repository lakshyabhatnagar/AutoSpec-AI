/* ── Centralized API client for all FastAPI endpoints ── */
import type {
  QueryRequest, QueryResponse,
  CriticalQueryRequest, CriticalQueryResponse,
  DebugRetrieveRequest, DebugRetrieveResponse,
  EvaluateRequest, EvaluateResponse,
  FeatureExtractRequest, FeatureExtractResponse,
  HealthResponse, IngestResponse,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiResult<T> {
  data: T | null;
  error: string | null;
  latencyMs: number;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  const start = performance.now();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      const body = await res.text();
      return { data: null, error: `HTTP ${res.status}: ${body}`, latencyMs };
    }

    const data = (await res.json()) as T;
    return { data, error: null, latencyMs };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
      latencyMs,
    };
  }
}

/* ── Endpoint functions ── */
export function fetchHealth() {
  return apiFetch<HealthResponse>("/health");
}

export function postQuery(req: QueryRequest) {
  return apiFetch<QueryResponse>("/query", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function postCriticalQuery(req: CriticalQueryRequest) {
  return apiFetch<CriticalQueryResponse>("/query/critical", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function postDebugRetrieve(req: DebugRetrieveRequest) {
  return apiFetch<DebugRetrieveResponse>("/debug/retrieve", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function postEvaluate(req: EvaluateRequest) {
  return apiFetch<EvaluateResponse>("/evaluate", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function postFeatureExtract(req: FeatureExtractRequest) {
  return apiFetch<FeatureExtractResponse>("/feature-store/extract", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function postIngest() {
  return apiFetch<IngestResponse>("/ingest", { method: "POST" });
}
