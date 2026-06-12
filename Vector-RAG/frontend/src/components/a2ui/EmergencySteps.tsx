"use client";
import type { EmergencyStepsData } from "@/types/a2ui";
import { AlertTriangle, Siren } from "lucide-react";

export function EmergencySteps({ data }: { data: EmergencyStepsData }) {
  return (
    <div className="overflow-hidden rounded-lg border border-red-900/70 bg-red-950/10">
      <div className="flex items-center gap-2 border-b border-red-900/60 bg-red-950/20 px-4 py-3">
        <Siren className="h-4 w-4 text-red-400" />
        <h3 className="text-sm font-semibold text-red-300">{data.title || "Emergency Procedure"}</h3>
      </div>
      <div className="p-4">
        <ol className="relative border-l border-zinc-700 ml-3 space-y-4">
          {data.steps.map((step) => (
            <li key={step.step_number} className="ml-4">
              <div className="absolute -left-2.5 mt-1 h-5 w-5 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center">
                <span className="text-[10px] font-bold text-zinc-300">{step.step_number}</span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed">{step.action}</p>
              {step.caution && (
                <div className="mt-2 flex gap-2 rounded border border-amber-900/70 bg-amber-950/20 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <p className="text-xs leading-5 text-amber-300">{step.caution}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
