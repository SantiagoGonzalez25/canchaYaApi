import { addDays, minutesOf, WEEKDAY_BY_JS_DAY, WEEKDAY_LABELS } from "../labels";
import type { LiveAcude, LiveScheduleSlot, Weekday } from "../types";

export interface AgendaItem {
  acude: LiveAcude;
  slot: LiveScheduleSlot;
  date: string;
  weekday: Weekday;
  startsAt: Date;
}

function bogotaNow(now: Date): { weekday: Weekday; minutes: number; dateKey: string } {
  const local = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const dateKey = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(
    local.getDate(),
  ).padStart(2, "0")}`;
  return {
    weekday: WEEKDAY_BY_JS_DAY[local.getDay()],
    minutes: local.getHours() * 60 + local.getMinutes(),
    dateKey,
  };
}

/** Próximas franjas ordenadas cronológicamente (incluye la semana siguiente). */
export function upcomingSessions(
  acudes: LiveAcude[],
  now: Date = new Date(),
  limit = 8,
): AgendaItem[] {
  const current = bogotaNow(now);
  const todayIndex = WEEKDAY_BY_JS_DAY.indexOf(current.weekday);
  const items: AgendaItem[] = [];

  for (const acude of acudes) {
    for (const slot of acude.schedule) {
      const targetIndex = WEEKDAY_BY_JS_DAY.indexOf(slot.day);
      let daysAhead = (targetIndex - todayIndex + 7) % 7;
      if (daysAhead === 0 && minutesOf(slot.endTime) <= current.minutes) daysAhead = 7;
      const date = addDays(current.dateKey, daysAhead);
      const startsAt = new Date(`${date}T${slot.startTime}:00`);
      items.push({ acude, slot, date, weekday: slot.day, startsAt });
    }
  }
  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).slice(0, limit);
}

/** Franjas que están ocurriendo en este momento (America/Bogota). */
export function sessionsNow(acudes: LiveAcude[], now: Date = new Date()): AgendaItem[] {
  const current = bogotaNow(now);
  const items: AgendaItem[] = [];
  for (const acude of acudes) {
    for (const slot of acude.schedule) {
      if (slot.day !== current.weekday) continue;
      if (minutesOf(slot.startTime) <= current.minutes && current.minutes < minutesOf(slot.endTime)) {
        items.push({
          acude,
          slot,
          date: current.dateKey,
          weekday: slot.day,
          startsAt: new Date(`${current.dateKey}T${slot.startTime}:00`),
        });
      }
    }
  }
  return items.sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
}

export function weekdayName(day: Weekday): string {
  return WEEKDAY_LABELS[day];
}
