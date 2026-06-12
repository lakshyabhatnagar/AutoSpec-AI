"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, History, LogOut, Settings, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function AppNavbar({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <header
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[60] transition-transform duration-300 ease-out",
        hidden && "-translate-y-full"
      )}
    >
      <div className="mx-auto grid min-h-16 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <span aria-hidden="true" />

        <nav className="pointer-events-auto hidden items-center justify-center gap-9 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-base font-medium transition-colors drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]",
                pathname === link.href ? "text-[#0EA5B7]" : "text-zinc-100/88 hover:text-[#0EA5B7]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {!user ? (
          <div className="pointer-events-auto flex items-center justify-end gap-5">
            <Link href="/login" className="text-sm font-bold text-zinc-300 transition-colors hover:text-zinc-100">
              Login
            </Link>
            <Link href="/signup" className="text-sm font-bold text-cyan-200 transition-colors hover:text-cyan-100">
              Sign Up
            </Link>
          </div>
        ) : (
          <div className="pointer-events-auto relative justify-self-end">
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="flex items-center gap-2 text-sm font-bold text-zinc-100"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300">
                <UserRound className="h-4 w-4" />
              </span>
              <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
              <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition-transform", open && "rotate-180")} />
            </button>

            {open && (
              <div className="absolute right-0 z-[70] mt-2 w-56 rounded-3xl bg-[#0B1220]/95 p-2 shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur-2xl">
                <Link onClick={() => setOpen(false)} href="/history" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06]">
                  <History className="h-4 w-4 text-cyan-300" /> Chat History
                </Link>
                <Link onClick={() => setOpen(false)} href="/settings" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06]">
                  <Settings className="h-4 w-4 text-zinc-500" /> Settings
                </Link>
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-red-200 hover:bg-red-300/10">
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
