import { InfoPage } from "@/components/InfoPage";

const tiers = ["Free demo", "Private workspace", "Team knowledge base"];

export default function PricingPage() {
  return (
    <InfoPage
      eyebrow="Pricing"
      title="Simple plans for vehicle knowledge workflows."
      copy="Use the demo freely, then scale into private workspaces and team knowledge bases when needed."
    >
      <div className="flex flex-wrap gap-3">
        {tiers.map((tier) => (
          <span key={tier} className="rounded-full bg-white/[0.055] px-4 py-3 text-sm font-bold text-zinc-200">
            {tier}
          </span>
        ))}
      </div>
    </InfoPage>
  );
}
