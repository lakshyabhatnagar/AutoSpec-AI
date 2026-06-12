import Link from "next/link";
import { ExternalLink, Mail } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";

const focusAreas = [
  "AI systems engineering",
  "Full-stack product development",
  "ML infrastructure and MLOps",
  "Backend systems and APIs",
];

const links = [
  { label: "GitHub", href: "https://github.com/lakshyabhatnagar", icon: ExternalLink },
  { label: "LinkedIn", href: "https://linkedin.com/in/lakshya-bhatnagar1", icon: ExternalLink },
  { label: "Email", href: "mailto:lakshyabhatnagar1@gmail.com", icon: Mail },
];

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About"
      title="Built by Lakshya Bhatnagar."
      copy="Lakshya is an AI/ML engineer and software developer building production-grade AI systems, scalable backend infrastructure, ML platforms, and modern full-stack applications."
      showAction={false}
    >
      <div className="grid max-w-4xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4 border-t border-white/10 pt-7 text-sm font-medium leading-7 text-zinc-400">
          <p>
            AutoSpec AI reflects that same focus: reliable retrieval, clean UX, and deployable AI workflows that teams can inspect and trust.
          </p>
          <p>
            The platform combines public automotive manuals, hybrid retrieval, Voyage AI reranking, structured outputs, and debugging surfaces for spec-first vehicle intelligence.
          </p>
        </section>

        <section className="space-y-5 border-t border-white/10 pt-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-600">Focus</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {focusAreas.map((item) => (
                <span key={item} className="rounded-full bg-white/[0.055] px-3 py-1.5 text-xs font-bold text-zinc-300">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  className="inline-flex items-center gap-2 text-sm font-bold text-cyan-200 transition-colors hover:text-cyan-100"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </InfoPage>
  );
}
