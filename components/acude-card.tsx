import Link from "next/link";
import { CATEGORY_LABELS, timeLabel, WEEKDAY_LABELS } from "@/lib/labels";
import type { LiveAcude } from "@/lib/types";
import { AcudeImage } from "./acude-image";
import { Badge, cardClass, ProgressBar } from "./ui";

export function AcudeCard({ acude }: { acude: LiveAcude }) {
  const available = acude.totalAvailable > 0;
  const tone = acude.category === "sports" ? "teal" : acude.category === "cultural" ? "violet" : "blue";
  return (
    <Link
      href={`/acudes/${acude.id}`}
      className={`${cardClass} group flex flex-col overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md`}
    >
      <div className="-mx-5 -mt-5 mb-4 overflow-hidden">
        <AcudeImage src={acude.imageUrl} name={acude.name} className="h-36 w-full" />
      </div>
      <div className="flex items-start justify-between gap-3">
        <Badge tone={tone}>{CATEGORY_LABELS[acude.category]}</Badge>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            available ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          }`}
        >
          {available ? `${acude.totalAvailable} cupos libres` : "Agotado"}
        </span>
      </div>
      <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900 group-hover:text-teal-800">
        {acude.name}
      </h2>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{acude.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {acude.schedule.slice(0, 3).map((slot) => (
          <span
            key={slot.id}
            className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600"
          >
            {WEEKDAY_LABELS[slot.day].slice(0, 3)} {slot.startTime}–{slot.endTime}
          </span>
        ))}
        {acude.schedule.length > 3 && (
          <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
            +{acude.schedule.length - 3}
          </span>
        )}
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="truncate">{acude.teacherName}</span>
          <span>
            {acude.currentEnrolled}/{acude.totalCapacity}
          </span>
        </div>
        <div className="mt-1.5">
          <ProgressBar
            value={
              acude.totalCapacity > 0
                ? Math.round((acude.currentEnrolled / acude.totalCapacity) * 100)
                : 0
            }
            tone={acude.totalAvailable === 0 ? "rose" : "teal"}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {acude.schedule[0]?.scenarioName ?? "Escenario por asignar"} ·{" "}
          {timeLabel(acude.schedule[0]?.startTime ?? "00:00")}
        </p>
      </div>
    </Link>
  );
}
