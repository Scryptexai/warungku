import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icons";

/**
 * Visual alur langkah-langkah (mis. alur kasir / alur sinkronisasi).
 * `highlightIndex` opsional untuk menyorot langkah yang sedang terjadi.
 */
export function FlowSteps({
  steps,
  highlightIndex,
}: {
  steps: string[];
  highlightIndex?: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
      {steps.map((step, index) => (
        <Fragment key={step}>
          {index > 0 ? (
            <Icon
              name="chevronRight"
              className="h-3.5 w-3.5 shrink-0 text-stone-400"
              aria-hidden="true"
            />
          ) : null}
          <li
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium",
              index === highlightIndex
                ? "border-brand-300 bg-brand-50 font-semibold text-brand-700"
                : "border-stone-200 bg-white text-stone-600",
            )}
          >
            {step}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
