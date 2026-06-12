import Link from "next/link";
import { ExternalLink, Mail, MapPin } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";

const contacts = [
  { label: "Email", value: "lakshyabhatnagar1@gmail.com", href: "mailto:lakshyabhatnagar1@gmail.com", icon: Mail },
  { label: "GitHub", value: "github.com/lakshyabhatnagar", href: "https://github.com/lakshyabhatnagar", icon: ExternalLink },
  { label: "LinkedIn", value: "linkedin.com/in/lakshya-bhatnagar1", href: "https://linkedin.com/in/lakshya-bhatnagar1", icon: ExternalLink },
  { label: "Location", value: "New Delhi, India", href: "", icon: MapPin },
];

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Talk to Lakshya."
      copy="For AutoSpec AI, collaborations, support, or product questions, use the channels below."
      showAction={false}
    >
      <div className="grid max-w-4xl gap-4 sm:grid-cols-2">
        {contacts.map((item) => {
          const Icon = item.icon;
          const content = (
            <div className="group flex items-center gap-4 border-t border-white/10 py-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300 shadow-[0_0_22px_rgba(14,165,183,0.12)]">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">{item.label}</p>
                <p className="mt-1 truncate text-sm font-bold text-zinc-200 group-hover:text-cyan-100">{item.value}</p>
              </div>
            </div>
          );

          return item.href ? (
            <Link key={item.label} href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined}>
              {content}
            </Link>
          ) : (
            <div key={item.label}>{content}</div>
          );
        })}
      </div>
    </InfoPage>
  );
}
