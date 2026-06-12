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
    <div className="overflow-hidden rounded-3xl bg-white/[0.045] text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl ring-1 ring-white/8">
      <div 
        className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.055]"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-zinc-500 hover:text-zinc-200" aria-label={expanded ? "Collapse chunk" : "Expand chunk"}>
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
            <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
              Feature Store
            </span>
          )}
          {isDebug && debugChunk && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              debugChunk.retrieval_source === "semantic" ? "bg-sky-300/10 text-sky-300" :
              debugChunk.retrieval_source === "bm25" ? "bg-violet-300/10 text-violet-300" :
              "bg-emerald-300/10 text-emerald-300"
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
        <div className="space-y-3 bg-black/12 px-4 py-3">
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
          
          <div className="h-px w-full bg-white/8" />
          
          {/* Content */}
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="rounded-2xl bg-black/20 p-3 font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {chunk.page_content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
