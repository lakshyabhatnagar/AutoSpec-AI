"use client";
import { useState } from "react";
import type { RetrievedChunk, DebugChunk } from "@/types/api";
import { ChevronDown, ChevronRight, FileText, Tag, Hash, Link as LinkIcon } from "lucide-react";
import { ScoreBadge } from "./ScoreBadge";

interface ChunkCardProps {
  chunk: RetrievedChunk | DebugChunk;
  isDebug?: boolean;
}

export function ChunkCard({ chunk, isDebug = false }: ChunkCardProps) {
  const [expanded, setExpanded] = useState(false);
  const m = chunk.metadata;

  const debugChunk = isDebug ? (chunk as DebugChunk) : null;

  return (
    <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/40 overflow-hidden text-sm">
      <div 
        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-700/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-zinc-400 hover:text-zinc-200">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <FileText className="h-4 w-4 text-zinc-500" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 truncate text-zinc-300 font-medium">
            {m.brand} {m.model} <span className="text-zinc-600">/</span> {m.section || "General"}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {m.is_feature_record && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
              Feature Store
            </span>
          )}
          {isDebug && debugChunk && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
              debugChunk.retrieval_source === "semantic" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
              debugChunk.retrieval_source === "bm25" ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
              "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            }`}>
              {debugChunk.retrieval_source}
            </span>
          )}
          {m.score !== undefined && m.score !== null && (
            <ScoreBadge score={m.score} label={isDebug ? "Cosine" : undefined} />
          )}
          {isDebug && debugChunk && debugChunk.rrf_score !== null && (
            <ScoreBadge score={debugChunk.rrf_score} label="RRF" />
          )}
          {isDebug && debugChunk && debugChunk.reranker_score !== null && (
            <ScoreBadge score={debugChunk.reranker_score} label="Reranker" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-700/50 space-y-3">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {m.years && (
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Tag className="h-3 w-3" /> <span className="text-zinc-500">Years:</span> {m.years}
              </div>
            )}
            {m.subsection && (
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Tag className="h-3 w-3" /> <span className="text-zinc-500">Sub:</span> <span className="truncate">{m.subsection}</span>
              </div>
            )}
            {m.page && (
              <div className="flex items-center gap-1.5 text-zinc-400">
                <FileText className="h-3 w-3" /> <span className="text-zinc-500">Page:</span> {m.page}
              </div>
            )}
            {m.chunk_id && (
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Hash className="h-3 w-3" /> <span className="text-zinc-500">ID:</span> <span className="truncate">{m.chunk_id}</span>
              </div>
            )}
            {m.doc_uri && (
              <div className="flex items-center gap-1.5 text-zinc-400 col-span-2">
                <LinkIcon className="h-3 w-3" /> <span className="text-zinc-500">URI:</span> <span className="truncate">{m.doc_uri}</span>
              </div>
            )}
          </div>
          
          <div className="w-full h-px bg-zinc-800" />
          
          {/* Content */}
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-zinc-300 font-mono text-xs leading-relaxed bg-black/40 p-3 rounded border border-zinc-800">
              {chunk.page_content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
