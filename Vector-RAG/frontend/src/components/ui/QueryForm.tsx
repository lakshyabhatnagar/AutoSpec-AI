"use client";

import { Loader2, Search, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export function QueryForm({
  value,
  onChange,
  onSubmit,
  placeholder,
  loading,
  tone = "default",
  icon = "send",
  leftSlot,
  rightSlot,
  ariaLabel = "Submit query",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  placeholder: string;
  loading: boolean;
  tone?: "default" | "critical" | "debug";
  icon?: "send" | "search";
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  const Icon = icon === "search" ? Search : Send;
  return (
    <form onSubmit={onSubmit} className="shrink-0">
      <div
        className={cn(
          "relative isolate flex min-h-16 items-center gap-2 overflow-hidden rounded-full border border-white/10 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
          tone === "critical" && "border-cyan-200/15 bg-white/[0.07]",
          tone === "debug" && "border-violet-300/15 bg-violet-300/[0.045]",
          className
        )}
      >
        <span className="absolute inset-0 -z-10 rounded-full bg-white/[0.065] backdrop-blur-xl" />
        {leftSlot}
        {icon === "search" && (
          <Search className="ml-2 h-4 w-4 shrink-0 text-zinc-500" />
        )}
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-4 text-sm font-medium text-zinc-100 outline-none placeholder:text-zinc-500"
          disabled={loading}
        />
        {rightSlot}
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-600",
            tone === "critical" && "hover:bg-cyan-100",
            tone === "debug" && "hover:bg-violet-100"
          )}
          aria-label={ariaLabel}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
