import { InfoPage } from "@/components/InfoPage";

const features = ["Grounded RAG chat", "Critical query flows", "Voyage reranking", "PDF manual upload", "Pipeline debugger", "Persistent history"];

export default function FeaturesPage() {
  return (
    <InfoPage eyebrow="Features" title="Spec-first automotive intelligence." copy="A compact workspace for asking, validating, and inspecting vehicle knowledge.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature} className="rounded-full bg-white/[0.055] px-4 py-3 text-sm font-bold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            {feature}
          </div>
        ))}
      </div>
    </InfoPage>
  );
}
