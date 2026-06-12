import { InfoPage } from "@/components/InfoPage";

type LegalSection = {
  title: string;
  body?: string;
  items?: string[];
};

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <InfoPage eyebrow={eyebrow} title={title} copy={`Last updated: ${updated}`} showAction={false}>
      <div className="max-w-3xl space-y-10 text-sm font-medium leading-7 text-zinc-400">
        <p className="text-base leading-8 text-zinc-300">{intro}</p>
        {sections.map((section) => (
          <section key={section.title} className="border-t border-white/10 pt-7">
            <h2 className="text-lg font-extrabold text-zinc-100">{section.title}</h2>
            {section.body && <p className="mt-3">{section.body}</p>}
            {section.items && (
              <ul className="mt-4 space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </InfoPage>
  );
}
