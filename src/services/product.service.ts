import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
} from "@/domain";
import { PRODUCT_UNITS } from "@/domain";
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
 *           Google Sheets diperbarui oleh engine sinkronisasi mulai Tahap 4.
 *
 * Prinsip Tahap 2: pemilik warung cukup mendaftarkan produk SEKALI.
 * Setelah itu, scan barcode-nya langsung mengenali produk.
 * Satu barcode = satu produk (dilindungi dari duplikat).
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

  /**
   * Pencarian produk sederhana: cocokkan NAMA, BARCODE, atau KATEGORI
   * (mengandung kata). Query kosong → semua produk.
   */
  async searchProducts(query: string): Promise<Product[]> {
    const q = query.trim().toLowerCase();
    const products = await this.localStore.getCachedProducts();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        (product.category ?? "").toLowerCase().includes(q) ||
        (product.barcode ?? "").includes(q.replace(/\s+/g, "")),
    );
  }

  async getProductById(id: string): Promise<Product | null> {
    const products = await this.localStore.getCachedProducts();
    return products.find((product) => product.id === id) ?? null;
  }

  /** Pencarian barcode untuk alur scan (satu barcode = satu produk). */
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
    const barcode = input.barcode?.trim() ?? "";
    if (!barcode) {
      throw new ValidationError("Barcode wajib diisi.", { field: "barcode" });
    }
    const category = input.category?.trim() ?? "";
    if (!category) {
      throw new ValidationError("Kategori wajib diisi.", { field: "category" });
    }
    if (!Number.isFinite(input.currentPrice) || input.currentPrice < 0) {
      throw new ValidationError("Harga jual harus angka 0 atau lebih.", {
        field: "currentPrice",
      });
    }
    const stock = input.stock ?? 0;
    if (!Number.isInteger(stock) || stock < 0) {
      throw new ValidationError("Stok harus angka bulat 0 atau lebih.", {
        field: "stock",
      });
    }

    // Satu barcode hanya boleh untuk satu produk — cegah duplikat.
    const existing = await this.getProductByBarcode(barcode);
    if (existing) {
      throw new ValidationError(
        `Barcode sudah terdaftar untuk produk "${existing.name}".`,
        {
          field: "barcode",
          existingProductId: existing.id,
          existingProductName: existing.name,
        },
      );
    }

    const now = nowISO();
    const product: Product = {
      id: createPrefixedId("prd"),
      barcode,
      name,
      currentPrice: Math.round(input.currentPrice),
      costPrice:
        input.costPrice !== undefined && input.costPrice !== null
          ? Math.round(input.costPrice)
          : null,
      stock,
      unit: input.unit ?? "pcs",
      category,
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
    if (input.barcode !== undefined) {
      const barcode = input.barcode?.trim() || "";
      if (barcode && barcode !== current.barcode) {
        const existing = await this.getProductByBarcode(barcode);
        if (existing && existing.id !== id) {
          throw new ValidationError(
            `Barcode sudah terdaftar untuk produk "${existing.name}".`,
            {
              field: "barcode",
              existingProductId: existing.id,
              existingProductName: existing.name,
            },
          );
        }
        next.barcode = barcode;
      }
    }
    if (input.category !== undefined) {
      const category = input.category?.trim() ?? "";
      if (!category) {
        throw new ValidationError("Kategori tidak boleh kosong.", {
          field: "category",
        });
      }
      next.category = category;
    }
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
        throw new ValidationError("Stok harus angka bulat 0 atau lebih.", {
          field: "stock",
        });
      }
      next.stock = input.stock;
    }
    if (input.unit !== undefined) {
      if (!(PRODUCT_UNITS as readonly string[]).includes(input.unit)) {
        throw new ValidationError("Satuan produk tidak dikenal.", { field: "unit" });
      }
      next.unit = input.unit;
    }
    if (input.isActive !== undefined) next.isActive = input.isActive;

    products[index] = next;
    await this.localStore.setCachedProducts(products);

    await this.syncEngine.enqueue({
      id: createPrefixedId("op"),
      kind: "UPDATE",
      entity: "PRODUCT",
      payload: next,
      createdAt: next.updatedAt,
    });
    return next;
  }
}
