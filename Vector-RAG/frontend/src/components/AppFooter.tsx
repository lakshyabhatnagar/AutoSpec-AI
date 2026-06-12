import Link from "next/link";
import { BrandMark } from "@/components/BrandLogo";

const columns = [
  { title: "Product", links: [["Features", "/features"], ["Chat", "/chat"], ["Critical Query", "/critical"], ["Pipeline Debugger", "/debug"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"]] },
  { title: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Cookie Policy", "/cookies"]] },
];

export function AppFooter() {
  return (
    <footer className="border-t border-white/8 bg-[#0B1220]/72 backdrop-blur-2xl">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <span className="text-sm font-extrabold text-zinc-100">AutoSpec AI</span>
          </div>
          <p className="mt-3 max-w-xs text-sm font-medium text-zinc-500">Specify. Validate. Deliver.</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-600">{column.title}</h3>
            <div className="mt-4 space-y-2">
              {column.links.map(([label, href]) => (
                <Link key={label} href={href} className="block text-sm font-medium text-zinc-500 hover:text-zinc-200">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-white/8 px-4 py-5 text-xs font-medium text-zinc-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <span>© 2026 AutoSpec AI. All rights reserved.</span>
        <span>Created by Lakshya Bhatnagar</span>
      </div>
    </footer>
  );
}
