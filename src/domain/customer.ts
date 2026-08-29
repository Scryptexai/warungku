import type { ISODateTime } from "@/types/shared";

/**
 * Entitas Pelanggan — pembeli langganan warung, termasuk pembeli bon.
 */
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;

  /**
   * Total bon (piutang) yang belum lunas dalam Rupiah.
   * Nilai ini hanya berubah melalui transaksi & pelunasan (Tahap 4),
   * bukan diedit langsung.
   */
  outstandingBalance: number;
  /** Batas bon maksimum, bila pemilik warung menetapkannya. */
  creditLimit: number | null;

  isActive: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  creditLimit?: number | null;
}

/**
 * Catatan: `outstandingBalance` sengaja tidak ada di input update —
 * saldo bon hanya berubah melalui alur transaksi (Tahap 4).
 */
export interface UpdateCustomerInput {
  name?: string;
  phone?: string | null;
  address?: string | null;
  creditLimit?: number | null;
  isActive?: boolean;
}
