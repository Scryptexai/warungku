import type {
  Customer,
  Product,
  SyncOperation,
  Transaction,
} from "@/domain";
import type { GoogleApiClient } from "./google-api-client";
import {
  appendRows,
  findRowByValue,
  splitDateTime,
  updateRow,
} from "./sheets-io";
import { SHEET_NAMES } from "./sheets-schema";
import type { SyncTarget } from "@/sync/sync-engine";

/**
 * Target sinkronisasi Google Sheets — DATABASE UTAMA warung.
 *
 * Setiap operasi dari antrean diterjemahkan menjadi penulisan baris:
 *  - PRODUCT CREATE/UPDATE → upsert baris PRODUCTS (kunci: barcode).
 *  - TRANSACTION CREATE    → append TRANSACTIONS + TRANSACTION_ITEMS
 *                            + pembaruan agregat CUSTOMERS (bila BON).
 *  - CUSTOMER CREATE/UPDATE → upsert baris CUSTOMERS (kunci: customer_id).
 *  - PING/META             → diterima tanpa menulis apa pun (health check).
 *
 * IDEMPOTENT: pengiriman ulang tidak menduplikasi data —
 * baris dicari dulu berdasarkan ID-nya sebelum ditulis.
 */

export class GoogleSheetsSyncTarget implements SyncTarget {
  constructor(
    private readonly client: GoogleApiClient,
    private readonly getSpreadsheetId: () => Promise<string | null>,
  ) {}

  async isReady(): Promise<boolean> {
    const [connected, spreadsheetId] = await Promise.all([
      this.client.isConnected(),
      this.getSpreadsheetId(),
    ]);
    return connected && Boolean(spreadsheetId);
  }

  async push(operation: SyncOperation): Promise<void> {
    const spreadsheetId = await this.getSpreadsheetId();
    if (!spreadsheetId) {
      throw new Error("Spreadsheet warung belum disiapkan.");
    }
    switch (operation.entity) {
      case "PRODUCT":
        await this.pushProduct(spreadsheetId, operation);
        return;
      case "TRANSACTION":
        await this.pushTransaction(spreadsheetId, operation);
        return;
      case "CUSTOMER":
        await this.pushCustomer(spreadsheetId, operation);
        return;
      case "PRICE_HISTORY":
      case "STORE":
      case "META":
        // Di luar kebutuhan alur Tahap 3 — terima tanpa menulis.
        return;
      default:
        return;
    }
  }

  /** PRODUCTS: satu barcode = satu baris; stok/harga selalu terbaru. */
  private async pushProduct(spreadsheetId: string, operation: SyncOperation): Promise<void> {
    const product = operation.payload as Product;
    const row = [
      product.id,
      product.barcode ?? "",
      product.name,
      product.category ?? "",
      product.currentPrice,
      product.stock,
      product.unit,
      product.updatedAt,
    ];
    const rowIndex =
      product.barcode
        ? await findRowByValue(
            this.client,
            spreadsheetId,
            SHEET_NAMES.products,
            "B",
            product.barcode,
          )
        : null;
    if (rowIndex !== null) {
      await updateRow(this.client, spreadsheetId, SHEET_NAMES.products, rowIndex, row);
    } else {
      await appendRows(this.client, spreadsheetId, SHEET_NAMES.products, [row]);
    }
  }

  /**
   * TRANSACTIONS + TRANSACTION_ITEMS (+ agregat CUSTOMERS untuk BON).
   * Idempotent: bila transaction_id sudah ada, tidak menulis apa pun.
   */
  private async pushTransaction(spreadsheetId: string, operation: SyncOperation): Promise<void> {
    const transaction = operation.payload as Transaction;
    const existingRow = await findRowByValue(
      this.client,
      spreadsheetId,
      SHEET_NAMES.transactions,
      "A",
      transaction.id,
    );
    if (existingRow !== null) return; // sudah pernah tersimpan — jangan dobel

    const { date, time } = splitDateTime(transaction.timestamp);
    await appendRows(this.client, spreadsheetId, SHEET_NAMES.transactions, [
      [
        transaction.id,
        date,
        time,
        transaction.paymentType,
        transaction.customer?.name ?? "",
        transaction.total,
      ],
    ]);

    if (transaction.items.length > 0) {
      await appendRows(
        this.client,
        spreadsheetId,
        SHEET_NAMES.transactionItems,
        transaction.items.map((item) => [
          transaction.id,
          item.barcode ?? "",
          item.productName,
          item.quantity,
          item.unitPrice,
          item.subtotal,
        ]),
      );
    }

    if (transaction.paymentType === "BON" && transaction.customer?.name) {
      await this.bumpCustomerAggregate(
        spreadsheetId,
        transaction.customer.id,
        transaction.customer.name,
        transaction.total,
        `${date} ${time}`,
      );
    }
  }

  /** CUSTOMERS: naikkan total_transactions & total_debt untuk bon. */
  private async bumpCustomerAggregate(
    spreadsheetId: string,
    customerId: string | null,
    customerName: string,
    amount: number,
    lastTransaction: string,
  ): Promise<void> {
    const rowIndex = await findRowByValue(
      this.client,
      spreadsheetId,
      SHEET_NAMES.customers,
      "B",
      customerName,
    );
    if (rowIndex !== null) {
      const values = await this.client.request<{ values?: string[][] } | null>({
        path: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          `${SHEET_NAMES.customers}!A${rowIndex}:E${rowIndex}`,
        )}`,
      });
      const current = values?.values?.[0] ?? [];
      const totalTransactions = Number(current[2] ?? 0) + 1;
      const totalDebt = Number(current[3] ?? 0) + amount;
      await updateRow(this.client, spreadsheetId, SHEET_NAMES.customers, rowIndex, [
        current[0] || customerId || `cst-${customerName.toLowerCase().replace(/\s+/g, "-")}`,
        customerName,
        totalTransactions,
        totalDebt,
        lastTransaction,
      ]);
      return;
    }
    await appendRows(this.client, spreadsheetId, SHEET_NAMES.customers, [
      [
        customerId ?? `cst-${customerName.toLowerCase().replace(/\s+/g, "-")}`,
        customerName,
        1,
        amount,
        lastTransaction,
      ],
    ]);
  }

  /** CUSTOMERS (upsert dari data lokal, kunci: customer_id). */
  private async pushCustomer(spreadsheetId: string, operation: SyncOperation): Promise<void> {
    const customer = operation.payload as Customer;
    const rowIndex = await findRowByValue(
      this.client,
      spreadsheetId,
      SHEET_NAMES.customers,
      "A",
      customer.id,
    );
    const row = [
      customer.id,
      customer.name,
      "", // total_transactions dipelihara agregat transaksi BON
      customer.outstandingBalance,
      "",
    ];
    if (rowIndex !== null) {
      // Pertahankan agregat yang sudah ada di sheet.
      const values = await this.client.request<{ values?: string[][] } | null>({
        path: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          `${SHEET_NAMES.customers}!A${rowIndex}:E${rowIndex}`,
        )}`,
      });
      const current = values?.values?.[0] ?? [];
      await updateRow(this.client, spreadsheetId, SHEET_NAMES.customers, rowIndex, [
        customer.id,
        customer.name,
        current[2] ?? "",
        customer.outstandingBalance,
        current[4] ?? "",
      ]);
    } else {
      await appendRows(this.client, spreadsheetId, SHEET_NAMES.customers, [row]);
    }
  }
}
