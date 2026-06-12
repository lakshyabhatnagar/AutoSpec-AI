"use client";
import { useState } from "react";
import type { MaintenanceTableData } from "@/types/a2ui";
import { ArrowUpDown, Wrench } from "lucide-react";

export function MaintenanceTable({ data }: { data: MaintenanceTableData }) {
  const [sortKey, setSortKey] = useState<"maintenance_item" | "action_display">("maintenance_item");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...data.items].sort((a, b) => {
    const va = (String(a[sortKey] || "")).toLowerCase();
    const vb = (String(b[sortKey] || "")).toLowerCase();
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const toggleSort = (key: "maintenance_item" | "action_display") => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-[var(--app-surface)]">
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950/50 px-4 py-3">
        <Wrench className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-semibold text-zinc-200">Maintenance Schedule</h3>
        <span className="ml-auto text-xs text-zinc-500">{data.items.length} items</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-800">
              <th className="px-4 py-2 cursor-pointer hover:text-zinc-200 transition-colors" onClick={() => toggleSort("maintenance_item")}>
                <span className="flex items-center gap-1">Item <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="px-4 py-2">Interval (km)</th>
              <th className="px-4 py-2">Interval (months)</th>
              <th className="px-4 py-2 cursor-pointer hover:text-zinc-200 transition-colors" onClick={() => toggleSort("action_display")}>
                <span className="flex items-center gap-1">Action <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="px-4 py-2">Variant</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => (
              <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-zinc-200 font-medium whitespace-normal leading-relaxed">{item.maintenance_item}</td>
                <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{item.interval_km ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{item.interval_months ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${item.action_code === "R" ? "border border-red-900/70 bg-red-950/30 text-red-300" :
                      item.action_code === "I" ? "border border-amber-900/70 bg-amber-950/30 text-amber-300" :
                        item.action_code === "C" ? "border border-cyan-900/70 bg-cyan-950/30 text-cyan-300" :
                          item.action_code === "L" ? "border border-violet-900/70 bg-violet-950/30 text-violet-300" :
                            item.action_code === "T" ? "border border-teal-900/70 bg-teal-950/30 text-teal-300" :
                              "border border-sky-900/70 bg-sky-950/30 text-sky-300"
                    }`}>{item.action_display || item.action_code || "—"}</span>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{item.variant || "All"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
