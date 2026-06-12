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
    <div className={cn("inline-flex rounded-full bg-white/[0.055] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl", className)}>
      {MODES.map((mode) => {
        const active = value === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active 
                ? "bg-white/[0.12] text-zinc-100 shadow-[0_0_18px_rgba(14,165,183,0.10)]"
                : "text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-200"
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
