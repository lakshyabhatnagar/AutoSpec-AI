"use client";

import { useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { postCriticalQuery } from "@/services/api";
import { criticalResponseToSurface } from "@/services/a2ui-adapter";
import { A2UIRenderer } from "@/lib/a2ui-renderer";
import {
  criticalQueryConfigByType,
  criticalQueryConfigs,
  type CriticalQueryType,
} from "@/components/navigation";
import { KnowledgeBaseButton, KnowledgeBasePanel } from "@/components/KnowledgeBasePanel";
import { PageContainer, Surface } from "@/components/ui/layout";
import { QueryForm } from "@/components/ui/QueryForm";
import { EmptyState, ErrorState } from "@/components/ui/states";
import type { A2UISurface } from "@/types/a2ui";
import type { CriticalQueryResponse } from "@/types/api";
import { cn } from "@/lib/utils";

type CriticalMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  type: CriticalQueryType;
  surface?: A2UISurface;
  latencyMs?: number;
};

export function CriticalQueryPage({
  initialType = "maintenance",
}: {
  initialType?: CriticalQueryType;
}) {
  const [input, setInput] = useState("");
  const [queryType, setQueryType] = useState<CriticalQueryType>(initialType);
  const [messages, setMessages] = useState<CriticalMessage[]>([]);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const queryApi = useApi<CriticalQueryResponse>();
  const config = criticalQueryConfigByType[queryType];
  const Icon = config.icon;
  const tone = config.tone;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const selectedType = queryType;
    const selectedConfig = criticalQueryConfigByType[selectedType];
    const userMessage: CriticalMessage = {
      id: Date.now(),
      role: "user",
      text: userText,
      type: selectedType,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");

    const forcedQuery = `${userText} (context: ${selectedConfig.contextHint})`;
    const res = await queryApi.execute(() => postCriticalQuery({ query: forcedQuery }));
    const data = res.data;
    if (data) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: data.answer || "No answer returned.",
          type: selectedType,
          surface: criticalResponseToSurface(data),
          latencyMs: res.latencyMs,
        },
      ]);
    }
  };

  return (
    <PageContainer className="max-w-none bg-[radial-gradient(circle_at_76%_24%,rgba(14,165,183,0.18),transparent_31%),radial-gradient(circle_at_18%_76%,rgba(244,246,248,0.06),transparent_34%),linear-gradient(135deg,#0B1220,#101827_48%,#0b1220)] py-3 pr-0">
      <Surface className="relative mb-3 mr-4 shrink-0 overflow-hidden p-3">
        <div className={cn("absolute inset-y-0 left-0 w-1", tone.soft)} />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-full shadow-[0_0_22px_rgba(14,165,183,0.12)]", tone.soft)}>
              <Icon className={cn("h-4 w-4", tone.accent)} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Critical Query Chat</h2>
              <p className="text-xs font-semibold text-zinc-500">{config.hint}</p>
            </div>
          </div>
          <span className={cn("w-fit rounded-full px-2 py-1 text-xs font-bold", tone.soft, tone.accent)}>
            {config.label}
          </span>
        </div>
      </Surface>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-3 pb-2">
            {messages.length === 0 && !queryApi.loading && !queryApi.error && (
              <EmptyState
                icon={Icon}
                title="Choose a type and ask once."
                description={config.example}
                className="min-h-64 md:min-h-80"
              />
            )}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {queryApi.loading && (
              <div className="flex justify-start">
                <div className="flex max-w-3xl items-center gap-3 rounded-3xl bg-white/[0.055] px-4 py-3 text-sm font-medium text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--app-accent)]" />
                  Working...
                </div>
              </div>
            )}

            {queryApi.error && <ErrorState message={queryApi.error} />}
          </div>
        </div>

        <div className="sticky bottom-24 shrink-0 bg-transparent pt-2">
          <QueryForm
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            loading={queryApi.loading}
            placeholder={config.example}
            tone="critical"
            leftSlot={<KnowledgeBaseButton onClick={() => setKnowledgeOpen(true)} />}
            rightSlot={<EndpointDropdown value={queryType} onChange={setQueryType} compact />}
            ariaLabel="Send critical query"
            className={cn("border-white/10 bg-white/[0.065]", tone.glow)}
          />
        </div>
      </div>
      <KnowledgeBasePanel open={knowledgeOpen} onOpenChange={setKnowledgeOpen} />
      </div>
    </PageContainer>
  );
}

function EndpointDropdown({
  value,
  onChange,
  compact = false,
}: {
  value: CriticalQueryType;
  onChange: (value: CriticalQueryType) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = criticalQueryConfigByType[value];
  const selectedTone = selected.tone;

  return (
    <div className={cn("relative shrink-0", compact && "hidden sm:block")}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm font-bold text-zinc-100 outline-none transition-colors hover:border-zinc-700 hover:bg-zinc-900 focus:border-[var(--app-accent)]",
          compact ? cn("h-10 min-w-40 rounded-full bg-white/5", selectedTone.border, selectedTone.text) : "h-10 w-64"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute bottom-full right-0 z-50 mb-2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl shadow-black/60 backdrop-blur-xl",
            compact ? "w-56" : "w-64"
          )}
          role="listbox"
        >
          {criticalQueryConfigs.map((item) => {
            const active = item.value === value;
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                  active
                    ? cn(item.tone.soft, item.tone.text)
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                )}
                role="option"
                aria-selected={active}
              >
                <Icon className={cn("h-4 w-4", active ? item.tone.accent : "text-zinc-600")} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {active && <Check className={cn("h-4 w-4", item.tone.accent)} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: CriticalMessage }) {
  const config = criticalQueryConfigByType[message.type];
  const Icon = config.icon;
  const user = message.role === "user";
  const tone = config.tone;

  return (
    <div className={cn("flex", user ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-3xl rounded-[28px] px-5 py-4",
          user
            ? cn("rounded-br-xl bg-white/[0.07] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl")
            : cn("rounded-bl-xl bg-white/[0.055] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl")
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          {!user && <Icon className={cn("h-4 w-4", tone.accent)} />}
          <span className={cn("text-xs font-bold uppercase", user ? tone.accent : "text-zinc-500")}>
            {user ? config.label : "AutoSpec AI"}
          </span>
          {message.latencyMs !== undefined && (
            <span className="ml-auto font-mono text-[10px] text-zinc-600">{message.latencyMs}ms</span>
          )}
        </div>
        {message.surface ? (
          <div className="space-y-3">
            <A2UIRenderer surface={message.surface} />
          </div>
        ) : (
          <p className="text-sm font-medium leading-6">{message.text}</p>
        )}
      </div>
    </div>
  );
}
