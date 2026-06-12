"use client";
import type { GenericTableData } from "@/types/a2ui";
import { Table as TableIcon } from "lucide-react";

export function GenericTable({ data }: { data: GenericTableData }) {
  return (
    <div className="my-4 overflow-hidden rounded-lg border border-zinc-800 bg-[var(--app-surface)]">
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950/50 px-4 py-3">
        <TableIcon className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-semibold text-zinc-200">Data Table</h3>
        <span className="ml-auto text-xs text-zinc-500">{data.rows.length} rows</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-400">
              {data.headers.map((header, i) => (
                <th key={i} className="bg-zinc-950/50 px-4 py-2 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/60 transition-colors hover:bg-zinc-900">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-zinc-200 whitespace-normal leading-relaxed">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
