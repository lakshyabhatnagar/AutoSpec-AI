"use client";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  label?: string;
}

export function ScoreBadge({ score, label }: ScoreBadgeProps) {
  // Score interpretation (heuristic)
  let color = "bg-zinc-500/20 text-zinc-300 border-zinc-500/30";
  
  if (score > 0.8 || score > 8) { // Handles both 0-1 cosine/reranker and RRF (often > 8)
    color = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  } else if (score > 0.6 || score > 4) {
    color = "bg-amber-500/20 text-amber-300 border-amber-500/30";
  } else if (score < 0.4 && score < 2) {
    color = "bg-red-500/20 text-red-300 border-red-500/30";
  }

  return (
    <div className={cn("flex items-center gap-1.5 px-1.5 py-0.5 rounded border", color)}>
      {label && <span className="text-[9px] uppercase tracking-wider opacity-70 font-bold">{label}</span>}
      <span className="text-[11px] font-mono font-medium">
        {Number.isInteger(score) ? score : score.toFixed(3)}
      </span>
    </div>
  );
}
