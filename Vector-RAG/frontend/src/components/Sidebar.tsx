"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  MessageSquare, 
  Bug, 
  Wrench, 
  ShieldCheck, 
  AlertTriangle, 
  Siren, 
  Stethoscope 
} from "lucide-react";

const navItems = [
  { href: "/chat", label: "General Chat", icon: MessageSquare, exact: false },
  { href: "/debug", label: "Pipeline Debugger", icon: Bug, exact: false },
];

const criticalItems = [
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/warranty", label: "Warranty Info", icon: ShieldCheck },
  { href: "/safety", label: "Safety Alerts", icon: AlertTriangle },
  { href: "/emergency", label: "Emergency", icon: Siren },
  { href: "/malfunctions", label: "Diagnostics", icon: Stethoscope },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-full bg-black border-r border-zinc-800 flex flex-col">
      <div className="p-6 border-b border-zinc-800/80">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-lg leading-none mt-[-2px]">A</span>
          </div>
          <div>
            <h1 className="font-bold text-zinc-100 tracking-tight">AutoRAG</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Powered by A2UI</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2">Core</h2>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active 
                      ? "bg-zinc-800/80 text-white shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-blue-400" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2">Critical Queries</h2>
          <nav className="space-y-1">
            {criticalItems.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active 
                      ? "bg-zinc-800/80 text-white shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-emerald-400" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
