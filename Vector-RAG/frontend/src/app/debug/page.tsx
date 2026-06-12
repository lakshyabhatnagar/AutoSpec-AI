"use client";

import { useState } from "react";
import { Bug, Database, LayoutGrid } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { postDebugRetrieve } from "@/services/api";
import { ChunkCard } from "@/components/ChunkCard";
import { HealthStatus } from "@/components/HealthStatus";
import { QueryModeSelector } from "@/components/QueryModeSelector";
import { RetrievalPipeline } from "@/components/RetrievalPipeline";
import { PageContainer, Surface } from "@/components/ui/layout";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { QueryForm } from "@/components/ui/QueryForm";
import type { DebugChunk, DebugRetrieveResponse, RetrievalMode } from "@/types/api";

export default function DebugPage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<RetrievalMode>("hybrid_rerank");
  const debugApi = useApi<DebugRetrieveResponse>();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    await debugApi.execute(() => postDebugRetrieve({ query: input, mode }));
  };

  return (
    <PageContainer className="max-w-none bg-[radial-gradient(circle_at_76%_24%,rgba(14,165,183,0.18),transparent_31%),radial-gradient(circle_at_18%_76%,rgba(244,246,248,0.06),transparent_34%),linear-gradient(135deg,#0B1220,#101827_48%,#0b1220)]">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <Surface className="shrink-0 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-300/10 text-amber-300 shadow-[0_0_22px_rgba(252,211,77,0.14)]">
                <Bug className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">Retrieval trace</h2>
                <p className="text-xs font-semibold text-zinc-500">Stages, scores, status.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <HealthStatus />
              <QueryModeSelector value={mode} onChange={setMode} />
            </div>
          </div>
        </Surface>

        <QueryForm
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          loading={debugApi.loading}
          tone="debug"
          icon="search"
          placeholder="Enter query to trace retrieval"
        />

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-4 pb-3">
            {!debugApi.data && !debugApi.loading && !debugApi.error && (
              <EmptyState
                icon={Database}
                title="No trace yet"
                description="Run a query to inspect retrieval."
                className="min-h-[360px]"
              />
            )}

            {debugApi.loading && <LoadingState label="Tracing pipeline execution..." />}
            {debugApi.error && <ErrorState message={debugApi.error} />}

            {debugApi.data && !debugApi.loading && (
              <div className="space-y-4">
                <Surface className="p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-zinc-500" />
                      <h3 className="text-sm font-semibold text-zinc-100">Pipeline Flow</h3>
                    </div>
                    {debugApi.latencyMs !== null && (
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-xs text-zinc-500">
                        {debugApi.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <RetrievalPipeline data={debugApi.data} />
                </Surface>

                {debugApi.data.chunks?.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase text-zinc-500">
                      <Database className="h-4 w-4" />
                      Final Ranked Chunks ({debugApi.data.chunks.length})
                    </div>
                    <div className="space-y-2">
                      {debugApi.data.chunks.map((chunk: DebugChunk, index: number) => (
                        <ChunkCard key={index} chunk={chunk} isDebug />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
