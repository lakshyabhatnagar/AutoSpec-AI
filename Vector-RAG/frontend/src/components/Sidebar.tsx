"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandAppIcon } from "@/components/BrandLogo";
import { developerNavItems, mainNavItems, type NavItem } from "@/components/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-shell)] md:flex">
      <div className="border-b border-[var(--app-border)] px-4 py-4">
        <Link href="/" className="flex items-center gap-3 rounded-md px-1 py-1">
          <BrandAppIcon className="h-8 w-8 rounded-xl" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">AutoSpec AI</h1>
            <p className="text-xs text-zinc-500">Specify. Validate.</p>
          </div>
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <NavSection title="Main" items={mainNavItems} pathname={pathname} />
        <NavSection title="Developer" items={developerNavItems} pathname={pathname} className="mt-6" />
      </div>

      <div className="border-t border-[var(--app-border)] p-4">
        <div className="rounded-xl border border-[color:var(--app-accent)]/20 bg-[color:var(--app-accent)]/10 px-3 py-2">
          <p className="text-xs font-bold text-cyan-100">AutoSpec AI</p>
          <p className="text-[11px] font-medium text-cyan-300/70">Spec-first answers</p>
        </div>
      </div>
    </aside>
  );
}

function NavSection({
  title,
  items,
  pathname,
  className,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="mb-2 px-2 text-[11px] font-bold uppercase text-zinc-600">{title}</h2>
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const criticalAliasActive = item.href === "/critical" && ["/maintenance", "/warranty", "/safety", "/emergency", "/malfunctions"].includes(pathname);
          const isActive = active || criticalAliasActive;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-[color:var(--app-accent)]/12 text-sky-100"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              )}
            >
              {isActive && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-[var(--app-accent)]" />}
              <Icon className={cn("h-4 w-4", isActive ? "text-[var(--app-accent)]" : "text-zinc-600 group-hover:text-zinc-400")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
