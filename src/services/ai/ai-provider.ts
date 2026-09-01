/**
 * KONTRAK PENYEDIA AI (§8) — arsitektur yang BISA DIGANTI.
 *
 * Aplikasi tidak terikat satu vendor model: provider mana pun yang
 * mengimplementasikan `AiProvider` bisa dipasang tanpa menyentuh lapisan
 * data bisnis. Yang dikirim ke provider HANYA fakta terstruktur minimal —
 * bukan akses database.
 */

export type AiAnswerMode = "lokal" | "model";

export interface AiAnswer {
  text: string;
  mode: AiAnswerMode;
}

export interface AiExplainInput {
  question: string;
  intent: string;
  /** FAKTA terstruktur yang SUDAH dihitung deterministik oleh aplikasi. */
  facts: Record<string, unknown>;
  /** Label sumber data (ditampilkan ke pemilik). */
  sourceLabel: string;
  /** Jawaban deterministik — dipakai sebagai mode lokal & cadangan. */
  deterministicAnswer: string;
}

export interface AiProvider {
  id: string;
  explain(input: AiExplainInput): Promise<AiAnswer>;
}

/** Konfigurasi penyedia model jarak jauh (kompatibel OpenAI) — milik pemilik, disimpan di perangkat. */
export interface RemoteAiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class AiUnavailableError extends Error {
  constructor(message = "Layanan AI sedang tidak tersedia.") {
    super(message);
    this.name = "AiUnavailableError";
  }
}
