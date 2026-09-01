"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * LAYAR ASISTEN AI TOKO (§8) — tanya-jawab data toko sendiri.
 * Setiap jawaban menyertakan SUMBER DATA yang dipakai. Mode lokal
 * (deterministik, offline) selalu tersedia; model jarak jauh opsional
 * dan kegagalannya tidak pernah mengganggu kasir.
 */

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sourceLabel?: string;
  mode?: "lokal" | "model";
  usedFallback?: boolean;
}

const QUICK_GROUPS: Array<{ title: string; questions: string[] }> = [
  {
    title: "Penjualan",
    questions: [
      "Omzet hari ini berapa?",
      "Omzet minggu ini?",
      "Omzet bulan ini?",
      "Omzet minggu ini naik atau turun dibanding minggu lalu?",
    ],
  },
  {
    title: "Produk",
    questions: [
      "Produk paling laku minggu ini?",
      "Produk apa yang sepi?",
    ],
  },
  {
    title: "Stok",
    questions: [
      "Stok apa yang mulai sedikit?",
      "Produk apa yang perlu saya perhatikan?",
    ],
  },
  {
    title: "Bon",
    questions: [
      "Siapa yang masih punya Bon?",
      "Bon terbesar siapa?",
      "Total Bon yang belum dibayar berapa?",
    ],
  },
];

const inputClass =
  "min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400";

