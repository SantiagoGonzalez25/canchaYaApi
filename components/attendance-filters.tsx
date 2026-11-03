"use client";

import { useRouter } from "next/navigation";
import { weekdayOf } from "@/lib/labels";
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
  const daySlots = current?.slots.filter((slot) => slot.day === weekdayOf(date)) ?? [];
  const selectedSlotId = daySlots.some((slot) => slot.id === slotId)
    ? slotId
    : (daySlots[0]?.id ?? "");

  const go = (nextAcudeId: string, nextSlotId: string, nextDate: string) => {
    const params = new URLSearchParams({
      acudeId: nextAcudeId,
      date: nextDate,
    });
    if (nextSlotId) params.set("slotId", nextSlotId);
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
            const nextDay = weekdayOf(date);
            const nextSlot = next.slots.find((slot) => slot.day === nextDay);
            go(next.id, nextSlot?.id ?? "", date);
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
        value={selectedSlotId}
        onChange={(event) => go(acudeId, event.target.value, date)}
        className={selectClass}
        aria-label="Franja"
        disabled={daySlots.length === 0}
      >
        {daySlots.length === 0 ? (
          <option value="">Sin franjas para este día</option>
        ) : (
          daySlots.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {weekdayLabels[slot.day] ?? slot.day} {slot.startTime}–{slot.endTime}
            </option>
          ))
        )}
      </select>

      <input
        type="date"
        value={date}
        onChange={(event) => {
          const nextDate = event.target.value;
          const nextDay = weekdayOf(nextDate);
          const nextSlot = current?.slots.find((slot) => slot.day === nextDay);
          go(acudeId, nextSlot?.id ?? "", nextDate);
        }}
        className={selectClass}
        aria-label="Fecha de la sesión"
      />

      <p className="text-xs text-slate-500 sm:col-span-3">
        Las franjas se ajustan automáticamente al día de la fecha seleccionada.
      </p>
    </div>
  );
}
