"use client";

import { useRouter } from "next/navigation";
import { selectClass } from "./ui";

export interface AttendanceAcudeOption {
  id: string;
  name: string;
  slots: { id: string; day: string; startTime: string; endTime: string }[];
}

export function AttendanceFilters({
  acudes,
  acudeId,
  slotId,
  date,
  canSelectAcude,
  weekdayLabels,
}: {
  acudes: AttendanceAcudeOption[];
  acudeId: string;
  slotId: string;
  date: string;
  canSelectAcude: boolean;
  weekdayLabels: Record<string, string>;
}) {
  const router = useRouter();
  const current = acudes.find((acude) => acude.id === acudeId) ?? acudes[0];

  const go = (nextAcudeId: string, nextSlotId: string, nextDate: string) => {
    const params = new URLSearchParams({
      acudeId: nextAcudeId,
      slotId: nextSlotId,
      date: nextDate,
    });
    router.push(`/manager/attendance?${params.toString()}`);
  };

  return (
    <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1.2fr_1.2fr_auto]">
      {canSelectAcude ? (
        <select
          value={current?.id ?? ""}
          onChange={(event) => {
            const next = acudes.find((acude) => acude.id === event.target.value);
            if (!next) return;
            go(next.id, next.slots[0]?.id ?? "", date);
          }}
          className={selectClass}
          aria-label="ACUDE"
        >
          {acudes.map((acude) => (
            <option key={acude.id} value={acude.id}>
              {acude.name}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          {current?.name}
        </div>
      )}

      <select
        value={slotId}
        onChange={(event) => go(acudeId, event.target.value, date)}
        className={selectClass}
        aria-label="Franja"
      >
        {current?.slots.map((slot) => (
          <option key={slot.id} value={slot.id}>
            {weekdayLabels[slot.day] ?? slot.day} {slot.startTime}–{slot.endTime}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={date}
        onChange={(event) => go(acudeId, slotId, event.target.value)}
        className={selectClass}
        aria-label="Fecha de la sesión"
      />

      <p className="text-xs text-slate-500 sm:col-span-3">
        La lista se actualiza automáticamente al cambiar el ACUDE, la franja o la fecha.
      </p>
    </div>
  );
}
