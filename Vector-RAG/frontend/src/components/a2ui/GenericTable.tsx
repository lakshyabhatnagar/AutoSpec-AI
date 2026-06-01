"use client";
import type { GenericTableData } from "@/types/a2ui";
import { Table as TableIcon } from "lucide-react";

export function GenericTable({ data }: { data: GenericTableData }) {
  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/80 backdrop-blur overflow-hidden my-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-700/50 bg-zinc-800/50">
        <TableIcon className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Data Table</h3>
        <span className="ml-auto text-xs text-zinc-500">{data.rows.length} rows</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-800">
              {data.headers.map((header, i) => (
                <th key={i} className="px-4 py-2 font-semibold bg-zinc-800/20">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
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
