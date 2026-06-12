import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function InfoPage({
  eyebrow,
  title,
  copy,
  children,
  showAction = true,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children?: React.ReactNode;
  showAction?: boolean;
}) {
  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_72%_20%,rgba(14,165,183,0.18),transparent_30%),linear-gradient(135deg,#0B1220,#101827_48%,#0b1220)] px-4 py-16 pb-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.36em] text-cyan-300">{eyebrow}</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-zinc-500">{copy}</p>
        {showAction && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/chat" className="inline-flex items-center gap-2 rounded-full bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-300/15">
              Open Chat <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
        {children && <div className="mt-12">{children}</div>}
      </div>
    </main>
  );
}
