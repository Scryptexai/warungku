import { NotConnectedError, NotImplementedError } from "@/lib/errors";
import type {
  Customer,
  InventoryEntry,
  PriceHistoryEntry,
  Product,
  ReportsData,
  Store,
  Transaction,
} from "@/domain";
import { PRODUCT_UNITS, type ProductUnit } from "@/domain";
import type { StoreDataRepository } from "../store-data-repository";
import type { GoogleApiClient } from "./google-api-client";
import { readValues } from "./sheets-io";
import { SHEET_NAMES, PRODUCTS_COLUMNS } from "./sheets-schema";

/**
 * Implementasi Google Sheets dari StoreDataRepository — DATABASE WARUNG.
 *
 * TAHAP 4 (Sistem Produk & Barcode): operasi PRODUK berjalan penuh
 * (read/search/by-barcode) langsung dari spreadsheet milik toko:
 *
 *   User → Mobile App → Backend/API → Google Sheets toko
 *
 * Tulis tetap melalui antrean sinkronisasi (GoogleSheetsSyncTarget) agar
 * aman offline; baca dilakukan di sini dan hasilnya mengisi cache perangkat.
 * Tidak ada salinan permanen database produk di server aplikasi.
 */
export class GoogleSheetsStoreRepository implements StoreDataRepository {
  constructor(
    private readonly apiClient: GoogleApiClient,
    private readonly getSpreadsheetId: () => Promise<string | null> = async () => null,
  ) {}

  private async requireSpreadsheetId(): Promise<string> {
    const spreadsheetId = await this.getSpreadsheetId();
    if (!spreadsheetId) {
      throw new NotConnectedError(
        "Spreadsheet warung belum terhubung. Sambungkan Google di menu Profil.",
      );
    }
    return spreadsheetId;
  }

  /** Kolom aktif ("TRUE"/"1") → boolean; kosong dianggap aktif. */
  private static parseActive(raw: string | undefined): boolean {
    const value = (raw ?? "").trim().toLowerCase();
    return value === "" ? true : value === "true" || value === "1";
  }

  private static parseUnit(raw: string | undefined): ProductUnit {
    const value = (raw ?? "").trim();
    return (PRODUCT_UNITS as readonly string[]).includes(value)
      ? (value as ProductUnit)
      : "pcs";
  }

  /**
   * Membaca seluruh katalog produk dari tab PRODUCTS.
   * Pemetaan kolom mengikuti baris header (tahan terhadap perubahan urutan;
   * "price" lama dikenali sebagai "selling_price").
   */
  async getProducts(): Promise<Product[]> {
    const spreadsheetId = await this.requireSpreadsheetId();

    const header = await readValues(
      this.apiClient,
      spreadsheetId,
      `${SHEET_NAMES.products}!A1:Z1`,
    );
    const columns = header[0] ?? [];
    const indexOf = (name: string): number => columns.indexOf(name);
    const priceIndex =
      indexOf("selling_price") !== -1 ? indexOf("selling_price") : indexOf("price");
    const map = {
      id: indexOf("product_id"),
      barcode: indexOf("barcode"),
      name: indexOf("product_name"),
      category: indexOf("category"),
      price: priceIndex,
      stock: indexOf("stock"),
      unit: indexOf("unit"),
      createdAt: indexOf("created_at"),
      updatedAt: indexOf("updated_at"),
      isActive: indexOf("active"),
    };

    const rows = await readValues(
      this.apiClient,
      spreadsheetId,
      `${SHEET_NAMES.products}!A2:Z`,
    );

    const products: Product[] = [];
    for (const row of rows) {
      const cell = (index: number): string =>
        index >= 0 ? (row[index] ?? "").trim() : "";
      const id = cell(map.id);
      const name = cell(map.name);
      if (!id || !name) continue; // baris kosong / tidak lengkap → lewati

      const price = Number(cell(map.price) || "0");
      const stock = Number(cell(map.stock) || "0");
      const now = new Date().toISOString();
      products.push({
        id,
        barcode: cell(map.barcode) || null,
        name,
        category: cell(map.category) || null,
        currentPrice: Number.isFinite(price) ? Math.round(price) : 0,
        costPrice: null,
        stock: Number.isFinite(stock) ? Math.round(stock) : 0,
        unit: GoogleSheetsStoreRepository.parseUnit(cell(map.unit)),
        isActive: GoogleSheetsStoreRepository.parseActive(cell(map.isActive)),
        createdAt: cell(map.createdAt) || now,
        updatedAt: cell(map.updatedAt) || now,
      });
    }
    return products;
  }

  async getProductById(id: string): Promise<Product | null> {
    const products = await this.getProducts();
    return products.find((product) => product.id === id) ?? null;
  }

  /** Pencarian barcode — pintu utama alur scan (identifier produk). */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const normalized = barcode.trim();
    if (!normalized) return null;
    const products = await this.getProducts();
    return products.find((product) => product.barcode === normalized) ?? null;
  }

  // ---------------------------------------------------- Belum milik fase ini
  // (ditambahkan pada fase roadmap berikutnya)

  async getStoreInfo(): Promise<Store | null> {
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

  private notAvailable<TResponse>(): Promise<TResponse> {
    return Promise.reject(
      new NotImplementedError(
        "Operasi ini milik fase roadmap berikutnya.",
        { phase: 4 },
      ),
    );
  }
}

/** Referensi kolom PRODUCTS (dipakai pengujian untuk memastikan skema). */
export const PRODUCT_COLUMN_COUNT = PRODUCTS_COLUMNS.length;
