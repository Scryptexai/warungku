import { NextResponse } from "next/server";
import { getFreshTokenBundle } from "@/lib/auth-session";
import { buildSpreadsheetTitle, REQUIRED_SHEETS } from "@/data/google/sheets-schema";
import { apiError, apiSuccess } from "@/types/api";

export const dynamic = "force-dynamic";

/**
 * Menyiapkan SPREADSHEET DATABASE WARUNG:
 * 1. Cari spreadsheet "Warungku — {nama warung}" di Drive milik pengguna
 *    (hanya file yang dibuat aplikasi ini yang terlihat — scope drive.file).
 * 2. Bila belum ada → buat spreadsheet baru.
 * 3. Pastikan keempat tab (PRODUCTS, TRANSACTIONS, TRANSACTION_ITEMS,
 *    CUSTOMERS) beserta headernya ada.
 */

interface DriveFileList {
  files?: Array<{ id: string; name: string }>;
}

interface SpreadsheetMeta {
  spreadsheetId: string;
  sheets?: Array<{ properties?: { title?: string } }>;
}

async function googleFetch(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: response.ok, status: response.status, data };
}

export async function POST(request: Request) {
  const bundle = await getFreshTokenBundle();
  if (!bundle) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Belum terhubung ke akun Google. Sambungkan lewat menu Profil."),
      { status: 401 },
    );
  }

  let shopName = "Toko";
  try {
    const body = (await request.json()) as { shopName?: string };
    if (body.shopName && body.shopName.trim()) shopName = body.shopName.trim();
  } catch {
    // body opsional — pakai default
  }

  const title = buildSpreadsheetTitle(shopName);
  const token = bundle.accessToken;

  try {
    // 1) Cari spreadsheet milik aplikasi dengan nama yang sama.
    const query = `name='${title.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent("files(id,name)")}`;
    const listResult = await googleFetch(token, listUrl);
    if (!listResult.ok) {
      return NextResponse.json(
        apiError("GOOGLE_API_ERROR", "Gagal mencari spreadsheet warung di Google Drive."),
        { status: 502 },
      );
    }
    const existing = (listResult.data as DriveFileList | null)?.files?.[0] ?? null;

    // 2) Buat spreadsheet bila belum ada.
    let spreadsheetId = existing?.id ?? null;
    let created = false;
    if (!spreadsheetId) {
      const createResult = await googleFetch(
        token,
        "https://sheets.googleapis.com/v4/spreadsheets",
        {
          method: "POST",
          body: JSON.stringify({ properties: { title } }),
        },
      );
      if (!createResult.ok) {
        return NextResponse.json(
          apiError("GOOGLE_API_ERROR", "Gagal membuat spreadsheet baru di Google Sheets."),
          { status: 502 },
        );
      }
      spreadsheetId = (createResult.data as { spreadsheetId: string }).spreadsheetId;
      created = true;
    }

    // 3) Pastikan struktur tab + header lengkap.
    const metaResult = await googleFetch(
      token,
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=${encodeURIComponent("sheets.properties.title")}`,
    );
    const existingTitles = new Set(
      ((metaResult.data as SpreadsheetMeta | null)?.sheets ?? [])
        .map((sheet) => sheet.properties?.title)
        .filter((name): name is string => Boolean(name)),
    );

    const missingSheets = REQUIRED_SHEETS.filter((sheet) => !existingTitles.has(sheet.name));
    if (missingSheets.length > 0) {
      const addResult = await googleFetch(
        token,
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({
            requests: missingSheets.map((sheet) => ({
              addSheet: { properties: { title: sheet.name } },
            })),
          }),
        },
      );
      if (!addResult.ok) {
        return NextResponse.json(
          apiError("GOOGLE_API_ERROR", "Gagal menyiapkan tab data pada spreadsheet."),
          { status: 502 },
        );
      }
    }

    // Tulis header untuk tab yang headernya masih kosong.
    for (const sheet of REQUIRED_SHEETS) {
      const range = encodeURIComponent(`${sheet.name}!A1:Z1`);
      const headerResult = await googleFetch(
        token,
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      );
      const hasHeader = Boolean(
        (headerResult.data as { values?: unknown[][] } | null)?.values?.[0]?.length,
      );
      if (hasHeader) continue;
      const writeResult = await googleFetch(
        token,
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${sheet.name}!A1`)}?valueInputOption=RAW`,
        {
          method: "PUT",
          body: JSON.stringify({ values: [sheet.columns as unknown as string[]] }),
        },
      );
      if (!writeResult.ok) {
        return NextResponse.json(
          apiError("GOOGLE_API_ERROR", `Gagal menulis header tab ${sheet.name}.`),
          { status: 502 },
        );
      }
    }

    return NextResponse.json(
      apiSuccess({
        spreadsheetId,
        title,
        created,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      }),
    );
  } catch (error) {
    console.error("[warungku] Setup spreadsheet gagal:", error);
    return NextResponse.json(
      apiError("NETWORK_ERROR", "Tidak bisa menghubungi Google. Periksa koneksi lalu coba lagi."),
      { status: 502 },
    );
  }
}
