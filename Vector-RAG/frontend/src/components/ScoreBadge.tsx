"use client";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  label?: string;
}

export function ScoreBadge({ score, label }: ScoreBadgeProps) {
  // Score interpretation (heuristic)
  let color = "bg-white/[0.06] text-zinc-300";
  
  if (score > 0.8 || score > 8) { // Handles both 0-1 cosine/reranker and RRF (often > 8)
    color = "bg-emerald-300/10 text-emerald-300";
  } else if (score > 0.6 || score > 4) {
    color = "bg-amber-300/10 text-amber-300";
  } else if (score < 0.4 && score < 2) {
    color = "bg-red-300/10 text-red-300";
  }

  return (
    <div className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5", color)}>
      {label && <span className="text-[9px] font-semibold uppercase opacity-70">{label}</span>}
      <span className="text-[11px] font-mono font-medium">
        {Number.isInteger(score) ? score : score.toFixed(3)}
      </span>
    </div>
  );
}
