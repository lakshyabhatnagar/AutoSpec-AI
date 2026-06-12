"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { deleteChatSession, fetchChatSessions } from "@/services/api";
import { PageContainer, Surface } from "@/components/ui/layout";
import type { ChatSession } from "@/types/api";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchChatSessions().then((res) => {
      if (mounted && res.data) setSessions(res.data);
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const remove = async (id: string) => {
    await deleteChatSession(id);
    setSessions((current) => current.filter((session) => session.id !== id));
  };

  return (
    <PageContainer className="max-w-none bg-[radial-gradient(circle_at_76%_24%,rgba(14,165,183,0.18),transparent_31%),linear-gradient(135deg,#0B1220,#101827_48%,#0b1220)]">
      <Surface className="mx-auto w-full max-w-4xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">History</p>
            <h1 className="mt-2 text-2xl font-extrabold text-zinc-100">Saved chats</h1>
          </div>
          <Link href="/chat" className="rounded-full bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-200">New chat</Link>
        </div>

        <div className="mt-6 space-y-2">
          {loading && <p className="text-sm font-semibold text-zinc-500">Loading...</p>}
          {!loading && sessions.length === 0 && <p className="text-sm font-semibold text-zinc-500">No saved chats yet.</p>}
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-3 rounded-3xl bg-white/[0.045] px-4 py-3">
              <MessageSquare className="h-4 w-4 text-cyan-300" />
              <Link href={`/chat?session=${session.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zinc-100">{session.title}</p>
                <p className="text-xs font-medium text-zinc-600">{new Date(session.updatedAt).toLocaleString()}</p>
              </Link>
              <button onClick={() => void remove(session.id)} className="rounded-full p-2 text-zinc-600 hover:bg-red-300/10 hover:text-red-300" aria-label="Delete chat">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Surface>
    </PageContainer>
  );
}
