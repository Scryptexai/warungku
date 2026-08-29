import type { JsonValue } from "@/types/shared";

/**
 * Hierarki error aplikasi.
 * Semua lapisan (layanan, repositori, sync, UI) melempar turunan AppError
 * agar UI dapat menampilkan pesan Indonesia yang ramah pengguna.
 */

export type AppErrorCode =
  | "NOT_CONNECTED"
  | "NOT_IMPLEMENTED"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "NETWORK_ERROR"
  | "STORAGE_ERROR"
  | "GOOGLE_API_ERROR"
  | "UNKNOWN";

export interface AppErrorOptions {
  code?: AppErrorCode;
  details?: JsonValue;
  retryable?: boolean;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details?: JsonValue;
  readonly retryable: boolean;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = options.code ?? "UNKNOWN";
    this.details = options.details;
    this.retryable = options.retryable ?? false;
  }
}

/** Terjadi saat fitur butuh koneksi Google yang belum dibuat (Tahap 2). */
export class NotConnectedError extends AppError {
  constructor(
    message = "Belum terhubung ke akun Google / Google Sheets warung.",
    options: AppErrorOptions = {},
  ) {
    super(message, { code: "NOT_CONNECTED", retryable: false, ...options });
    this.name = "NotConnectedError";
  }
}

/** Fitur memang ditunda untuk fase pengembangan berikutnya. */
export class NotImplementedError extends AppError {
  /** Fase roadmap yang akan mengimplementasikan fitur ini. */
  readonly phase: number | undefined;

  constructor(message: string, options: AppErrorOptions & { phase?: number } = {}) {
    super(message, { code: "NOT_IMPLEMENTED", retryable: false, ...options });
    this.name = "NotImplementedError";
    this.phase = options.phase;
  }
}

/** Input dari pengguna tidak valid. */
export class ValidationError extends AppError {
  constructor(message = "Data tidak valid.", details?: JsonValue) {
    super(message, { code: "VALIDATION_FAILED", details });
    this.name = "ValidationError";
  }
}

/** Data tidak ditemukan pada sumber yang diketahui. */
export class NotFoundError extends AppError {
  constructor(message = "Data tidak ditemukan.") {
    super(message, { code: "NOT_FOUND" });
    this.name = "NotFoundError";
  }
}

/** Normalisasi error apa pun menjadi AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(error.message, { code: "UNKNOWN", retryable: true, cause: error });
  }
  return new AppError("Terjadi kesalahan yang tidak diketahui.", {
    code: "UNKNOWN",
    retryable: true,
    details: String(error),
  });
}
