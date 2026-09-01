/**
 * LAYANAN ASISTEN AI TOKO (§8) — orkestrator:
 *
 *   PERTANYAAN → INTENSI → KUERI DATA LOKAL TERARAH → FAKTA TERSTRUKTUR
 *   → (model menjelaskan bila tersedia) → JAWABAN + SUMBER DATA
 *
 * Jaminan:
 * - Kegagalan model TIDAK PERNAH mengganggu kasir — asisten hanya membaca.
 * - Model tidak tersedia → jawaban deterministik lokal tetap keluar.
 * - Pertanyaan di luar cakupan → ditolak sopan, tanpa angka karangan.
 */

import type { LocalStore } from "@/data/local/local-store";
import {
  LocalExplainerProvider,
  composeDeterministicAnswer,
  outOfScopeAnswer,
} from "./local-explainer";
import { detectIntent } from "./intent";
import { runToolForIntent, type AiDataset } from "./store-data-tools";
import {
  RemoteLlmProvider,
} from "./remote-llm-provider";
import type { AiAnswer, AiProvider } from "./ai-provider";

export interface AssistantAskResult extends AiAnswer {
  /** Label sumber data — ditampilkan agar pemilik tahu datanya dari mana. */
  sourceLabel: string;
  intentKind: string;
  /** True bila model jarak jauh gagal dan sistem memakai jawaban lokal. */
  usedFallback: boolean;
}

export interface AssistantDeps {
  localStore: LocalStore;
  /** Uji/disuntik: pabrik penyedia khusus (default: dari konfigurasi pemilik). */
  providerFactory?: () => AiProvider;
}

const localProvider = new LocalExplainerProvider();

export class AssistantService {
  private readonly localStore: LocalStore;
  private readonly providerFactory?: () => AiProvider;

  constructor(deps: AssistantDeps) {
    this.localStore = deps.localStore;
    this.providerFactory = deps.providerFactory;
  }

  /** Konfigurasi model pemilik (untuk UI status) — null = mode lokal. */
  async getRemoteConfig(): Promise<{ model: string } | null> {
    const config = await this.localStore.getAiProviderConfig();
    return config ? { model: config.model } : null;
  }

  async ask(question: string, now = new Date()): Promise<AssistantAskResult> {
    const trimmed = question.trim();
    if (!trimmed) {
      return {
        text: outOfScopeAnswer(),
        mode: "lokal",
        sourceLabel: "—",
        intentKind: "UNKNOWN",
        usedFallback: false,
      };
    }
    const intent = detectIntent(trimmed);

    // Pertanyaan di luar data toko → JANGAN kirim ke model apa pun
    // (mencegah halusinasi & menjaga privasi).
    if (intent.kind === "UNKNOWN") {
      return {
        text: outOfScopeAnswer(),
        mode: "lokal",
        sourceLabel: "Hanya data toko Anda",
        intentKind: intent.kind,
        usedFallback: false,
      };
    }

    // Kueri lokal terarah (bukan "kirim seluruh database").
    const [transactions, products, customers, stockThresholds, providerConfig] =
      await Promise.all([
        this.localStore.getAllTransactions(),
        this.localStore.getCachedProducts(),
        this.localStore.getCachedCustomers(),
        this.localStore.getLowStockThresholds(),
        this.providerFactory ? Promise.resolve(null) : this.localStore.getAiProviderConfig(),
      ]);
    const dataset: AiDataset = { transactions, products, customers, stockThresholds };

    const toolResult = runToolForIntent(dataset, intent, now, trimmed);
    if (!toolResult) {
      return {
        text: outOfScopeAnswer(),
        mode: "lokal",
        sourceLabel: "Hanya data toko Anda",
        intentKind: intent.kind,
        usedFallback: false,
      };
    }

    const deterministicAnswer = composeDeterministicAnswer(toolResult.facts);

    const provider = this.providerFactory
      ? this.providerFactory()
      : providerConfig && providerConfig.apiKey && providerConfig.baseUrl && providerConfig.model
        ? new RemoteLlmProvider(providerConfig)
        : localProvider;

    try {
      const answer = await provider.explain({
        question: trimmed,
        intent: intent.kind,
        facts: toolResult.facts,
        sourceLabel: toolResult.sourceLabel,
        deterministicAnswer,
      });
      return {
        text: answer.text,
        mode: answer.mode,
        sourceLabel: toolResult.sourceLabel,
        intentKind: intent.kind,
        usedFallback: false,
      };
    } catch {
      // Model gagal → jawaban deterministik tetap keluar; kasir tak terganggu.
      return {
        text: deterministicAnswer,
        mode: "lokal",
        sourceLabel: toolResult.sourceLabel,
        intentKind: intent.kind,
        usedFallback: true,
      };
    }
  }
}
