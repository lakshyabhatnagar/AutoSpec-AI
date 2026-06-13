"use client";

import { Bell, Database, History, LockKeyhole, Palette, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { PageContainer } from "@/components/ui/layout";
import { cn } from "@/lib/utils";

const preferences = [
  { label: "Dark interface", value: true },
  { label: "Compact answers", value: true },
  { label: "Show retrieved context", value: true },
  { label: "Critical warnings", value: true },
];

const dataSettings = [
  { label: "Chat history", value: "Saved per account", icon: History },
  { label: "Knowledge base", value: "Public manuals", icon: Database },
  { label: "Authentication", value: "Bearer session", icon: LockKeyhole },
];

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <PageContainer className="max-w-none bg-[radial-gradient(circle_at_76%_24%,rgba(14,165,183,0.18),transparent_31%),radial-gradient(circle_at_18%_76%,rgba(244,246,248,0.06),transparent_34%),linear-gradient(135deg,#0B1220,#101827_48%,#0b1220)] pt-20">
      <main className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300 shadow-[0_0_28px_rgba(14,165,183,0.18)]">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold text-zinc-100">Settings</h1>
              <p className="truncate text-sm font-semibold text-zinc-500">{user?.email}</p>
            </div>
          </div>

          <nav className="space-y-1 border-t border-white/10 pt-5 text-sm font-bold text-zinc-500">
            {["Profile", "Preferences", "Data", "Security"].map((item, index) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className={cn(
                  "block rounded-full px-3 py-2 transition-colors hover:bg-white/[0.055] hover:text-zinc-200",
                  index === 0 && "bg-white/[0.06] text-cyan-200"
                )}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="space-y-8">
          <SettingsSection id="profile" icon={UserRound} title="Profile" subtitle="Account identity">
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadonlyField label="Name" value={user?.name || "Not available"} />
              <ReadonlyField label="Email" value={user?.email || "Not available"} />
            </div>
          </SettingsSection>

          <SettingsSection id="preferences" icon={Palette} title="Preferences" subtitle="Interface defaults">
            <div className="divide-y divide-white/8">
              {preferences.map((item) => (
                <ToggleRow key={item.label} label={item.label} enabled={item.value} />
              ))}
            </div>
          </SettingsSection>

          <SettingsSection id="data" icon={Database} title="Data" subtitle="Storage behavior">
            <div className="grid gap-3 md:grid-cols-3">
              {dataSettings.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="border-t border-white/10 pt-4">
                    <Icon className="h-4 w-4 text-cyan-300" />
                    <p className="mt-3 text-sm font-extrabold text-zinc-100">{item.label}</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </SettingsSection>

          <SettingsSection id="security" icon={ShieldCheck} title="Security" subtitle="Session controls">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatusItem icon={LockKeyhole} label="Password auth" value="Enabled" />
              <StatusItem icon={Bell} label="Account alerts" value="Planned" muted />
            </div>
          </SettingsSection>
        </section>
      </main>
    </PageContainer>
  );
}

function SettingsSection({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  id: string;
  icon: typeof UserRound;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-white/10 pt-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.055] text-cyan-300">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-zinc-100">{title}</h2>
          <p className="text-xs font-semibold text-zinc-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-600">{label}</span>
      <input
        value={value}
        readOnly
        className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm font-bold text-zinc-200 outline-none"
      />
    </label>
  );
}

function ToggleRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-sm font-bold text-zinc-300">{label}</span>
      <span
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors",
          enabled ? "bg-cyan-300/30" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-zinc-100 shadow-lg transition-transform",
            enabled ? "translate-x-6" : "translate-x-1"
          )}
        />
      </span>
    </div>
  );
}

function StatusItem({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-white/10 py-4">
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4", muted ? "text-zinc-600" : "text-cyan-300")} />
        <span className="text-sm font-bold text-zinc-300">{label}</span>
      </div>
      <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold", muted ? "bg-white/[0.055] text-zinc-500" : "bg-cyan-300/10 text-cyan-200")}>
        {value}
      </span>
    </div>
  );
}
