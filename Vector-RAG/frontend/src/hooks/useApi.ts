"use client";
import { useState, useCallback } from "react";

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  latencyMs: number | null;
}

/**
 * Generic hook wrapping any async API call with loading, error, and latency state.
 */
export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: false,
    latencyMs: null,
  });

  const execute = useCallback(
    async (
      apiFn: () => Promise<{ data: T | null; error: string | null; latencyMs: number }>
    ) => {
      setState({ data: null, error: null, loading: true, latencyMs: null });
      const result = await apiFn();
      setState({
        data: result.data,
        error: result.error,
        loading: false,
        latencyMs: result.latencyMs,
      });
      return result;
    },
    []
  );

  return { ...state, execute };
}
