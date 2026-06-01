"use client";
import { ArrowRight, Database, Search, Filter, Layers, BrainCircuit, Activity } from "lucide-react";
import type { DebugRetrieveResponse } from "@/types/api";

interface RetrievalPipelineProps {
  data: DebugRetrieveResponse;
}

export function RetrievalPipeline({ data }: RetrievalPipelineProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 overflow-x-auto">
      <div className="flex items-center min-w-max gap-4">
        
        {/* Step 1: Query */}
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-2">
            <Search className="h-5 w-5 text-blue-400" />
          </div>
          <span className="text-xs font-medium text-zinc-300">Query</span>
          <span className="text-[10px] text-zinc-500 mt-1 max-w-[80px] text-center truncate">
            {data.is_critical ? data.category || "Critical" : "General"}
          </span>
        </div>

        <ArrowRight className="h-5 w-5 text-zinc-600 mb-6" />

        {/* Step 2: Parallel Retrieval */}
        <div className="flex flex-col gap-2">
          {/* Dense */}
          <div className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 w-48">
            <Database className="h-4 w-4 text-emerald-400" />
            <div className="flex-1">
              <div className="text-xs font-medium text-zinc-300">Dense (Vector)</div>
              <div className="text-[10px] text-zinc-500">{data.dense_count} docs</div>
            </div>
          </div>
          {/* BM25 */}
          <div className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 w-48">
            <Filter className="h-4 w-4 text-purple-400" />
            <div className="flex-1">
              <div className="text-xs font-medium text-zinc-300">Sparse (BM25)</div>
              <div className="text-[10px] text-zinc-500">{data.bm25_count} docs</div>
            </div>
          </div>
          {/* Feature Store (if critical) */}
          {data.is_critical && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 w-48">
              <Activity className="h-4 w-4 text-emerald-400" />
              <div className="flex-1">
                <div className="text-xs font-medium text-emerald-300">Feature Store</div>
                <div className="text-[10px] text-emerald-500/70">{data.feature_store_count} records</div>
              </div>
            </div>
          )}
        </div>

        <ArrowRight className="h-5 w-5 text-zinc-600 mb-6" />

        {/* Step 3: Fusion */}
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-2">
            <Layers className="h-5 w-5 text-amber-400" />
          </div>
          <span className="text-xs font-medium text-zinc-300">RRF Fusion</span>
          <span className="text-[10px] text-zinc-500 mt-1">{data.fused_count} unique</span>
        </div>

        {data.mode === "hybrid_rerank" && (
          <>
            <ArrowRight className="h-5 w-5 text-zinc-600 mb-6" />
            {/* Step 4: Rerank */}
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-2">
                <BrainCircuit className="h-5 w-5 text-orange-400" />
              </div>
              <span className="text-xs font-medium text-zinc-300">Reranker</span>
              <span className="text-[10px] text-zinc-500 mt-1">Voyage AI</span>
            </div>
          </>
        )}

        <ArrowRight className="h-5 w-5 text-zinc-600 mb-6" />

        {/* Step 5: Final Selection */}
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-2">
            <span className="text-sm font-bold text-green-400">{data.final_count}</span>
          </div>
          <span className="text-xs font-medium text-zinc-300">Final Docs</span>
          <span className="text-[10px] text-zinc-500 mt-1">To Context</span>
        </div>

      </div>
    </div>
  );
}
