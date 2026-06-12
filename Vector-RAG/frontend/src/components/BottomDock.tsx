"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { allNavItems } from "@/components/navigation";
import { cn } from "@/lib/utils";

const criticalAliases = new Set(["/maintenance", "/warranty", "/safety", "/emergency", "/malfunctions"]);
const dockTones: Record<string, { icon: string; hoverIcon: string; bubble: string; underline: string; glow: string; shadow: string }> = {
  "/": {
    icon: "text-sky-300",
    hoverIcon: "group-hover:text-sky-300",
    bubble: "group-hover:bg-sky-400/10",
    underline: "bg-sky-300",
    glow: "drop-shadow-[0_0_10px_rgba(125,211,252,0.65)]",
    shadow: "shadow-[0_8px_24px_rgba(56,189,248,0.18),inset_0_1px_0_rgba(255,255,255,0.16)]",
  },
  "/chat": {
    icon: "text-emerald-300",
    hoverIcon: "group-hover:text-emerald-300",
    bubble: "group-hover:bg-emerald-400/10",
    underline: "bg-emerald-300",
    glow: "drop-shadow-[0_0_10px_rgba(110,231,183,0.65)]",
    shadow: "shadow-[0_8px_24px_rgba(52,211,153,0.18),inset_0_1px_0_rgba(255,255,255,0.16)]",
  },
  "/critical": {
    icon: "text-red-300",
    hoverIcon: "group-hover:text-red-300",
    bubble: "group-hover:bg-red-400/10",
    underline: "bg-red-300",
    glow: "drop-shadow-[0_0_10px_rgba(252,165,165,0.68)]",
    shadow: "shadow-[0_8px_24px_rgba(248,113,113,0.20),inset_0_1px_0_rgba(255,255,255,0.16)]",
  },
  "/debug": {
    icon: "text-amber-300",
    hoverIcon: "group-hover:text-amber-300",
    bubble: "group-hover:bg-amber-400/10",
    underline: "bg-amber-300",
    glow: "drop-shadow-[0_0_10px_rgba(252,211,77,0.65)]",
    shadow: "shadow-[0_8px_24px_rgba(252,211,77,0.18),inset_0_1px_0_rgba(255,255,255,0.16)]",
  },
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/critical" && criticalAliases.has(pathname)) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomDock() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-3">
      <div className="pointer-events-auto mx-auto grid w-full max-w-xl grid-cols-4 rounded-full border border-white/15 bg-zinc-950/45 px-2 py-1.5 shadow-[0_18px_70px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        {allNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const tone = dockTones[item.href] ?? dockTones["/"];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex min-h-13 flex-col items-center justify-center gap-1 px-1.5 text-[10px] font-semibold transition-colors duration-200 sm:min-h-14 sm:text-[11px]",
                active ? "text-white" : "text-zinc-500 hover:text-zinc-200"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                  tone.bubble,
                  active && "bg-white/[0.14] ring-1 ring-white/10",
                  active && tone.shadow
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5",
                    active ? cn(tone.icon, tone.glow) : cn("text-current", tone.hoverIcon)
                  )}
                />
              </span>
              <span className="relative max-w-full truncate pb-1">
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 origin-center rounded-full shadow-[0_0_12px_currentColor] transition-all duration-200 ease-out",
                    tone.underline,
                    active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-80"
                  )}
                />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
