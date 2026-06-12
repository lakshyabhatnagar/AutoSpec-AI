"use client";

import { useAuth } from "@/components/AuthProvider";
import { PageContainer, Surface } from "@/components/ui/layout";

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <PageContainer className="max-w-none bg-[radial-gradient(circle_at_76%_24%,rgba(14,165,183,0.18),transparent_31%),linear-gradient(135deg,#0B1220,#101827_48%,#0b1220)]">
      <Surface className="mx-auto w-full max-w-3xl p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Settings</p>
        <h1 className="mt-3 text-2xl font-extrabold text-zinc-100">Profile</h1>
        <div className="mt-6 space-y-3 text-sm font-medium text-zinc-400">
          <p>Name: <span className="text-zinc-100">{user?.name}</span></p>
          <p>Email: <span className="text-zinc-100">{user?.email}</span></p>
        </div>
      </Surface>
    </PageContainer>
  );
}
