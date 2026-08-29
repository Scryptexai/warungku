import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Tombol dengan target sentuh besar (min. 48px) — wajib untuk pengguna
 * warung yang memakai aplikasi sambil berdiri/berjualan.
 */
export function Button({ variant = "primary", className, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-brand-600 text-white"
          : "border border-stone-300 bg-white text-stone-700",
        className,
      )}
      {...rest}
    />
  );
}
