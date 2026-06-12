"use client";

import { useEffect, useState } from "react";
import { Database, History, MessageSquare, Plus, Sparkles } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { createChatSession, fetchChatSession, fetchChatSessions, postQuery, saveChatMessage } from "@/services/api";
import { queryResponseToSurface } from "@/services/a2ui-adapter";
import { A2UIRenderer } from "@/lib/a2ui-renderer";
import { ChunkCard } from "@/components/ChunkCard";
import { KnowledgeBaseButton, KnowledgeBasePanel } from "@/components/KnowledgeBasePanel";
import { QueryModeSelector } from "@/components/QueryModeSelector";
import { PageContainer, Surface } from "@/components/ui/layout";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { QueryForm } from "@/components/ui/QueryForm";
import type { ChatMessage, ChatSession, QueryResponse, RetrievalMode, RetrievedChunk } from "@/types/api";
import type { A2UISurface } from "@/types/a2ui";

type LocalMessage = Pick<ChatMessage, "role" | "content" | "createdAt">;

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<RetrievalMode>("hybrid_rerank");
  const [surface, setSurface] = useState<A2UISurface | null>(null);
  const [chunks, setChunks] = useState<RetrievedChunk[]>([]);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const queryApi = useApi<QueryResponse>();

  const loadSessions = async () => {
    const res = await fetchChatSessions();
    if (res.data) setSessions(res.data);
  };

  const startNewChat = async () => {
    const res = await createChatSession("New chat");
    if (!res.data) return;
    setActiveSessionId(res.data.id);
    setMessages([]);
    setSurface(null);
    setChunks([]);
    setSessions((current) => [res.data!, ...current]);
  };

  const openSession = async (sessionId: string) => {
    const res = await fetchChatSession(sessionId);
    if (!res.data) return;
    setActiveSessionId(res.data.session.id);
    setMessages(res.data.messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })));
    setSurface(null);
    setChunks([]);
    setHistoryOpen(false);
  };

  useEffect(() => {
    let mounted = true;
    fetchChatSessions().then((res) => {
      if (mounted && res.data) setSessions(res.data);
    });
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session");
    if (sessionId) {
      fetchChatSession(sessionId).then((res) => {
        if (!mounted || !res.data) return;
        setActiveSessionId(res.data.session.id);
        setMessages(res.data.messages.map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        })));
      });
    }
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");

    let sessionId = activeSessionId;
    if (!sessionId) {
      const sessionRes = await createChatSession(userText.slice(0, 80));
      if (!sessionRes.data) return;
      sessionId = sessionRes.data.id;
      setActiveSessionId(sessionId);
      setSessions((current) => [sessionRes.data!, ...current]);
    }

    const userMessage: LocalMessage = { role: "user", content: userText, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, userMessage]);
    await saveChatMessage(sessionId, { role: "user", content: userText });

    const res = await queryApi.execute(() => postQuery({ query: userText, mode }));
    if (res.data) {
      setSurface(queryResponseToSurface(res.data));
      setChunks(res.data.retrieved_chunks);
      const assistantMessage: LocalMessage = { role: "assistant", content: res.data.answer, createdAt: new Date().toISOString() };
      setMessages((current) => [...current, assistantMessage]);
      await saveChatMessage(sessionId, { role: "assistant", content: res.data.answer, metadata: { response: res.data } });
      void loadSessions();
    }
  };

  return (
    <PageContainer className="max-w-none bg-[radial-gradient(circle_at_76%_24%,rgba(14,165,183,0.18),transparent_31%),radial-gradient(circle_at_18%_76%,rgba(244,246,248,0.06),transparent_34%),linear-gradient(135deg,#0B1220,#101827_48%,#0b1220)] py-3 pr-0">
      <Surface className="mb-3 mr-4 shrink-0 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300 shadow-[0_0_22px_rgba(14,165,183,0.14)]">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Grounded chat</h2>
              <p className="text-xs font-semibold text-zinc-500">Ask the corpus.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={startNewChat} className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/[0.09]">
              <Plus className="h-3.5 w-3.5" /> New
            </button>
            <button onClick={() => setHistoryOpen((current) => !current)} className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/[0.09]">
              <History className="h-3.5 w-3.5" /> History
            </button>
            <QueryModeSelector value={mode} onChange={setMode} />
          </div>
        </div>
      </Surface>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-h-0 flex-col gap-3">
        {historyOpen && (
          <div className="space-y-1 rounded-[2rem] bg-white/[0.045] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
            {sessions.length === 0 && <p className="px-3 py-2 text-sm font-semibold text-zinc-500">No saved chats.</p>}
            {sessions.slice(0, 6).map((session) => (
              <button key={session.id} onClick={() => void openSession(session.id)} className="block w-full truncate rounded-full px-3 py-2 text-left text-sm font-semibold text-zinc-300 hover:bg-white/[0.07]">
                {session.title}
              </button>
            ))}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-3 pb-2">
            {messages.length === 0 && !surface && !queryApi.loading && !queryApi.error && (
              <EmptyState
                icon={MessageSquare}
                title="Ask a vehicle question."
                description="Try: What does the ABS warning mean?"
                className="min-h-64 md:min-h-80"
              />
            )}

            {queryApi.loading && <LoadingState label="Running retrieval and generation..." />}
            {queryApi.error && <ErrorState message={queryApi.error} />}

            {surface && !queryApi.loading && (
              <div className="space-y-4">
                {messages.length > 0 && (
                  <div className="space-y-2">
                    {messages.map((message, index) => (
                      <div key={`${message.createdAt}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-3xl rounded-[1.6rem] bg-white/[0.055] px-4 py-3 text-sm font-medium leading-6 text-zinc-200 backdrop-blur-xl ${message.role === "user" ? "rounded-br-md" : "rounded-bl-md"}`}>
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Surface className="p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-zinc-500" />
                      <h3 className="text-sm font-semibold text-zinc-100">Response</h3>
                    </div>
                    {queryApi.latencyMs !== null && (
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-xs text-zinc-500">
                        {queryApi.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <A2UIRenderer surface={surface} />
                </Surface>

                {chunks.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase text-zinc-500">
                      <Database className="h-4 w-4" />
                      Retrieved Context ({chunks.length})
                    </div>
                    <div className="space-y-2">
                      {chunks.map((chunk, index) => (
                        <ChunkCard key={index} chunk={chunk} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
            {!surface && messages.length > 0 && (
              <div className="space-y-2">
                {messages.map((message, index) => (
                  <div key={`${message.createdAt}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-3xl rounded-[1.6rem] bg-white/[0.055] px-4 py-3 text-sm font-medium leading-6 text-zinc-200 backdrop-blur-xl ${message.role === "user" ? "rounded-br-md" : "rounded-bl-md"}`}>
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-24 shrink-0 bg-transparent pt-2">
          <QueryForm
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            loading={queryApi.loading}
            placeholder="Ask about a vehicle"
            ariaLabel="Send chat query"
            leftSlot={<KnowledgeBaseButton onClick={() => setKnowledgeOpen(true)} />}
            className="border-white/10 shadow-[0_0_34px_rgba(52,211,153,0.22)]"
          />
        </div>
      </div>
      <KnowledgeBasePanel open={knowledgeOpen} onOpenChange={setKnowledgeOpen} />
      </div>
    </PageContainer>
  );
}
