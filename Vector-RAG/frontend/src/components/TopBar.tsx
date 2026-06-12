"use client";

import Link from "next/link";
import { BrandAppIcon } from "@/components/BrandLogo";

export function TopBar({ title, description }: { title: string; description: string }) {
  return (
    <header className="shrink-0 border-b border-white/5 bg-zinc-950/55 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-sm font-extrabold text-zinc-100">
          <BrandAppIcon className="h-9 w-9" />
          AutoSpec AI
        </Link>
        <div className="min-w-0 text-right">
          <h1 className="truncate text-sm font-bold text-[var(--foreground)] sm:text-base">{title}</h1>
          <p className="truncate text-[11px] font-medium text-zinc-600 sm:text-xs">{description}</p>
        </div>
      </div>
    </header>
  );
}
