import { AlertTriangle, ArrowRight, FileSearch, Layers3, MessageSquare, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageContainer } from "@/components/ui/layout";

const pipelineSteps = [
  { label: "Ask", detail: "Vehicle question", icon: MessageSquare },
  { label: "Retrieve", detail: "Vector + BM25", icon: FileSearch },
  { label: "Rerank", detail: "Voyage AI", icon: Layers3 },
  { label: "Answer", detail: "Grounded output", icon: Sparkles },
];

export default function Home() {
  return (
    <PageContainer className="max-w-none gap-0 overflow-hidden px-0 py-0 pb-0 sm:px-0 lg:px-0">
      <section className="relative grid min-h-full overflow-hidden bg-[radial-gradient(circle_at_78%_28%,rgba(14,165,183,0.22),transparent_31%),radial-gradient(circle_at_20%_74%,rgba(244,246,248,0.08),transparent_34%),linear-gradient(135deg,#0B1220,#101827_48%,#0b1220)] px-6 py-8 pb-28 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:px-28">
        <div className="relative z-10 flex flex-col justify-center py-10 lg:py-0">
          <Image
            src="/logo.png"
            alt="AutoSpec AI - Specify. Validate. Deliver."
            width={630}
            height={154}
            priority
            className="mb-8 h-auto w-full max-w-[720px] object-contain object-left drop-shadow-[0_22px_60px_rgba(0,0,0,0.32)]"
          />

          <Link
            href="/chat"
            className="relative isolate mt-11 flex min-h-16 max-w-xl items-center gap-4 overflow-hidden rounded-full border border-white/10 px-4 text-sm font-semibold text-zinc-300 shadow-[0_0_38px_rgba(14,165,183,0.20),inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:border-cyan-300/30"
          >
            <span className="absolute inset-0 -z-10 rounded-full bg-[#2b3443]/82 backdrop-blur-xl" />
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300">
              <Search className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-left">Ask about a vehicle</span>
            <ArrowRight className="h-5 w-5 text-cyan-300" />
          </Link>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/critical"
              className="inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-400/8 px-4 py-2 text-xs font-bold text-red-200 transition-colors hover:bg-red-400/12"
            >
              <AlertTriangle className="h-4 w-4" />
              Critical
            </Link>
            <Link
              href="/debug"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/8 px-4 py-2 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-400/12"
            >
              <Layers3 className="h-4 w-4" />
              Debugger
            </Link>
          </div>
        </div>

        <div className="relative hidden min-h-[520px] lg:block">
          <svg
            className="absolute inset-0 h-full w-full text-cyan-200/20"
            viewBox="0 0 720 560"
            fill="none"
            aria-hidden="true"
          >
            <path d="M62 290 C180 110 410 88 632 224" stroke="currentColor" strokeWidth="1.4" />
            <path d="M110 404 C254 292 426 300 604 404" stroke="currentColor" strokeWidth="1" strokeDasharray="8 14" />
            <path d="M154 290 H610" stroke="currentColor" strokeWidth="1" />
            <path d="M220 338 C246 256 324 220 438 232 C516 242 566 280 604 338" stroke="currentColor" strokeWidth="1.6" />
            <path d="M184 338 H636" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="264" cy="368" r="45" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="558" cy="368" r="45" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="410" cy="282" r="198" stroke="currentColor" strokeWidth="1" opacity="0.45" />
            <circle cx="410" cy="282" r="128" stroke="currentColor" strokeWidth="1" opacity="0.28" />
          </svg>

          <div className="absolute right-6 top-16 h-[410px] w-[280px]">
            <div className="absolute left-[27px] top-10 h-[310px] w-px bg-gradient-to-b from-cyan-300/0 via-cyan-300/55 to-cyan-300/0 shadow-[0_0_22px_rgba(14,165,183,0.45)]" />
            {pipelineSteps.map((item, index) => {
              const Icon = item.icon;
              const positions = [
                "left-0 top-2",
                "left-0 top-[104px]",
                "left-0 top-[206px]",
                "left-0 top-[308px]",
              ];
              return (
                <div
                  key={item.label}
                  className={`absolute ${positions[index]} flex items-center gap-4`}
                >
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300 shadow-[0_0_34px_rgba(14,165,183,0.28)] backdrop-blur-xl ring-1 ring-cyan-200/25">
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0EA5B7] text-[10px] font-extrabold text-[#0B1220] shadow-[0_0_16px_rgba(14,165,183,0.7)]">
                      {index + 1}
                    </span>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="relative min-w-36">
                    <span className="absolute left-0 top-1/2 h-px w-10 -translate-x-12 bg-cyan-300/40 shadow-[0_0_12px_rgba(14,165,183,0.6)]" />
                    <p className="text-sm font-extrabold text-zinc-100 drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]">{item.label}</p>
                    <p className="text-[11px] font-semibold text-zinc-400 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
