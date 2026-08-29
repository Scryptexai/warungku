"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import type { Product } from "@/domain";
import { AppError } from "@/lib/errors";
import { digitsOnly, parseWholeNumber } from "@/lib/input";
import { formatIDR } from "@/lib/money";
import { cn } from "@/lib/cn";

/** Kategori umum warung — sekali ketuk, tanpa mengetik. */
const CATEGORY_SUGGESTIONS = ["Makanan", "Minuman", "Rokok", "Snack", "Kebutuhan", "Lainnya"];

type FieldName = "barcode" | "name" | "category" | "price" | "stock";
type FieldErrors = Partial<Record<FieldName, string>>;

/** Data produk yang sudah tersimpan (untuk mode edit). */
export interface EditableProduct {
  id: string;
  barcode: string | null;
  name: string;
  category: string | null;
  currentPrice: number;
  stock: number;
}

interface DuplicateInfo {
  productId: string;
  productName: string;
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400";

function FieldLabel({
  text,
  hint,
}: {
  text: string;
  hint?: string;
}) {
  return (
    <span className="mb-1 flex items-baseline gap-1.5">
      <span className="text-xs font-semibold text-stone-600">{text}</span>
      {hint ? <span className="text-[11px] font-normal text-stone-400">{hint}</span> : null}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 block text-xs text-red-600">{message}</span>;
}

/**
 * Form produk bersama untuk TAMBAH dan EDIT.
 * Bidang besar ramah jempol; semua pesan kesalahan berbahasa Indonesia
 * sederhana. Mode edit: barcode hanya terlihat (tidak bisa diubah).
 */
export function ProductForm({
  mode,
  product,
  initialBarcode = "",
  cancelHref,
  onSaved,
}: {
  mode: "create" | "edit";
  product?: EditableProduct;
  /** Prefill barcode hasil scan untuk mode tambah. */
  initialBarcode?: string;
  cancelHref: string;
  onSaved: (product: Product) => void;
}) {
  const { products } = useApp();
  const [barcode, setBarcode] = useState(product?.barcode ?? initialBarcode);
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [price, setPrice] = useState(
    product ? String(product.currentPrice) : "",
  );
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pricePreview = price.trim() ? formatIDR(Number(digitsOnly(price))) : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDuplicate(null);
    setGenericError(null);

    const nextErrors: FieldErrors = {};
    if (mode === "create" && !barcode.trim()) {
      nextErrors.barcode = "Barcode wajib diisi.";
    }
    if (!name.trim()) {
      nextErrors.name = "Nama produk wajib diisi.";
    }
    if (!category.trim()) {
      nextErrors.category = "Kategori wajib diisi.";
    }
    const priceValue = parseWholeNumber(price);
    if (priceValue === null) {
      nextErrors.price = "Harga wajib diisi dengan angka 0 atau lebih.";
    }
    const stockValue = parseWholeNumber(stock);
    if (stockValue === null) {
      nextErrors.stock = "Stok wajib diisi dengan angka bulat 0 atau lebih.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    // Lolos validasi — nilai angka pasti tersedia (sudah dicek di atas).
    const priceValueSafe = priceValue as number;
    const stockValueSafe = stockValue as number;

    setSaving(true);
    try {
      const saved =
        mode === "create"
          ? await products.createProduct({
              barcode: barcode.trim(),
              name,
              category,
              currentPrice: priceValueSafe,
              stock: stockValueSafe,
            })
          : await products.updateProduct(product!.id, {
              name,
              category,
              currentPrice: priceValueSafe,
              stock: stockValueSafe,
            });
      onSaved(saved);
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === "VALIDATION_FAILED" &&
        error.details &&
        typeof error.details === "object" &&
        "existingProductId" in error.details
      ) {
        const details = error.details as {
          existingProductId: string;
          existingProductName?: string;
        };
        setDuplicate({
          productId: details.existingProductId,
          productName: details.existingProductName ?? "produk lain",
        });
      } else if (
        error instanceof AppError &&
        error.code === "VALIDATION_FAILED" &&
        error.details &&
        typeof error.details === "object" &&
        "field" in error.details
      ) {
        const field = (error.details as { field?: FieldName }).field;
        if (field) {
          setErrors({ [field]: error.message } as FieldErrors);
        } else {
          setGenericError(error.message);
        }
      } else {
        setGenericError("Gagal menyimpan produk. Silakan coba lagi.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {genericError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700"
        >
          {genericError}
        </p>
      ) : null}

      {duplicate ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800"
        >
          <p>
            Barcode ini sudah terdaftar untuk produk{" "}
            <b>&ldquo;{duplicate.productName}&rdquo;</b>. Satu barcode hanya untuk
            satu produk.
          </p>
          <Link
            href={`/produk/${duplicate.productId}`}
            className="mt-1.5 inline-flex items-center gap-1 font-semibold text-brand-700 underline"
          >
            Lihat produk yang sudah ada
            <Icon name="chevronRight" className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
        {mode === "create" ? (
          <label className="block">
            <FieldLabel text="Barcode" hint="dari scan atau ketik manual" />
            <div className="relative">
              <Icon
                name="barcode"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
              />
              <input
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder="cth. 8991234567890"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Barcode produk"
                className={cn(inputClass, "pl-10", errors.barcode && "border-red-300")}
              />
            </div>
            <FieldError message={errors.barcode} />
          </label>
        ) : (
          <div>
            <FieldLabel text="Barcode" hint="tidak bisa diubah" />
            <p className="flex min-h-12 items-center gap-2 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 text-sm text-stone-600">
              <Icon name="barcode" className="h-5 w-5 shrink-0 text-stone-400" />
              <span className="truncate">{product?.barcode ?? "—"}</span>
            </p>
          </div>
        )}

        <label className="block">
          <FieldLabel text="Nama Produk" />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="cth. Indomie Goreng"
            maxLength={60}
            autoComplete="off"
            aria-label="Nama produk"
            className={cn(inputClass, errors.name && "border-red-300")}
          />
          <FieldError message={errors.name} />
        </label>

        <div>
          <label htmlFor="produk-kategori" className="block">
            <FieldLabel text="Kategori" />
            <input
              id="produk-kategori"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="cth. Makanan"
              maxLength={30}
              autoComplete="off"
              className={cn(inputClass, errors.category && "border-red-300")}
            />
            <FieldError message={errors.category} />
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CATEGORY_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setCategory(suggestion)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors",
                  category === suggestion
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-stone-200 bg-white text-stone-600",
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <FieldLabel text="Harga Jual" />
            <input
              value={price}
              onChange={(event) => setPrice(digitsOnly(event.target.value))}
              placeholder="cth. 3500"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Harga jual dalam rupiah"
              className={cn(inputClass, errors.price && "border-red-300")}
            />
            {pricePreview ? (
              <span className="mt-1 block text-[11px] font-semibold text-brand-700">
                {pricePreview}
              </span>
            ) : null}
            <FieldError message={errors.price} />
          </label>

          <label className="block">
            <FieldLabel text="Stok" />
            <input
              value={stock}
              onChange={(event) => setStock(digitsOnly(event.target.value))}
              placeholder="cth. 24"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Jumlah stok"
              className={cn(inputClass, errors.stock && "border-red-300")}
            />
            <FieldError message={errors.stock} />
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Menyimpan…" : "Simpan Produk"}
        </Button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 active:opacity-80"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
