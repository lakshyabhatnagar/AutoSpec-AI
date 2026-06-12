"use client";

import { Activity, ArrowRight, BrainCircuit, Database, Filter, Layers, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DebugRetrieveResponse } from "@/types/api";

interface RetrievalPipelineProps {
  data: DebugRetrieveResponse;
}

export function RetrievalPipeline({ data }: RetrievalPipelineProps) {
  return (
    <div className="overflow-x-auto rounded-[2rem] bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      <div className="flex min-w-max items-center gap-4">
        <PipelineNode
          icon={Search}
          label="Query"
          detail={data.is_critical ? data.category || "Critical" : "General"}
        />
        <Connector />

        <div className="flex flex-col gap-2">
          <StageRow icon={Database} label="Dense vector" detail={`${data.dense_count} docs`} />
          <StageRow icon={Filter} label="BM25 sparse" detail={`${data.bm25_count} docs`} />
          {data.is_critical && (
            <StageRow
              icon={Activity}
              label="Feature store"
              detail={`${data.feature_store_count} records`}
              tone="critical"
            />
          )}
        </div>

        <Connector />
        <PipelineNode icon={Layers} label="RRF Fusion" detail={`${data.fused_count} unique`} />

        {data.mode === "hybrid_rerank" && (
          <>
            <Connector />
            <PipelineNode icon={BrainCircuit} label="Reranker" detail="Voyage AI" />
          </>
        )}

        <Connector />
        <PipelineNode label="Final Docs" detail="To context" count={data.final_count} />
      </div>
    </div>
  );
}

function Connector() {
  return <ArrowRight className="mb-6 h-4 w-4 text-zinc-700" />;
}

function PipelineNode({
  icon: Icon,
  label,
  detail,
  count,
}: {
  icon?: LucideIcon;
  label: string;
  detail: string;
  count?: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300/10 shadow-[0_0_24px_rgba(14,165,183,0.12)]">
        {Icon ? <Icon className="h-4 w-4 text-zinc-400" /> : <span className="text-sm font-semibold text-zinc-200">{count}</span>}
      </div>
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <span className="mt-1 max-w-24 truncate text-center text-[10px] text-zinc-500">{detail}</span>
    </div>
  );
}

function StageRow({
  icon: Icon,
  label,
  detail,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  tone?: "default" | "critical";
}) {
  return (
    <div className={tone === "critical"
      ? "flex w-48 items-center gap-3 rounded-full bg-emerald-300/10 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      : "flex w-48 items-center gap-3 rounded-full bg-white/[0.055] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"}
    >
      <Icon className={tone === "critical" ? "h-4 w-4 text-emerald-400" : "h-4 w-4 text-zinc-500"} />
      <div className="min-w-0 flex-1">
        <div className={tone === "critical" ? "truncate text-xs font-medium text-emerald-200" : "truncate text-xs font-medium text-zinc-300"}>
          {label}
        </div>
        <div className={tone === "critical" ? "text-[10px] text-emerald-500/80" : "text-[10px] text-zinc-500"}>
          {detail}
        </div>
      </div>
    </div>
  );
}
