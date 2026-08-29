import { nowISO } from "@/lib/datetime";
import type { ISODateTime } from "./shared";

/**
 * Bentuk respons standar untuk seluruh API route Warungku.
 * Klien cukup memeriksa field `ok` untuk membedakan sukses/gagal.
 */

export interface ApiMeta {
  timestamp: ISODateTime;
}

export interface ApiSuccessBody<TData> {
  ok: true;
  data: TData;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

export type ApiBody<TData> = ApiSuccessBody<TData> | ApiErrorBody;

export function apiSuccess<TData>(data: TData): ApiSuccessBody<TData> {
  return { ok: true, data, meta: { timestamp: nowISO() } };
}

export function apiError(
  code: string,
  message: string,
  details?: unknown,
): ApiErrorBody {
  return {
    ok: false,
    error: { code, message, details },
    meta: { timestamp: nowISO() },
  };
}
