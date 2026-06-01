"use client";
import { useEffect, useState } from "react";
import { fetchHealth } from "@/services/api";
import { Server, Database, BrainCircuit, Activity } from "lucide-react";

export function HealthStatus() {
  const [health, setHealth] = useState<{ mongodb: string; vertex_ai: string; mlflow: string } | null>(null);

  useEffect(() => {
    fetchHealth().then((res) => {
      if (res.data) setHealth(res.data);
    });
    // Poll every 30s
    const int = setInterval(() => {
      fetchHealth().then((res) => {
        if (res.data) setHealth(res.data);
      });
    }, 30000);
    return () => clearInterval(int);
  }, []);

  const StatusDot = ({ status }: { status: string }) => (
    <div className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 animate-pulse"}`} />
  );

  return (
    <div className="flex items-center gap-4 bg-zinc-900/80 border border-zinc-800 px-4 py-2 rounded-full backdrop-blur text-xs font-medium">
      <div className="flex items-center gap-2">
        <Server className="h-3 w-3 text-zinc-400" />
        <span className="text-zinc-300">API</span>
        <StatusDot status={health ? "connected" : "disconnected"} />
      </div>
      <div className="w-px h-3 bg-zinc-700" />
      <div className="flex items-center gap-2">
        <Database className="h-3 w-3 text-zinc-400" />
        <span className="text-zinc-300">Mongo</span>
        <StatusDot status={health?.mongodb || "disconnected"} />
      </div>
      <div className="w-px h-3 bg-zinc-700" />
      <div className="flex items-center gap-2">
        <BrainCircuit className="h-3 w-3 text-zinc-400" />
        <span className="text-zinc-300">Vertex AI</span>
        <StatusDot status={health?.vertex_ai || "disconnected"} />
      </div>
      <div className="w-px h-3 bg-zinc-700" />
      <div className="flex items-center gap-2">
        <Activity className="h-3 w-3 text-zinc-400" />
        <span className="text-zinc-300">MLflow</span>
        <StatusDot status={health?.mlflow || "disconnected"} />
      </div>
    </div>
  );
}
