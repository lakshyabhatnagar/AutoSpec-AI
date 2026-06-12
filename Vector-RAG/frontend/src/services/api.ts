/* ── Centralized API client for all FastAPI endpoints ── */
import type {
  QueryRequest, QueryResponse,
  CriticalQueryRequest, CriticalQueryResponse,
  DebugRetrieveRequest, DebugRetrieveResponse,
  EvaluateRequest, EvaluateResponse,
  FeatureExtractRequest, FeatureExtractResponse,
  HealthResponse, IngestResponse,
  PdfUploadIngestResponse,
  AuthResponse,
  ChatMessage,
  ChatSession,
  ChatSessionDetail,
  User,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  latencyMs: number;
}

const TOKEN_KEY = "autospec_auth_token";

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, options?: RequestInit, auth = false): Promise<ApiResult<T>> {
  const start = performance.now();
  try {
    const headers = new Headers(options?.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (auth) {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
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

export function postSignup(req: { name: string; email: string; password: string }) {
  return apiFetch<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify(req) });
}

export function postLogin(req: { email: string; password: string }) {
  return apiFetch<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(req) });
}

export function fetchMe() {
  return apiFetch<User>("/auth/me", { method: "GET" }, true);
}

export function postLogout() {
  return apiFetch<{ status: string }>("/auth/logout", { method: "POST" }, true);
}

export function createChatSession(title?: string) {
  return apiFetch<ChatSession>("/chat-sessions", { method: "POST", body: JSON.stringify({ title }) }, true);
}

export function fetchChatSessions() {
  return apiFetch<ChatSession[]>("/chat-sessions", { method: "GET" }, true);
}

export function fetchChatSession(sessionId: string) {
  return apiFetch<ChatSessionDetail>(`/chat-sessions/${sessionId}`, { method: "GET" }, true);
}

export function saveChatMessage(sessionId: string, req: { role: "user" | "assistant" | "system"; content: string; metadata?: Record<string, unknown> }) {
  return apiFetch<ChatMessage>(`/chat-sessions/${sessionId}/messages`, { method: "POST", body: JSON.stringify(req) }, true);
}

export function deleteChatSession(sessionId: string) {
  return apiFetch<{ status: string }>(`/chat-sessions/${sessionId}`, { method: "DELETE" }, true);
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

export function uploadPdfManual(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ApiResult<PdfUploadIngestResponse>> {
  const start = performance.now();
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const path = `/ingest/upload-pdf?filename=${encodeURIComponent(file.name)}`;
    xhr.open("POST", `${API_BASE}${path}`);
    xhr.setRequestHeader("Content-Type", "application/pdf");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.min(90, Math.round((event.loaded / event.total) * 90)));
    };

    xhr.onload = () => {
      const latencyMs = Math.round(performance.now() - start);
      if (xhr.status < 200 || xhr.status >= 300) {
        resolve({ data: null, error: `HTTP ${xhr.status}: ${xhr.responseText}`, latencyMs });
        return;
      }

      try {
        onProgress?.(100);
        resolve({ data: JSON.parse(xhr.responseText) as PdfUploadIngestResponse, error: null, latencyMs });
      } catch {
        resolve({ data: null, error: "Invalid upload response", latencyMs });
      }
    };

    xhr.onerror = () => {
      const latencyMs = Math.round(performance.now() - start);
      resolve({ data: null, error: "Upload failed", latencyMs });
    };

    xhr.send(file);
  });
}
