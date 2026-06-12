import type { LucideIcon } from "lucide-react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-60 flex-col items-center justify-center rounded-[2rem] bg-white/[0.035] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl", className)}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-cyan-300/10 text-[var(--app-accent)] shadow-[0_0_30px_rgba(14,165,183,0.16)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-bold text-zinc-200">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm font-medium leading-6 text-zinc-500">{description}</p>}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-[2rem] bg-white/[0.035] p-8 text-center backdrop-blur-xl">
      <Loader2 className="mb-3 h-5 w-5 animate-spin text-[var(--app-accent)]" />
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl bg-red-950/25 p-4 text-sm text-red-200 shadow-[0_0_34px_rgba(248,113,113,0.12)] backdrop-blur-xl ring-1 ring-red-300/15">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      <span className="leading-6">{message}</span>
    </div>
  );
}
