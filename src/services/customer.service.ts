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
