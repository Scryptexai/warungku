import type {
  CreateCustomerInput,
  Customer,
  UpdateCustomerInput,
} from "@/domain";
import type { LocalStore } from "@/data/local/local-store";
import type { StoreDataRepository } from "@/data/store-data-repository";
import type { SyncEngine } from "@/sync/sync-engine";
import { nowISO } from "@/lib/datetime";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createPrefixedId } from "@/lib/id";

export interface CustomerServiceDeps {
  repository: StoreDataRepository;
  localStore: LocalStore;
  syncEngine: SyncEngine;
}

const PHONE_PATTERN = /^[0-9+\-\s()]{6,20}$/;

/**
 * Logika aplikasi Pelanggan — pola offline-first yang sama dengan ProductService.
 * Saldo bon (outstandingBalance) TIDAK diubah di sini; ia berubah melalui
 * alur transaksi & pelunasan pada Tahap 4.
 */
export class CustomerService {
  private readonly repository: StoreDataRepository;
  private readonly localStore: LocalStore;
  private readonly syncEngine: SyncEngine;

  constructor(deps: CustomerServiceDeps) {
    this.repository = deps.repository;
    this.localStore = deps.localStore;
    this.syncEngine = deps.syncEngine;
  }

  async listCustomers(options: { refresh?: boolean } = {}): Promise<Customer[]> {
    if (!options.refresh) {
      return this.localStore.getCachedCustomers();
    }
    const customers = await this.repository.getCustomers();
    await this.localStore.setCachedCustomers(customers);
    return customers;
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    const customers = await this.localStore.getCachedCustomers();
    return customers.find((customer) => customer.id === id) ?? null;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const normalized = phone.trim();
    if (!normalized) return null;
    const customers = await this.localStore.getCachedCustomers();
    return customers.find((customer) => customer.phone === normalized) ?? null;
  }

  /**
   * Cari pelanggan BON berdasarkan nama (mengandung kata, case-insensitive).
   * Untuk pemilihan pelanggan pada transaksi BON — hasil menampilkan nama
   * dan total bon.
   */
  async searchCustomers(query: string): Promise<Customer[]> {
    const q = query.trim().toLowerCase();
    const customers = await this.localStore.getCachedCustomers();
    if (!q) return customers;
    return customers.filter((customer) => customer.name.toLowerCase().includes(q));
  }

  /**
   * Ambil pelanggan berdasarkan nama (untuk transaksi BON);
   * buat baru bila belum ada. Pencocokan nama case-insensitive.
   */
  async getOrCreateCustomerByName(name: string): Promise<Customer> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ValidationError("Nama pembeli wajib diisi.", { field: "name" });
    }
    const customers = await this.localStore.getCachedCustomers();
    const found = customers.find(
      (customer) => customer.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (found) return found;
    return this.createCustomer({ name: trimmed });
  }

  /** Menambah saldo bon pelanggan (dipanggil alur transaksi BON). */
  async addToOutstanding(id: string, amount: number): Promise<Customer> {
    const customers = await this.localStore.getCachedCustomers();
    const index = customers.findIndex((customer) => customer.id === id);
    if (index === -1) {
      throw new NotFoundError(`Pelanggan "${id}" tidak ditemukan pada data lokal.`);
    }
    const next: Customer = {
      ...customers[index],
      outstandingBalance: Math.max(0, Math.round(customers[index].outstandingBalance + amount)),
      updatedAt: nowISO(),
    };
    customers[index] = next;
    await this.localStore.setCachedCustomers(customers);
    await this.syncEngine.enqueue({
      id: createPrefixedId("op"),
      kind: "UPDATE",
      entity: "CUSTOMER",
      payload: next,
      createdAt: next.updatedAt,
    });
    return next;
  }

  /**
   * PELUNASAN — kurangi saldo piutang pelanggan. Dipakai dari halaman
   * /bon saat pelanggan membayar (sebagian atau lunas). Idempotent dalam
   * satu sesi: amount = min(jumlah, outstandingBalance); negatif = error.
   * Tidak membuat transaksi barang — fokusnya hanya pergerakan piutang.
   * Sync Sheets via antrean CUSTOMER UPDATE.
   */
  async settleOutstanding(id: string, amount: number): Promise<Customer> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError("Jumlah pelunasan harus lebih dari 0.", {
        field: "amount",
      });
    }
    const customers = await this.localStore.getCachedCustomers();
    const index = customers.findIndex((customer) => customer.id === id);
    if (index === -1) {
      throw new NotFoundError(`Pelanggan "${id}" tidak ditemukan pada data lokal.`);
    }
    const current = customers[index];
    if (current.outstandingBalance <= 0) {
      throw new ValidationError("Pelanggan ini tidak punya bon aktif.", {
        field: "amount",
      });
    }
    const settled = Math.min(current.outstandingBalance, Math.round(amount));
    const next: Customer = {
      ...current,
      outstandingBalance: Math.max(0, current.outstandingBalance - settled),
      updatedAt: nowISO(),
    };
    customers[index] = next;
    await this.localStore.setCachedCustomers(customers);
    await this.syncEngine.enqueue({
      id: createPrefixedId("op"),
      kind: "UPDATE",
      entity: "CUSTOMER",
      payload: next,
      createdAt: next.updatedAt,
    });
    return next;
  }

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const name = input.name?.trim() ?? "";
    if (!name) {
      throw new ValidationError("Nama pelanggan wajib diisi.", { field: "name" });
    }
    const phone = input.phone?.trim() || null;
    if (phone && !PHONE_PATTERN.test(phone)) {
      throw new ValidationError("Nomor telepon tidak valid.", { field: "phone" });
    }

    const now = nowISO();
    const customer: Customer = {
      id: createPrefixedId("cst"),
      name,
      phone,
      address: input.address?.trim() || null,
      outstandingBalance: 0,
      creditLimit:
        input.creditLimit !== undefined && input.creditLimit !== null
          ? Math.max(0, Math.round(input.creditLimit))
          : null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.localStore.upsertCachedCustomer(customer);
    await this.syncEngine.enqueue({
      id: createPrefixedId("op"),
      kind: "CREATE",
      entity: "CUSTOMER",
      payload: customer,
      createdAt: now,
    });
    return customer;
  }

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const customers = await this.localStore.getCachedCustomers();
    const index = customers.findIndex((customer) => customer.id === id);
    if (index === -1) {
      throw new NotFoundError(`Pelanggan "${id}" tidak ditemukan pada data lokal.`);
    }

    const current = customers[index];
    const next: Customer = { ...current, updatedAt: nowISO() };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new ValidationError("Nama pelanggan tidak boleh kosong.", {
          field: "name",
        });
      }
      next.name = name;
    }
    if (input.phone !== undefined) {
      const phone = input.phone?.trim() || null;
      if (phone && !PHONE_PATTERN.test(phone)) {
        throw new ValidationError("Nomor telepon tidak valid.", { field: "phone" });
      }
      next.phone = phone;
    }
    if (input.address !== undefined) next.address = input.address?.trim() || null;
    if (input.creditLimit !== undefined) {
      next.creditLimit =
        input.creditLimit === null ? null : Math.max(0, Math.round(input.creditLimit));
    }
    if (input.isActive !== undefined) next.isActive = input.isActive;

    customers[index] = next;
    await this.localStore.setCachedCustomers(customers);

    await this.syncEngine.enqueue({
      id: createPrefixedId("op"),
      kind: "UPDATE",
      entity: "CUSTOMER",
      payload: next,
      createdAt: next.updatedAt,
    });
    return next;
  }
}
