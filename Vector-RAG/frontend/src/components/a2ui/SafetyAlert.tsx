"use client";
import type { SafetyAlertData } from "@/types/a2ui";
import { AlertTriangle, ShieldAlert, Ban } from "lucide-react";

const severityConfig = {
  critical: { bg: "bg-red-500/10", border: "border-red-500/40", headerBg: "bg-red-500/20", text: "text-red-300", icon: ShieldAlert, label: "CRITICAL CONCERN" },
  high: { bg: "bg-orange-500/10", border: "border-orange-500/40", headerBg: "bg-orange-500/20", text: "text-orange-300", icon: AlertTriangle, label: "HIGH CONCERN" },
  medium: { bg: "bg-amber-500/10", border: "border-amber-500/40", headerBg: "bg-amber-500/20", text: "text-amber-300", icon: AlertTriangle, label: "MODERATE CONCERN" },
  low: { bg: "bg-emerald-500/10", border: "border-emerald-500/40", headerBg: "bg-emerald-500/20", text: "text-emerald-400", icon: AlertTriangle, label: "LOW CONCERN" },
};

export function SafetyAlert({ data }: { data: SafetyAlertData }) {
  const cfg = severityConfig[data.risk_level];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} backdrop-blur overflow-hidden`}>
      <div className={`px-4 py-3 flex items-center gap-2 border-b ${cfg.border} ${cfg.headerBg}`}>
        <Icon className={`h-5 w-5 ${cfg.text}`} />
        <h3 className={`text-sm font-bold ${cfg.text}`}>Safety Warning</h3>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded border ${cfg.border} ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>
      <div className="p-4 space-y-3">
        {data.warnings.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">⚠ Warnings</h4>
            <ul className="space-y-1">
              {data.warnings.map((w, i) => (
                <li key={i} className={`text-sm ${cfg.text}`}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {data.prohibited_actions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Ban className="h-3 w-3" /> Prohibited Actions
            </h4>
            <ul className="space-y-1">
              {data.prohibited_actions.map((a, i) => (
                <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span> {a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.precautions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Precautions</h4>
            <ul className="space-y-1">
              {data.precautions.map((p, i) => (
                <li key={i} className="text-sm text-zinc-300">{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
