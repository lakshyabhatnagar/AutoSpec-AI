"use client";
import { useState } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { postCriticalQuery } from "@/services/api";
import { criticalResponseToSurface } from "@/services/a2ui-adapter";
import { A2UIRenderer } from "@/lib/a2ui-renderer";
import type { A2UISurface } from "@/types/a2ui";

export default function SafetyPage() {
  const [input, setInput] = useState("");
  const [surface, setSurface] = useState<A2UISurface | null>(null);
  const queryApi = useApi<any>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const forcedQuery = `${input} (context: safety warnings precautions risks prohibited actions)`;
    const res = await queryApi.execute(() => postCriticalQuery({ query: forcedQuery }));
    if (res.data) setSurface(criticalResponseToSurface(res.data, forcedQuery));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Safety & Security
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Safety warnings, operational hazards, and precautions</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-6">
        {!surface && !queryApi.loading && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
            <AlertTriangle className="h-12 w-12 text-zinc-700/50" />
            <p className="text-sm">Ask about safety procedures or warnings for specific components.</p>
          </div>
        )}
        {queryApi.loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
            <p className="text-sm text-zinc-400 animate-pulse">Extracting safety rules...</p>
          </div>
        )}
        {queryApi.error && <div className="p-4 rounded-lg bg-red-500/10 text-red-400">{queryApi.error}</div>}
        {surface && !queryApi.loading && <A2UIRenderer surface={surface} />}
      </div>
      <form onSubmit={handleSubmit} className="relative mt-auto shrink-0">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="E.g., What are the safety warnings for the airbag system?" className="w-full bg-zinc-900 border border-zinc-700/80 text-white rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-lg" disabled={queryApi.loading} />
        <button type="submit" disabled={queryApi.loading || !input.trim()} className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg transition-colors">
          {queryApi.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
