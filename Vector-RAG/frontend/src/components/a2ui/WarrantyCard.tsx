"use client";
import { useState } from "react";
import type { WarrantyCardData } from "@/types/a2ui";
import { Check, ChevronDown, ChevronUp, Shield, X } from "lucide-react";

export function WarrantyCard({ data }: { data: WarrantyCardData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-emerald-900/70 bg-emerald-950/10">
      <div className="flex items-center gap-2 border-b border-emerald-900/70 bg-emerald-950/20 px-4 py-3">
        <Shield className="h-5 w-5 text-emerald-400" />
        <h3 className="text-sm font-bold text-emerald-400">Warranty Information</h3>
        <button onClick={() => setExpanded(!expanded)} className="ml-auto text-emerald-500 hover:text-emerald-300 transition-colors">
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>
      <div className="p-4 space-y-3">
        {data.duration && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Duration</span>
            <span className="text-sm text-emerald-300 font-medium">{data.duration}</span>
          </div>
        )}
        {data.summary && (
          <p className="text-sm text-zinc-300 leading-relaxed">{data.summary}</p>
        )}
        {expanded && (
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            {data.covered_parts.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Covered Parts</h4>
                <ul className="space-y-1">
                  {data.covered_parts.map((p, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.exclusions.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Exclusions</h4>
                <ul className="space-y-1">
                  {data.exclusions.map((e, i) => (
                    <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" /> {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.conditions.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Conditions</h4>
                <ul className="space-y-1">
                  {data.conditions.map((c, i) => (
                    <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
