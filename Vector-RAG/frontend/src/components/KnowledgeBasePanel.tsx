"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Plus, X } from "lucide-react";
import { uploadPdfManual } from "@/services/api";
import { cn } from "@/lib/utils";

const initialCars = [
  { brand: "Maruti Suzuki", models: ["Victoris 2025", "Vitara Brezza 2025"] },
  { brand: "Tata", models: ["Nexon 2025", "Tiago 2025"] },
  { brand: "Toyota", models: ["Innova Crysta 2024", "Land Cruiser 300 2026"] },
];

type UploadedCar = {
  brand: string;
  model: string;
  years: number[];
};

export function KnowledgeBaseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
      aria-label="Open knowledge base"
    >
      <Plus className="h-5 w-5" />
    </button>
  );
}

export function KnowledgeBasePanel({
  open,
  onOpenChange,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedCar[]>([]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(4);
    const result = await uploadPdfManual(file, setProgress);
    setUploading(false);
    if (result.error || !result.data) {
      setError(result.error || "Upload failed");
      return;
    }
    const data = result.data;
    setUploaded((current) => [
      ...current,
      {
        brand: data.brand,
        model: data.car_model.replaceAll("_", " "),
        years: data.supported_years,
      },
    ]);
  };

  const body = (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col bg-zinc-950/35 shadow-[inset_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl",
        className
      )}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-sm font-extrabold text-zinc-100">Knowledge base</h2>
          <p className="text-xs font-medium text-zinc-600">Public manuals</p>
        </div>
        {onOpenChange && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 text-zinc-500 hover:bg-white/10 hover:text-zinc-100 lg:hidden"
            aria-label="Close knowledge base"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-5 pb-4">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-between rounded-full bg-white/[0.07] px-4 py-3 text-sm font-bold text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:text-zinc-500"
        >
          Add manual
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5">
        <div className="space-y-4">
          {[...initialCars, ...uploaded.map((car) => ({ brand: car.brand, models: [`${car.model} ${car.years[1] ?? ""}`.trim()] }))].map((group, index) => (
            <div key={`${group.brand}-${index}`} className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">{group.brand}</p>
              <div className="space-y-1.5">
                {group.models.map((model) => (
                  <div key={model} className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]" />
                    {model}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {uploading && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--app-accent)]" />
              Uploading chunks
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--app-accent)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-medium text-zinc-600">{progress}%</p>
          </div>
        )}

        {uploaded.length > 0 && !uploading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Manual indexed
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs font-semibold leading-5 text-red-300">
            <FileUp className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="line-clamp-4">{error}</span>
          </div>
        )}
      </div>
    </aside>
  );

  if (!onOpenChange) return body;

  return (
    <>
      <div className="hidden lg:block">{body}</div>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm lg:hidden">
          <div className="ml-auto h-full w-[min(360px,88vw)]">{body}</div>
        </div>
      )}
    </>
  );
}
