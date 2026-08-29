import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Panel/kartu bagian standar untuk seluruh halaman. */
export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-stone-200 bg-white p-4", className)}>
      {title ? <h2 className="text-sm font-bold text-stone-900">{title}</h2> : null}
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-stone-600">{description}</p>
      ) : null}
      {children ? <div className={cn(title || description ? "mt-3" : "")}>{children}</div> : null}
    </section>
  );
}
