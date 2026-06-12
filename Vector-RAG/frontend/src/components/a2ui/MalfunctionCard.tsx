"use client";
import type { MalfunctionCardData } from "@/types/a2ui";
import { Stethoscope, Activity, FileWarning, Search } from "lucide-react";

const severityColors = {
  critical: { bg: "bg-red-950/10", border: "border-red-900/70", headerBg: "bg-red-950/20", text: "text-red-300", label: "CRITICAL" },
  high: { bg: "bg-orange-950/10", border: "border-orange-900/70", headerBg: "bg-orange-950/20", text: "text-orange-300", label: "HIGH" },
  medium: { bg: "bg-amber-950/10", border: "border-amber-900/70", headerBg: "bg-amber-950/20", text: "text-amber-300", label: "MEDIUM" },
  low: { bg: "bg-yellow-950/10", border: "border-yellow-900/70", headerBg: "bg-yellow-950/20", text: "text-yellow-300", label: "LOW" },
};

export function MalfunctionCard({ data }: { data: MalfunctionCardData }) {
  const sevConfig = severityColors[data.severity];

  return (
    <div className={`overflow-hidden rounded-lg border ${sevConfig.border} ${sevConfig.bg}`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${sevConfig.border} ${sevConfig.headerBg}`}>
        <Stethoscope className={`h-5 w-5 ${sevConfig.text}`} />
        <h3 className={`text-sm font-bold ${sevConfig.text}`}>
          Diagnosis {data.component && <span className="opacity-70 font-normal ml-1">— {data.component}</span>}
        </h3>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded border ${sevConfig.border} ${sevConfig.bg} ${sevConfig.text}`}>
          {sevConfig.label}
        </span>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Symptoms */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Activity className="h-3 w-3" /> Symptoms
          </h4>
          <ul className="space-y-1">
            {data.symptoms.map((s, i) => (
              <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                <span className="text-zinc-600 mt-1">•</span> {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Possible Causes */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Search className="h-3 w-3" /> Possible Causes
          </h4>
          <ul className="space-y-1">
            {data.possible_causes.map((c, i) => (
              <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                <span className="text-zinc-600 mt-1">•</span> {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Actions */}
        <div className="md:col-span-2 mt-2 pt-4 border-t border-zinc-800/80 space-y-2">
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <FileWarning className="h-3 w-3" /> Recommended Actions
          </h4>
          <div className="space-y-2">
            {data.recommended_actions.map((act, i) => (
              <div key={i} className="text-sm text-blue-200 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 leading-relaxed">
                {act}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
