import { Icon } from "./icons";

/**
 * Penanda standar untuk area yang menunggu fase roadmap berikutnya.
 * Eksplisit soal "kapan fungsinya hadir" agar ekspektasi pengguna jelas.
 */
export function PhaseNotice({
  phase,
  title,
  description,
  points = [],
}: {
  phase: number;
  title: string;
  description: string;
  points?: string[];
}) {
  return (
    <section className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white">
          Tahap {phase}
        </span>
        <h2 className="text-sm font-bold text-stone-900">{title}</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
      {points.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-stone-600">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
