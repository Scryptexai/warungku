import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
} from "@/domain";
import { PRODUCT_UNITS } from "@/domain";
import type { LocalStore } from "@/data/local/local-store";
import type { StoreDataRepository } from "@/data/store-data-repository";
import { MASTER_PRODUCTS } from "@/data/master/master-products";
import type { SyncEngine } from "@/sync/sync-engine";
import { nowISO } from "@/lib/datetime";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createPrefixedId } from "@/lib/id";
import { computeBulkPrice, type PriceChange } from "@/lib/pricing";

export interface BulkImportResult {
  created: Product[];
  skippedExisting: Array<{ barcode: string; name: string }>;
  failedRows: Array<{ row: number; reason: string }>;
}

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

  /**
   * IMPOR massal dari CSV master milik pengguna (mis. dataset Kaggle).
   * Semua baris divalidasi dulu — kalau ada yang rusak, baris itu dilewati
   * (bukan seluruh impor dibatalkan). Barcode yang sudah ada di katalog
   * dilewati (satu barcode = satu produk). Kembalikan laporan ringkas.
   */
  async bulkCreateProducts(
    inputs: CreateProductInput[],
  ): Promise<BulkImportResult> {
    const products = await this.localStore.getCachedProducts();
    const byBarcode = new Map(
      products.filter((p) => p.barcode).map((p) => [p.barcode as string, p]),
    );

    const result: BulkImportResult = { created: [], skippedExisting: [], failedRows: [] };
    const now = nowISO();

    inputs.forEach((input, index) => {
      const name = input.name?.trim() ?? "";
      const barcode = input.barcode?.trim() ?? "";
      if (!barcode || !name) {
        result.failedRows.push({ row: index + 1, reason: "barcode atau nama kosong" });
        return;
      }
      const existing = byBarcode.get(barcode);
      if (existing) {
        result.skippedExisting.push({ barcode, name: existing.name });
        return;
      }
      const currentPrice = Math.round(input.currentPrice ?? 0);
      if (!Number.isFinite(currentPrice) || currentPrice < 0) {
        result.failedRows.push({ row: index + 1, reason: "harga tidak valid" });
        return;
      }

      const product: Product = {
        id: createPrefixedId("prd"),
        barcode,
        name,
        currentPrice,
        costPrice: null,
        stock: Math.max(0, Math.round(input.stock ?? 0)),
        unit: input.unit ?? "pcs",
        category: input.category?.trim() || "Lainnya",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      byBarcode.set(barcode, product);
      result.created.push(product);
    });

    if (result.created.length > 0) {
      // Tulis lokal SEKALI (cepat), lalu antre operasi per produk.
      await this.localStore.setCachedProducts([...products, ...result.created]);
      for (const product of result.created) {
        await this.syncEngine.enqueue({
          id: createPrefixedId("op"),
          kind: "CREATE",
          entity: "PRODUCT",
          payload: product,
          createdAt: now,
        });
      }
    }
    return result;
  }

  /**
   * SEED master offline (715 produk: 99 seed + 206 OFF barcode nyata + 410 kurasi)
   * ke katalog lokal + antrean sinkronisasi. Idempotent: barcode yang sudah
   * ada di katalog DILEWATI, bukan duplikat. Aman dipanggil berulang-ulang.
   *
   * - Lokal: tulis sekali via setCachedProducts (UI langsung muncul).
   * - Sheets: enqueue per produk; sync engine kirim saat token Google hidup
   *   (offline-first — antrean bertahan, tidak hilang saat refresh).
   */
  async seedFromMaster(): Promise<BulkImportResult> {
    const inputs: CreateProductInput[] = MASTER_PRODUCTS.map((master) => ({
      barcode: master.barcode,
      name: master.name,
      category: master.category,
      currentPrice: master.suggestedPrice,
      stock: 0, // master tidak tahu stok awal — kasir isi sendiri
      unit: master.unit,
    }));
    return this.bulkCreateProducts(inputs);
  }

  /**
   * VERSI AMAN: kalau katalog sudah terisi (mis. hasil pull Sheets atau
   * sudah pernah seed), lewati. Pakai ini di bootstrap aplikasi.
   * Mengembalikan ringkasan agar UI bisa menampilkan pesan konfirmasi.
   */
  async seedFromMasterIfEmpty(): Promise<BulkImportResult | null> {
    const existing = await this.localStore.getCachedProducts();
    if (existing.length > 0) return null;
    return this.seedFromMaster();
  }

  /**
   * ATUR STOK = nilai yang sama untuk SEMUA produk. Idempotent: dipanggil
   * berulang-ulang, nilai stok akan sama. Stok awal = 0 (master tidak
   * tahu stok nyata) — founder mengisi via tombol dev di /produk. Tulis
   * lokal sekali, enqueue UPDATE per produk; sync engine kirim ke Sheets
   * saat token Google hidup.
   */
  async bulkSetStockForAll(value: number): Promise<{ updated: number; value: number }> {
    const safe = Math.max(0, Math.round(value));
    const products = await this.localStore.getCachedProducts();
    if (products.length === 0) return { updated: 0, value: safe };
    const now = nowISO();
    const next = products.map((p) => ({ ...p, stock: safe, updatedAt: now }));
    await this.localStore.setCachedProducts(next);
    for (const product of next) {
      await this.syncEngine.enqueue({
        id: createPrefixedId("op"),
        kind: "UPDATE",
        entity: "PRODUCT",
        payload: product,
        createdAt: now,
      });
    }
    return { updated: next.length, value: safe };
  }

  /**
   * Ubah harga BANYAK produk sekaligus (mis. semua Makanan Instan +10%).
   * Harga baru dibulatkan ke ratusan rupiah oleh lib/pricing.
   * Transaksi LAMA tidak berubah — mereka menyimpan snapshot harga sendiri.
   */
  async bulkUpdatePrices(
    ids: string[],
    change: PriceChange,
  ): Promise<Product[]> {
    if (ids.length === 0) {
      throw new ValidationError("Pilih minimal satu produk terlebih dahulu.");
    }
    const products = await this.localStore.getCachedProducts();
    const idSet = new Set(ids);
    const now = nowISO();
    const updated: Product[] = [];

    const next = products.map((product) => {
      if (!idSet.has(product.id)) return product;
      const nextPrice = computeBulkPrice(product.currentPrice, change);
      if (nextPrice === product.currentPrice) return product;
      const changed: Product = {
        ...product,
        currentPrice: nextPrice,
        updatedAt: now,
      };
      updated.push(changed);
      return changed;
    });

    if (updated.length > 0) {
      await this.localStore.setCachedProducts(next);
      for (const product of updated) {
        await this.syncEngine.enqueue({
          id: createPrefixedId("op"),
          kind: "UPDATE",
          entity: "PRODUCT",
          payload: product,
          createdAt: now,
        });
      }
    }
    return updated;
  }
}