export function AiScreen() {
  const { assistant, localStore } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text:
        "Halo! 👋 Saya asisten bisnis warung Anda. Tanya apa saja soal penjualan, produk, stok, atau bon — jawaban saya selalu dari data toko Anda sendiri.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [connectedModel, setConnectedModel] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void assistant.getRemoteConfig().then((config) => {
      if (config) setConnectedModel(config.model);
    });
  }, [assistant]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setThinking(true);
    try {
      const result = await assistant.ask(trimmed);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: result.text,
          sourceLabel: result.sourceLabel,
          mode: result.mode,
          usedFallback: result.usedFallback,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "Maaf, saya gagal membaca data toko sebentar ini. Data Anda tetap aman dan kasir tetap bisa dipakai — silakan coba lagi.",
          sourceLabel: "—",
          mode: "lokal",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function saveConnection(connect: boolean) {
    setSettingsError(null);
    try {
      if (connect) {
        if (!baseUrl.trim() || !model.trim() || !apiKey.trim()) {
          setSettingsError("Isi alamat, nama model, dan kunci API.");
          return;
        }
        await localStore.setAiProviderConfig({
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey.trim(),
        });
        setConnectedModel(model.trim());
      } else {
        await localStore.setAiProviderConfig(null);
        setConnectedModel(null);
        setApiKey("");
      }
      setSettingsOpen(false);
    } catch {
      setSettingsError("Gagal menyimpan pengaturan. Coba lagi.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Status penyedia */}
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5 ring-1 ring-stone-900/5">
        <p className="flex items-center gap-2 text-[11px] leading-snug text-stone-500">
          <Icon
            name={connectedModel ? "cloud" : "cloudOff"}
            className={cn("h-4 w-4 shrink-0", connectedModel ? "text-brand-600" : "text-stone-400")}
          />
          {connectedModel ? (
            <>
              Model <b className="text-stone-700">{connectedModel}</b> terhubung —
              gagal memanggilnya otomatis memakai jawaban lokal.
            </>
          ) : (
            <>
              Mode lokal: jawaban langsung dari data perangkat, tanpa internet.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500"
          aria-label="Pengaturan model AI"
        >
          <Icon name="settings" className="h-4 w-4" />
        </button>
      </div>

      {/* Percakapan */}
      <div className="space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex items-start gap-2",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {message.role === "assistant" ? (
              // eslint-disable-next-line @next/next/no-img-element -- aset statis lokal
              <img
                src="/images/ai-assistant.jpg"
                alt="Asisten AI Warungku"
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-brand-100"
              />
            ) : null}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed",
                message.role === "user"
                  ? "rounded-tr-sm bg-brand-600 text-white"
                  : "rounded-tl-sm bg-white text-stone-700 ring-1 ring-stone-900/5",
              )}
            >
              <p className="whitespace-pre-wrap">{message.text}</p>
              {message.role === "assistant" && message.sourceLabel ? (
                <p className="mt-2 border-t border-stone-100 pt-1.5 text-[10px] leading-snug text-stone-400">
                  Sumber: {message.sourceLabel}
                  {message.mode === "model" ? " · dijelaskan model AI" : " · mode lokal"}
                  {message.usedFallback ? " (model tidak tersedia)" : ""}
                </p>
              ) : null}
            </div>
          </div>
        ))}
        {thinking ? (
          <div className="flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- aset statis lokal */}
            <img
              src="/images/ai-assistant.jpg"
              alt="Asisten AI Warungku"
              className="h-9 w-9 shrink-0 animate-pulse rounded-full object-cover ring-2 ring-brand-100"
            />
            <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 ring-1 ring-stone-900/5">
              <span className="flex gap-1" aria-label="Sedang berpikir">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400"
                    style={{ animationDelay: `${dot * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* Pertanyaan cepat */}
      <section aria-label="Pertanyaan cepat" className="space-y-2">
        {QUICK_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-400">
              {group.title}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {group.questions.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={thinking}
                  onClick={() => void ask(item)}
                  className="min-h-8 rounded-full border border-stone-200 bg-white px-3 text-[11px] font-semibold text-stone-600 active:scale-[0.98] disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Input */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="sticky bottom-20 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ketik pertanyaan soal toko Anda…"
          aria-label="Pertanyaan untuk asisten AI"
          className="flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
        />
        <button
          type="submit"
          disabled={thinking || !question.trim()}
          aria-label="Kirim pertanyaan"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white disabled:bg-stone-200 disabled:text-stone-400"
        >
          <Icon name="send" className="h-4 w-4" />
        </button>
      </form>

      <p className="text-center text-[10px] leading-snug text-stone-400">
        Asisten hanya membaca data toko (tanpa mengubah apa pun). Pertanyaan di
        luar data toko tidak dijawab agar tidak ada jawaban karangan.
      </p>

      {/* Pengaturan model (opsional, satu penyedia kompatibel OpenAI) */}
      {settingsOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
          <div className="animate-sheet-up w-full max-w-lg rounded-t-3xl bg-white p-5 pb-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-stone-900">Model AI (opsional)</h2>
                <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
                  Sambungkan model kompatibel OpenAI (mis. OpenAI, Groq, atau
                  server sendiri). Kunci disimpan hanya di perangkat ini dan
                  hanya fakta ringkasan yang dikirim — bukan data mentah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-stone-500">
                  Alamat API (mis. https://api.openai.com/v1)
                </span>
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  inputMode="url"
                  autoComplete="off"
                  className={inputClass}
                  placeholder="https://api.openai.com/v1"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-stone-500">
                  Nama model (mis. gpt-4o-mini)
                </span>
                <input
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className={inputClass}
                  placeholder="gpt-4o-mini"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-stone-500">
                  Kunci API
                </span>
                <input
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  type="password"
                  autoComplete="off"
                  className={inputClass}
                  placeholder="sk-…"
                />
              </label>
              {settingsError ? (
                <p role="alert" className="text-xs text-red-600">
                  {settingsError}
                </p>
              ) : null}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void saveConnection(true)}
                  className="min-h-11 flex-1 rounded-xl bg-stone-900 text-sm font-bold text-white active:scale-[0.99]"
                >
                  Sambungkan
                </button>
                {connectedModel ? (
                  <button
                    type="button"
                    onClick={() => void saveConnection(false)}
                    className="min-h-11 flex-1 rounded-xl border-2 border-stone-200 text-sm font-bold text-stone-600 active:scale-[0.99]"
                  >
                    Pakai mode lokal
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
