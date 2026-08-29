/**
 * Gabungkan nama kelas CSS secara kondisional.
 * (Utilitas kecil pengganti library seperti clsx.)
 */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
