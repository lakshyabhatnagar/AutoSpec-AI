"use client";
import { useState } from "react";
import { Send, Sparkles, Loader2, Database } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { postQuery, postCriticalQuery } from "@/services/api";
import { criticalResponseToSurface, queryResponseToSurface } from "@/services/a2ui-adapter";
import { A2UIRenderer } from "@/lib/a2ui-renderer";
import { ChunkCard } from "@/components/ChunkCard";
import { QueryModeSelector } from "@/components/QueryModeSelector";
import type { RetrievalMode } from "@/types/api";
import type { A2UISurface } from "@/types/a2ui";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [mode, setMode] = useState<RetrievalMode>("hybrid_rerank");
  
  const [surface, setSurface] = useState<A2UISurface | null>(null);
  const [chunks, setChunks] = useState<any[]>([]);

  const queryApi = useApi<any>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (isCritical) {
      const res = await queryApi.execute(() => postCriticalQuery({ query: input }));
      if (res.data) {
        setSurface(criticalResponseToSurface(res.data, input));
        setChunks(res.data.retrieved_chunks);
      }
    } else {
      const res = await queryApi.execute(() => postQuery({ query: input, mode }));
      if (res.data) {
        setSurface(queryResponseToSurface(res.data));
        setChunks(res.data.retrieved_chunks);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto p-4 md:p-6">
      
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" /> General Chat
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Ask anything about the automotive corpus</p>
        </div>

        <div className="flex items-center gap-4">
          {!isCritical && (
            <QueryModeSelector value={mode} onChange={setMode} />
          )}
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 border border-zinc-700/50 px-3 py-1.5 rounded-lg">
            <input 
              type="checkbox" 
              checked={isCritical} 
              onChange={(e) => setIsCritical(e.target.checked)}
              className="accent-emerald-500 rounded bg-zinc-800 border-zinc-700"
            />
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-400" /> A2UI Critical Route
            </span>
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-6">
        
        {/* Placeholder / Empty State */}
        {!surface && !queryApi.loading && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Send className="h-6 w-6 text-zinc-600" />
            </div>
            <p>Send a message to start querying.</p>
          </div>
        )}

        {/* Loading State */}
        {queryApi.loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-sm text-zinc-400 animate-pulse">Running retrieval pipeline...</p>
          </div>
        )}

        {/* Error State */}
        {queryApi.error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {queryApi.error}
          </div>
        )}

        {/* Results Area */}
        {surface && !queryApi.loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* A2UI Rendered Answer */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl backdrop-blur">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Agent Response</h2>
                
                {queryApi.latencyMs !== null && (
                  <span className="ml-auto text-xs text-zinc-500 bg-black/40 px-2 py-1 rounded font-mono">
                    {queryApi.latencyMs}ms
                  </span>
                )}
              </div>
              
              <A2UIRenderer surface={surface} />
            </div>

            {/* Retrieved Context Chunks */}
            {chunks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Database className="h-4 w-4 text-zinc-500" />
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Retrieved Context ({chunks.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {chunks.map((chunk, i) => (
                    <ChunkCard key={i} chunk={chunk} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative mt-auto shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isCritical ? "Ask a critical question (e.g. 'maintenance schedule for Creta')" : "Ask anything about the cars..."}
          className="w-full bg-zinc-900 border border-zinc-700/80 text-white rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg"
          disabled={queryApi.loading}
        />
        <button 
          type="submit"
          disabled={queryApi.loading || !input.trim()}
          className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg transition-colors"
        >
          {queryApi.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

// Ensure MessageSquare is imported at the top
import { MessageSquare } from "lucide-react";
