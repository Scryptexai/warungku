import { NotImplementedError } from "@/lib/errors";
import type {
  Customer,
  InventoryEntry,
  PriceHistoryEntry,
  Product,
  ReportsData,
  Store,
  Transaction,
} from "@/domain";
import type { StoreDataRepository } from "../store-data-repository";
import type { GoogleApiClient } from "./google-api-client";

/**
 * Implementasi Google Sheets dari StoreDataRepository.
 *
 * STATUS TAHAP 1: kerangka arsitektur saja. Seluruh operasi menolak dengan
 * NotImplementedError (phase 2) agar jelas fitur mana yang menyusul.
 * Tahap 2 mengisi isi method ini memakai GoogleApiClient + SHEET_TAB_NAMES.
 */
export class GoogleSheetsStoreRepository implements StoreDataRepository {
  constructor(private readonly apiClient: GoogleApiClient) {}

  private notAvailable<TResponse>(): Promise<TResponse> {
    return Promise.reject(
      new NotImplementedError(
        "Lapisan data Google Sheets diimplementasikan pada Tahap 2 (Google Account & Google Sheets data layer).",
        { phase: 2 },
      ),
    );
  }

  async getStoreInfo(): Promise<Store | null> {
    return this.notAvailable();
  }

  async getProducts(): Promise<Product[]> {
    return this.notAvailable();
  }

  async getProductById(): Promise<Product | null> {
    return this.notAvailable();
  }

  async getProductByBarcode(): Promise<Product | null> {
    return this.notAvailable();
  }

  async createProduct(): Promise<Product> {
    return this.notAvailable();
  }

  async updateProduct(): Promise<Product> {
    return this.notAvailable();
  }

  async getCustomers(): Promise<Customer[]> {
    return this.notAvailable();
  }

  async getCustomerById(): Promise<Customer | null> {
    return this.notAvailable();
  }

  async createCustomer(): Promise<Customer> {
    return this.notAvailable();
  }

  async updateCustomer(): Promise<Customer> {
    return this.notAvailable();
  }

  async createTransaction(): Promise<void> {
    return this.notAvailable();
  }

  async getTransactions(): Promise<Transaction[]> {
    return this.notAvailable();
  }

  async getInventory(): Promise<InventoryEntry[]> {
    return this.notAvailable();
  }

  async updateInventory(): Promise<InventoryEntry> {
    return this.notAvailable();
  }

  async getPriceHistory(): Promise<PriceHistoryEntry[]> {
    return this.notAvailable();
  }

  async recordPriceChange(): Promise<PriceHistoryEntry> {
    return this.notAvailable();
  }

  async getReportsData(): Promise<ReportsData> {
    return this.notAvailable();
  }
}
