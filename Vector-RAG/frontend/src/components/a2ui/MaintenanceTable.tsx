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
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/80 backdrop-blur overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-700/50 bg-zinc-800/50">
        <Wrench className="h-4 w-4 text-amber-400" />
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
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${item.action_code === "R" ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                      item.action_code === "I" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                        item.action_code === "C" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" :
                          item.action_code === "L" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                            item.action_code === "T" ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" :
                              "bg-blue-500/20 text-blue-300 border border-blue-500/30"
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
