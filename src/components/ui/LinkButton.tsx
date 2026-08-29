import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type LinkButtonVariant = "primary" | "secondary";

/** Tombol berbentuk tautan dengan target sentuh besar (pola sama dengan Button). */
export function LinkButton({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: LinkButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors active:opacity-80",
        variant === "primary"
          ? "bg-brand-600 text-white"
          : "border border-stone-300 bg-white text-stone-700",
        className,
      )}
    >
      {children}
    </Link>
  );
}
