"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "@/services/api";
import { Database, RefreshCw, Server } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthResponse } from "@/types/api";

export function HealthStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiStatus, setApiStatus] = useState<"healthy" | "unhealthy" | "checking">("checking");
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    setApiStatus("checking");
    const res = await fetchHealth();
    if (res.data) {
      setHealth(res.data);
      setApiStatus("healthy");
    } else {
      setApiStatus("unhealthy");
      setHealth(null);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchHealth().then((res) => {
      if (!mounted) return;
      if (res.data) {
        setHealth(res.data);
        setApiStatus("healthy");
      } else {
        setApiStatus("unhealthy");
        setHealth(null);
      }
    });
    const int = setInterval(() => {
      void checkHealth();
    }, 30000);
    return () => {
      mounted = false;
      clearInterval(int);
    };
  }, [checkHealth]);

  const services = [
    { label: "API", status: apiStatus, icon: Server },
    { label: "Mongo", status: health?.mongodb || "unknown", icon: Database },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-zinc-950/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
      {services.map((service) => <StatusPill key={service.label} {...service} />)}
      <button
        type="button"
        onClick={() => void checkHealth()}
        disabled={checking}
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200 disabled:cursor-wait"
        aria-label="Refresh health status"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />
      </button>
    </div>
  );
}

function StatusPill({
  label,
  status,
  icon: Icon,
}: {
  label: string;
  status: string;
  icon: LucideIcon;
}) {
  const healthy = status === "healthy" || status === "connected";
  const checking = status === "checking";
  const unknown = status === "unknown" || checking;

  return (
    <div className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold text-zinc-400">
      <Icon className={cn("h-3.5 w-3.5", healthy ? "text-emerald-300" : !unknown ? "text-red-300" : "text-zinc-600")} />
      <span className="hidden lg:inline">{label}</span>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shadow-[0_0_10px_currentColor]",
          healthy && "bg-emerald-400 text-emerald-400",
          !healthy && !unknown && "bg-red-400 text-red-400",
          checking && "animate-pulse bg-amber-300 text-amber-300",
          status === "unknown" && "bg-zinc-600 text-zinc-600"
        )}
        title={`${label}: ${status}`}
      />
    </div>
  );
}
