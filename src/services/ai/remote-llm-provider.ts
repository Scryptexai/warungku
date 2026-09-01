/**
 * ADAPTER MODEL JARAK JAUH (§8) — API kompatibel OpenAI (chat/completions).
 * Bekerja dengan penyedia mana pun yang kompatibel (OpenAI, Groq, Together,
 * Ollama lokal, dll.) lewat baseUrl yang dipilih PEMILIK — arsitektur tetap
 * bisa diganti tanpa menyentuh lapisan data.
 *
 * PRIVASI: hanya FAKTA terstruktur minimal yang dikirim — bukan database.
 * Gagal/timeout → AiUnavailableError → aplikasi memakai jawaban lokal.
 */

import {
  AiUnavailableError,
  type AiAnswer,
  type AiExplainInput,
  type AiProvider,
  type RemoteAiConfig,
} from "./ai-provider";

const SYSTEM_PROMPT = [
  "Anda adalah asisten bisnis untuk pemilik warung kecil di Indonesia.",
  "ATURAN KETAT:",
  "1. Jawab HANYA berdasarkan FAKTA JSON yang diberikan. Jangan tambah atau ubah angka.",
  "2. Semua angka sudah dihitung aplikasi — JANGAN berhitung ulang.",
  "3. Jika fakta tidak memuat jawabannya, katakan datanya belum tersedia. Jangan menebak.",
  "4. Bahasa Indonesia sederhana, singkat (maksimal 3-4 kalimat), format Rupiah seperti Rp12.000.",
  "5. Anda hanya menganalisis dan menyarankan. JANGAN menawarkan mengubah harga, stok, transaksi, atau bon secara otomatis.",
  "6. Tidak ada istilah teknis. Tulis seperti asisten toko yang ramah.",
].join("\n");

const TIMEOUT_MS = 20_000;

export class RemoteLlmProvider implements AiProvider {
  readonly id: string;
  private readonly config: RemoteAiConfig;
  private readonly fetcher: typeof fetch;

  constructor(config: RemoteAiConfig, fetcher: typeof fetch = fetch) {
    this.config = config;
    this.fetcher = fetcher;
    this.id = `remote:${config.model}`;
  }

  async explain(input: AiExplainInput): Promise<AiAnswer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const url = `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
      const response = await this.fetcher(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0.2,
          max_tokens: 320,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: JSON.stringify({
                pertanyaan: input.question,
                sumber_data: input.sourceLabel,
                fakta: input.facts,
              }),
            },
          ],
        }),
      });
      if (!response.ok) {
        throw new AiUnavailableError(
          `Model AI menolak permintaan (status ${response.status}).`,
        );
      }
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = payload.choices?.[0]?.message?.content?.trim();
      if (!text) throw new AiUnavailableError("Model AI mengembalikan jawaban kosong.");
      return { text, mode: "model" };
    } catch (error) {
      if (error instanceof AiUnavailableError) throw error;
      throw new AiUnavailableError(
        "Model AI tidak bisa dihubungi. Periksa koneksi internet.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
