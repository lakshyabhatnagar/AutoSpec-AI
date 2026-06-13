"use client";

import { useEffect, useState } from "react";
import { Bot, Database, History, Loader2, MessageSquare, Plus, UserRound } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { createChatSession, fetchChatSession, fetchChatSessions, postQuery, saveChatMessage } from "@/services/api";
import { queryResponseToSurface } from "@/services/a2ui-adapter";
import { A2UIRenderer } from "@/lib/a2ui-renderer";
import { ChunkCard } from "@/components/ChunkCard";
import { KnowledgeBaseButton, KnowledgeBasePanel } from "@/components/KnowledgeBasePanel";
import { MarkdownText } from "@/components/MarkdownText";
import { QueryModeSelector } from "@/components/QueryModeSelector";
import { PageContainer, Surface } from "@/components/ui/layout";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { QueryForm } from "@/components/ui/QueryForm";
import type { ChatMessage, ChatSession, QueryResponse, RetrievalMode, RetrievedChunk } from "@/types/api";
import type { A2UISurface } from "@/types/a2ui";

type LocalMessage = Pick<ChatMessage, "role" | "content" | "createdAt"> & {
  surface?: A2UISurface;
  latencyMs?: number;
};

function queryResponseFromMetadata(metadata?: Record<string, unknown> | null) {
  const response = metadata?.response;
  if (!response || typeof response !== "object") return null;
  if (!("answer" in response) || !("retrieved_chunks" in response)) return null;
  return response as QueryResponse;
}

function toLocalMessage(message: ChatMessage): LocalMessage {
  const response = queryResponseFromMetadata(message.metadata);
  return {
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    surface: response ? queryResponseToSurface(response) : undefined,
  };
}

function latestChunksFromMessages(messages: ChatMessage[]) {
  const assistantMessages = [...messages].reverse();
  for (const message of assistantMessages) {
    const response = queryResponseFromMetadata(message.metadata);
    if (response?.retrieved_chunks) return response.retrieved_chunks;
  }
  return [];
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<RetrievalMode>("hybrid_rerank");
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
    setChunks([]);
    setSessions((current) => [res.data!, ...current]);
  };

  const openSession = async (sessionId: string) => {
    const res = await fetchChatSession(sessionId);
    if (!res.data) return;
    setActiveSessionId(res.data.session.id);
    setMessages(res.data.messages.map(toLocalMessage));
    setChunks(latestChunksFromMessages(res.data.messages));
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
        setMessages(res.data.messages.map(toLocalMessage));
        setChunks(latestChunksFromMessages(res.data.messages));
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
      setChunks(res.data.retrieved_chunks);
      const assistantMessage: LocalMessage = {
        role: "assistant",
        content: res.data.answer,
        createdAt: new Date().toISOString(),
        surface: queryResponseToSurface(res.data),
        latencyMs: res.latencyMs,
      };
      setMessages((current) => [...current, assistantMessage]);
      await saveChatMessage(sessionId, { role: "assistant", content: res.data.answer, metadata: { response: res.data } });
      void loadSessions();
    }
  };

  return (
    <PageContainer className="max-w-none bg-[radial-gradient(circle_at_76%_24%,rgba(14,165,183,0.18),transparent_31%),radial-gradient(circle_at_18%_76%,rgba(244,246,248,0.06),transparent_34%),linear-gradient(135deg,#0B1220,#101827_48%,#0b1220)] pb-0 pt-20 pr-0">
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
            {messages.length === 0 && !queryApi.loading && !queryApi.error && (
              <EmptyState
                icon={MessageSquare}
                title="Ask a vehicle question."
                description="Try: What does the ABS warning mean?"
                className="min-h-64 md:min-h-80"
              />
            )}

            {queryApi.error && <ErrorState message={queryApi.error} />}

            {messages.length > 0 && (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <ChatBubble key={`${message.createdAt}-${index}`} message={message} />
                ))}
              </div>
            )}

            {queryApi.loading && <TypingBubble />}

            {chunks.length > 0 && !queryApi.loading && (
              <section className="space-y-3 pt-2">
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

function ChatBubble({ message }: { message: LocalMessage }) {
  const user = message.role === "user";
  return (
    <div className={`flex gap-3 ${user ? "justify-end" : "justify-start"}`}>
      {!user && (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300 shadow-[0_0_24px_rgba(14,165,183,0.16)]">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={`max-w-3xl ${user ? "order-first" : ""}`}>
        <div className={`mb-1 flex items-center gap-2 ${user ? "justify-end" : "justify-start"}`}>
          <span className="text-xs font-extrabold text-zinc-500">{user ? "You" : "AutoSpec AI"}</span>
          {!user && message.latencyMs !== undefined && (
            <span className="font-mono text-[10px] text-zinc-600">{message.latencyMs}ms</span>
          )}
        </div>
        <div
          className={`rounded-[1.8rem] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl ${
            user
              ? "rounded-br-md bg-cyan-300/12 text-zinc-100"
              : "rounded-bl-md bg-white/[0.06] text-zinc-200"
          }`}
        >
          {message.surface ? (
            <A2UIRenderer surface={message.surface} />
          ) : (
            <MarkdownText text={message.content} />
          )}
        </div>
      </div>
      {user && (
        <div className="mt-6 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-zinc-300">
          <UserRound className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start gap-3">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300 shadow-[0_0_24px_rgba(14,165,183,0.16)]">
        <Bot className="h-4 w-4" />
      </div>
      <div>
        <div className="mb-1 text-xs font-extrabold text-zinc-500">AutoSpec AI</div>
        <div className="flex items-center gap-3 rounded-[1.8rem] rounded-bl-md bg-white/[0.06] px-5 py-4 text-sm font-semibold text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
          Typing...
        </div>
      </div>
    </div>
  );
}
