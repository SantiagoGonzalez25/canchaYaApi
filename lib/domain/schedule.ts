import { ApiError } from "../errors";
import { WEEKDAY_LABELS, WEEKDAY_BY_JS_DAY, minutesOf } from "../labels";
import type { Acude, ScheduleSlot, SessionPhase, Weekday } from "../types";

/** Los extremos que se tocan (10:00-12:00 y 12:00-14:00) NO se consideran cruce. */
export function slotsOverlap(
  a: Pick<ScheduleSlot, "day" | "startTime" | "endTime">,
  b: Pick<ScheduleSlot, "day" | "startTime" | "endTime">,
): boolean {
  if (a.day !== b.day) return false;
  return (
    minutesOf(a.startTime) < minutesOf(b.endTime) &&
    minutesOf(b.startTime) < minutesOf(a.endTime)
  );
}

export interface ScheduleConflict {
  type: "scenario" | "teacher";
  acudeId: string;
  acudeName: string;
  slotId: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  resourceId: string;
}

interface ConflictCandidate {
  id?: string;
  name: string;
  teacherId: string;
  schedule: Pick<ScheduleSlot, "id" | "day" | "startTime" | "endTime" | "scenarioId">[];
}

/**
 * Regla de oro del proyecto: un escenario no puede tener dos grupos ACUDE al
 * mismo tiempo, y un docente tampoco puede estar en dos grupos simultáneos.
 * Los ACUDES archivados liberan sus franjas.
 */
export function findScheduleConflicts(
  candidate: ConflictCandidate,
  others: Pick<Acude, "id" | "name" | "teacherId" | "schedule" | "status">[],
  excludeId?: string,
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (const other of others) {
    if (other.id === excludeId) continue;
    if (other.id === candidate.id) continue;
    if (other.status === "archived") continue;
    for (const slot of candidate.schedule) {
      for (const otherSlot of other.schedule) {
        if (!slotsOverlap(slot, otherSlot)) continue;
        if (slot.scenarioId === otherSlot.scenarioId) {
          conflicts.push({
            type: "scenario",
            acudeId: other.id,
            acudeName: other.name,
            slotId: otherSlot.id,
            day: otherSlot.day,
            startTime: otherSlot.startTime,
            endTime: otherSlot.endTime,
            resourceId: slot.scenarioId,
          });
        }
        if (candidate.teacherId === other.teacherId) {
          if (candidate.teacherId === "pending") continue;
          conflicts.push({
            type: "teacher",
            acudeId: other.id,
            acudeName: other.name,
            slotId: otherSlot.id,
            day: otherSlot.day,
            startTime: otherSlot.startTime,
            endTime: otherSlot.endTime,
            resourceId: other.teacherId,
          });
        }
      }
    }
  }
  return conflicts;
}

export function assertNoScheduleConflicts(conflicts: ScheduleConflict[]): void {
  if (conflicts.length === 0) return;
  const first = conflicts[0];
  const when = `${WEEKDAY_LABELS[first.day]} ${first.startTime}-${first.endTime}`;
  const what = first.type === "scenario" ? "el escenario" : "el docente";
  throw new ApiError(
    409,
    "SCHEDULE_CONFLICT",
    `Cruce detectado: ${what} ya está ocupado por "${first.acudeName}" el ${when}.`,
    conflicts,
  );
}

/** Cupo efectivo de una franja: el propio o el general del ACUDE. */
export function slotCapacity(
  slot: Pick<ScheduleSlot, "maxCapacity">,
  acudeMaxCapacity: number,
): number {
  return slot.maxCapacity && slot.maxCapacity > 0 ? slot.maxCapacity : acudeMaxCapacity;
}

export function sortSlots<T extends Pick<ScheduleSlot, "day" | "startTime">>(slots: T[]): T[] {
  const order = new Map(WEEKDAY_BY_JS_DAY.map((day, index) => [day, index]));
  return [...slots].sort((a, b) => {
    const dayDiff = (order.get(a.day) ?? 0) - (order.get(b.day) ?? 0);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });
}

/** Fase de una franja para el panel de ocupación. */
export function sessionPhase(
  slot: Pick<ScheduleSlot, "day" | "startTime" | "endTime">,
  now: Date,
): SessionPhase {
  const bogota = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Bogota" }),
  );
  const today = WEEKDAY_BY_JS_DAY[bogota.getDay()];
  if (slot.day !== today) return "scheduled";
  const current = bogota.getHours() * 60 + bogota.getMinutes();
  if (current < minutesOf(slot.startTime)) return "upcoming";
  if (current >= minutesOf(slot.endTime)) return "finished";
  return "in_session";
}

/** Etiqueta legible de una franja recurrente. */
export function slotLabel(slot: Pick<ScheduleSlot, "day" | "startTime" | "endTime">): string {
  return `${WEEKDAY_LABELS[slot.day]} ${slot.startTime}-${slot.endTime}`;
}

export function isStudentOverlap(
  existing: { acudeId: string; slotId: string; day: Weekday; startTime: string; endTime: string }[],
  candidate: { acudeId: string; slotId: string; day: Weekday; startTime: string; endTime: string },
): boolean {
  return existing.some(
    (item) =>
      item.acudeId === candidate.acudeId ||
      item.slotId === candidate.slotId ||
      slotsOverlap(item, candidate),
  );
}
