import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-5 pb-28 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-medium uppercase text-zinc-500">{eyebrow}</p>}
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl ring-1 ring-white/8", className)}>
      {children}
    </section>
  );
}

export function FeatureCard({
  href,
  icon: Icon,
  title,
  description,
  meta,
  className,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  meta?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 transition-colors hover:border-[var(--app-accent)] hover:bg-[var(--app-surface-hover)]",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--app-accent)]/25 bg-[color:var(--app-accent)]/10 text-[var(--app-accent)]">
          <Icon className="h-4 w-4" />
        </div>
        {meta && <span className="text-xs text-zinc-600">{meta}</span>}
      </div>
      <h3 className="text-base font-extrabold text-zinc-100">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-zinc-500">{description}</p>
    </Link>
  );
}
