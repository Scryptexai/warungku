import { AppError } from "./errors";

/**
 * Tipe Result untuk alur yang lebih aman daripada try/catch mentah.
 * Dipakai mulai Tahap 6 (asisten AI) dan pada operasi yang ingin
 * mengembalikan kegagalan secara eksplisit.
 */
export type Result<TValue, TError = AppError> =
  | { ok: true; value: TValue }
  | { ok: false; error: TError };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}
