"use client";
import { useState } from "react";
import { Bug, Search, Loader2, Database, LayoutGrid } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { postDebugRetrieve } from "@/services/api";
import { ChunkCard } from "@/components/ChunkCard";
import { QueryModeSelector } from "@/components/QueryModeSelector";
import { RetrievalPipeline } from "@/components/RetrievalPipeline";
import type { RetrievalMode } from "@/types/api";

export default function DebugPage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<RetrievalMode>("hybrid_rerank");
  
  const debugApi = useApi<any>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await debugApi.execute(() => postDebugRetrieve({ query: input, mode }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-6xl mx-auto p-4 md:p-6">
      
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/80 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bug className="h-5 w-5 text-purple-400" /> Pipeline Debugger
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Introspect the retrieval flow, fusion, and scoring</p>
        </div>

        <QueryModeSelector value={mode} onChange={setMode} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative mb-6 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter query to trace retrieval..."
          className="w-full bg-zinc-900 border border-zinc-700/80 text-white rounded-xl pl-12 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-lg"
          disabled={debugApi.loading}
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
        <button 
          type="submit"
          disabled={debugApi.loading || !input.trim()}
          className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg transition-colors"
        >
          {debugApi.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </form>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        
        {/* Placeholder / Empty State */}
        {!debugApi.data && !debugApi.loading && (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Database className="h-6 w-6 text-zinc-600" />
            </div>
            <p>Run a query to visualize the retrieval pipeline.</p>
          </div>
        )}

        {/* Loading State */}
        {debugApi.loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            <p className="text-sm text-zinc-400 animate-pulse">Tracing pipeline execution...</p>
          </div>
        )}

        {/* Error State */}
        {debugApi.error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {debugApi.error}
          </div>
        )}

        {/* Results Area */}
        {debugApi.data && !debugApi.loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Pipeline Flow Visualization */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-zinc-500" /> Pipeline Flow
                </h3>
                {debugApi.latencyMs !== null && (
                  <span className="text-xs text-zinc-500 bg-black/40 px-2 py-1 rounded font-mono border border-zinc-800">
                    {debugApi.latencyMs}ms
                  </span>
                )}
              </div>
              <RetrievalPipeline data={debugApi.data} />
            </div>

            {/* Retrieved Context Chunks */}
            {debugApi.data.chunks?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Database className="h-4 w-4 text-zinc-500" />
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Final Ranked Chunks ({debugApi.data.chunks.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {debugApi.data.chunks.map((chunk: any, i: number) => (
                    <ChunkCard key={i} chunk={chunk} isDebug={true} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
