"use client";
import type { RetrievalMode } from "@/types/api";
import { cn } from "@/lib/utils";

interface QueryModeSelectorProps {
  value: RetrievalMode;
  onChange: (value: RetrievalMode) => void;
  className?: string;
}

const MODES: { value: RetrievalMode; label: string }[] = [
  { value: "semantic", label: "Semantic" },
  { value: "bm25", label: "BM25" },
  { value: "hybrid", label: "Hybrid" },
  { value: "hybrid_rerank", label: "Rerank" },
];

export function QueryModeSelector({ value, onChange, className }: QueryModeSelectorProps) {
  return (
    <div className={cn("inline-flex bg-zinc-900 border border-zinc-700/50 p-1 rounded-lg", className)}>
      {MODES.map((mode) => {
        const active = value === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              active 
                ? "bg-zinc-700/80 text-white shadow-sm" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
