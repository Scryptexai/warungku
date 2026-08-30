import type { ISODateTime } from "@/types/shared";

/**
 * Entitas Warung — merepresentasikan toko yang terhubung ke aplikasi.
 * Setiap warung memiliki Google Sheet miliknya sendiri (tersambung di Tahap 2).
 */
export interface Store {
  id: string;
  name: string;
  ownerName: string | null;
  address: string | null;
  phone: string | null;

  /**
   * ID Google Spreadsheet milik warung.
   * Null sampai warung menghubungkan akun Google-nya pada Tahap 2.
   */
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;

  /** Mata uang default (konvensi aplikasi: "IDR"). */
  currency: string;
  /** Lokal default (konvensi aplikasi: "id-ID"). */
  locale: string;
  /** Zona waktu default (konvensi aplikasi: "Asia/Jakarta"). */
  timezone: string;

  /** Kapan warung pertama kali terhubung ke Google Sheets. */
  connectedAt: ISODateTime | null;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Perubahan profil warung yang diizinkan (properti Google dikelola Tahap 2). */
export interface UpdateStoreProfileInput {
  name?: string;
  ownerName?: string | null;
  address?: string | null;
  phone?: string | null;
}
