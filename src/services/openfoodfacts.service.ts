/**
 * Pencarian produk ONLINE via Open Food Facts (publik & gratis,
 * 2+ juta produk). Dipakai saat barcode tidak ada di katalog warung
 * maupun di master offline — butuh internet, gagal dengan diam (null).
 */

export interface OnlineProductSuggestion {
  barcode: string;
  name: string;
  category: string | null;
  unit: string;
  suggestedPrice: number | null;
  source: "online";
}

const OFF_TIMEOUT_MS = 6000;

/** Peta kata kunci kategori Open Food Facts → kategori warung. */
const CATEGORY_KEYWORDS: Array<[string, string]> = [
  ["instant noodle", "Makanan Instan"],
  ["noodle", "Makanan Instan"],
  ["soup", "Makanan Instan"],
  ["mi ", "Makanan Instan"],
  ["soft drink", "Minuman"],
  ["beverage", "Minuman"],
  ["juice", "Minuman"],
  ["coffee", "Minuman"],
  ["tea", "Minuman"],
  ["water", "Minuman"],
  ["milk", "Minuman"],
  ["soda", "Minuman"],
  ["snack", "Snack"],
  ["chips", "Snack"],
  ["chocolate", "Snack"],
  ["candy", "Snack"],
  ["biscuit", "Snack"],
  ["cookie", "Snack"],
  ["cake", "Snack"],
  ["cigarette", "Rokok"],
  ["tobacco", "Rokok"],
  ["sauce", "Bahan Masak"],
  ["oil", "Bahan Masak"],
  ["rice", "Bahan Masak"],
  ["sugar", "Bahan Masak"],
  ["flour", "Bahan Masak"],
  ["spice", "Bahan Masak"],
  ["seasoning", "Bahan Masak"],
  ["detergent", "Kebutuhan Rumah"],
  ["soap", "Kebutuhan Rumah"],
  ["cleaning", "Kebutuhan Rumah"],
  ["hygiene", "Kebutuhan Rumah"],
];

function mapCategory(categoriesRaw: string | undefined): string | null {
  if (!categoriesRaw) return null;
  const lower = categoriesRaw.toLowerCase();
  for (const [keyword, category] of CATEGORY_KEYWORDS) {
    if (lower.includes(keyword)) return category;
  }
  return null;
}

/** Cari barcode di Open Food Facts. Mengembalikan null bila gagal/tidak ada. */
export async function lookupBarcodeOnline(
  barcode: string,
): Promise<OnlineProductSuggestion | null> {
  const code = barcode.trim();
  if (!code) return null;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_id,brands,categories`,
      { signal: controller.signal, cache: "no-store" },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_id?: string;
        brands?: string;
        categories?: string;
      };
    };
    if (body.status !== 1 || !body.product) return null;

    const name =
      body.product.product_name?.trim() ||
      body.product.product_name_id?.trim() ||
      body.product.brands?.split(",")[0]?.trim() ||
      "";
    if (!name) return null;

    return {
      barcode: code,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      category: mapCategory(body.product.categories),
      unit: "pcs",
      suggestedPrice: null, // OFF tidak menyediakan harga — isi manual.
      source: "online",
    };
  } catch {
    return null; // offline / timeout / CORS — biarkan alur manual.
  } finally {
    clearTimeout(timer);
  }
}
