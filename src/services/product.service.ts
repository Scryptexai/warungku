import type {
  CreateProductInput,
  PriceHistoryEntry,
  Product,
  UpdateProductInput,
} from "@/domain";
import type { LocalStore } from "@/data/local/local-store";
import type { StoreDataRepository } from "@/data/store-data-repository";
import type { SyncEngine } from "@/sync/sync-engine";
import { nowISO } from "@/lib/datetime";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createPrefixedId } from "@/lib/id";

export interface ProductServiceDeps {
  repository: StoreDataRepository;
  localStore: LocalStore;
  syncEngine: SyncEngine;
}

/**
 * Logika aplikasi Produk — pola offline-first:
 *
 *   BACA  → dari cache lokal (cepat, selalu tersedia).
 *   TULIS → ubah cache lokal dulu, lalu antrekan operasi sinkronisasi.
 *           Google Sheets diperbarui oleh engine sinkronisasi saat siap.
 *
 * Tahap 3 membangun UI lengkap di atas layanan ini (scan, dsb.);
 * Tahap 2 membuat `refresh` mulai bekerja dengan repository sungguhan.
 */
export class ProductService {
  private readonly repository: StoreDataRepository;
  private readonly localStore: LocalStore;
  private readonly syncEngine: SyncEngine;

  constructor(deps: ProductServiceDeps) {
    this.repository = deps.repository;
    this.localStore = deps.localStore;
    this.syncEngine = deps.syncEngine;
  }

  async listProducts(options: { refresh?: boolean } = {}): Promise<Product[]> {
    if (!options.refresh) {
      return this.localStore.getCachedProducts();
    }
    const products = await this.repository.getProducts();
    await this.localStore.setCachedProducts(products);
    return products;
  }

  async getProductById(id: string): Promise<Product | null> {
    const products = await this.localStore.getCachedProducts();
    return products.find((product) => product.id === id) ?? null;
  }

  /** Pencarian barcode — fondasi alur kasir scan (dipakai mulai Tahap 3). */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const normalized = barcode.trim();
    if (!normalized) return null;
    const products = await this.localStore.getCachedProducts();
    return products.find((product) => product.barcode === normalized) ?? null;
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const name = input.name?.trim() ?? "";
    if (!name) {
      throw new ValidationError("Nama produk wajib diisi.", { field: "name" });
    }
    if (!Number.isFinite(input.currentPrice) || input.currentPrice < 0) {
      throw new ValidationError("Harga jual harus angka 0 atau lebih.", {
        field: "currentPrice",
      });
    }
    const stock = input.stock ?? 0;
    if (!Number.isInteger(stock) || stock < 0) {
      throw new ValidationError("Stok harus bilangan bulat 0 atau lebih.", {
        field: "stock",
      });
    }

    const now = nowISO();
    const product: Product = {
      id: createPrefixedId("prd"),
      barcode: input.barcode?.trim() || null,
      name,
      currentPrice: Math.round(input.currentPrice),
      costPrice:
        input.costPrice !== undefined && input.costPrice !== null
          ? Math.round(input.costPrice)
          : null,
      stock,
      unit: input.unit ?? "pcs",
      category: input.category?.trim() || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.localStore.upsertCachedProduct(product);
    await this.syncEngine.enqueue({
      id: createPrefixedId("op"),
      kind: "CREATE",
      entity: "PRODUCT",
      payload: product,
      createdAt: now,
    });
    return product;
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const products = await this.localStore.getCachedProducts();
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) {
      throw new NotFoundError(`Produk "${id}" tidak ditemukan pada data lokal.`);
    }

    const current = products[index];
    const next: Product = { ...current, updatedAt: nowISO() };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new ValidationError("Nama produk tidak boleh kosong.", { field: "name" });
      }
      next.name = name;
    }
    if (input.barcode !== undefined) next.barcode = input.barcode?.trim() || null;
    if (input.currentPrice !== undefined) {
      if (!Number.isFinite(input.currentPrice) || input.currentPrice < 0) {
        throw new ValidationError("Harga jual harus angka 0 atau lebih.", {
          field: "currentPrice",
        });
      }
      next.currentPrice = Math.round(input.currentPrice);
    }
    if (input.costPrice !== undefined) {
      next.costPrice =
        input.costPrice === null ? null : Math.round(input.costPrice);
    }
    if (input.stock !== undefined) {
      if (!Number.isInteger(input.stock) || input.stock < 0) {
        throw new ValidationError("Stok harus bilangan bulat 0 atau lebih.", {
          field: "stock",
        });
      }
      next.stock = input.stock;
    }
    if (input.unit !== undefined) next.unit = input.unit;
    if (input.category !== undefined) next.category = input.category?.trim() || null;
    if (input.isActive !== undefined) next.isActive = input.isActive;

    const priceChanged =
      input.currentPrice !== undefined &&
      input.currentPrice !== current.currentPrice;

    products[index] = next;
    await this.localStore.setCachedProducts(products);

    await this.syncEngine.enqueue({
      id: createPrefixedId("op"),
      kind: "UPDATE",
      entity: "PRODUCT",
      payload: next,
      createdAt: next.updatedAt,
    });

    // Perubahan harga selalu meninggalkan jejak riwayat harga.
    if (priceChanged) {
      const priceHistory: PriceHistoryEntry = {
        id: createPrefixedId("ph"),
        productId: next.id,
        previousPrice: current.currentPrice,
        newPrice: next.currentPrice,
        changedAt: next.updatedAt,
        changedBy: null,
        note: null,
      };
      await this.syncEngine.enqueue({
        id: createPrefixedId("op"),
        kind: "CREATE",
        entity: "PRICE_HISTORY",
        payload: priceHistory,
        createdAt: next.updatedAt,
      });
    }

    return next;
  }
}
