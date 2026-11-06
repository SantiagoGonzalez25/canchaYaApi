import "server-only";
import { db } from "../firebase";
import { ApiError } from "../errors";
import type {
  Acude,
  AttendanceRecord,
  AttendanceStatus,
  AuthUser,
  Enrollment,
} from "../types";
import type { SaveAttendanceInput } from "../schemas";
import { addDays, startOfWeek, todayKey, weekdayOf } from "../labels";
import { ACUDES, listAcudes, listScenarioOptions } from "./acudes";
import { listActiveEnrollments } from "./enrollments";

export const ATTENDANCE = "attendance";

/** Días hacia atrás en los que todavía se puede corregir una asistencia. */
export const ATTENDANCE_EDIT_WINDOW_DAYS = 14;

type AttendanceDoc = Omit<AttendanceRecord, "id">;

/** Compatibilidad con registros antiguos: tarde = asistió; excusa = no asistió. */
export function normalizeAttendanceStatus(value: unknown): AttendanceStatus {
  return value === "present" || value === "late" ? "present" : "absent";
}

export function toAttendance(id: string, data: AttendanceDoc): AttendanceRecord {
  return {
    id,
    ...data,
    status: normalizeAttendanceStatus(data.status),
    userEmail: data.userEmail ?? "",
    notes: data.notes ?? "",
  };
}

/**
 * Registro/actualización masiva de asistencia de una franja.
 * El id `{enrollmentId}_{date}` hace la operación idempotente: guardar dos veces
 * el mismo día actualiza, no duplica.
 */
export async function saveAttendance(
  input: SaveAttendanceInput,
  user: AuthUser,
): Promise<AttendanceRecord[]> {
  const firestore = db();
  const acudeSnap = await firestore.collection(ACUDES).doc(input.acudeId).get();
  if (!acudeSnap.exists) throw new ApiError(404, "NOT_FOUND", "ACUDE no encontrado");
  const acude = {
    id: acudeSnap.id,
    ...(acudeSnap.data() as Omit<Acude, "id">),
  } as Acude;
  if (user.role === "manager" && acude.teacherId !== user.uid) {
    throw new ApiError(403, "FORBIDDEN", "Solo puedes registrar asistencia de tus ACUDES");
  }
  if (user.role === "manager" && acude.status !== "published") {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "El ACUDE debe estar publicado para registrar asistencia",
    );
  }
  const slot = acude.schedule.find((item) => item.id === input.slotId);
  if (!slot) throw new ApiError(404, "NOT_FOUND", "La franja horaria no existe en este ACUDE");
  if (slot.day !== weekdayOf(input.date)) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "La franja seleccionada no corresponde al día de la fecha indicada",
    );
  }
  const today = todayKey();
  if (input.date > today) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "No puedes registrar asistencia de una fecha futura",
    );
  }
  if (input.date < addDays(today, -ATTENDANCE_EDIT_WINDOW_DAYS)) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      `Solo puedes corregir asistencia de los últimos ${ATTENDANCE_EDIT_WINDOW_DAYS} días`,
    );
  }

  const active = await listActiveEnrollments(input.acudeId, input.slotId);
  const byId = new Map(active.map((item) => [item.id, item]));
  for (const record of input.records) {
    if (!byId.has(record.enrollmentId)) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        `La inscripción ${record.enrollmentId} no está activa en esta franja`,
      );
    }
  }

  const scenarioSnap = await firestore.collection("scenarios").doc(slot.scenarioId).get();
  const scenarioName = scenarioSnap.exists
    ? ((scenarioSnap.data() as { name?: string }).name ?? "Escenario")
    : "Escenario";
  const now = new Date().toISOString();
  const batch = firestore.batch();
  const results: AttendanceRecord[] = [];

  for (const entry of input.records) {
    const enrollment = byId.get(entry.enrollmentId) as Enrollment;
    const id = `${entry.enrollmentId}_${input.date}`;
    const data: AttendanceDoc = {
      acudeId: acude.id,
      acudeName: acude.name,
      slotId: slot.id,
      enrollmentId: enrollment.id,
      userId: enrollment.userId,
      userName: enrollment.userName,
      userEmail: enrollment.userEmail,
      userSex: enrollment.userSex,
      category: acude.category,
      discipline: acude.discipline,
      teacherId: acude.teacherId,
      teacherName: acude.teacherName,
      scenarioId: slot.scenarioId,
      scenarioName,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: input.date,
      status: entry.status,
      notes: entry.notes,
      recordedBy: user.uid,
      recordedAt: now,
      updatedAt: now,
    };
    batch.set(firestore.collection(ATTENDANCE).doc(id), data, { merge: true });
    results.push(toAttendance(id, data));
  }
  await batch.commit();
  return results.sort((a, b) => a.userName.localeCompare(b.userName, "es"));
}

export type AttendanceSessionStatus = "scheduled" | "pending" | "saved";

export interface AttendanceSession {
  sessionKey: string;
  acudeId: string;
  acudeName: string;
  acudeStatus: "draft" | "published";
  slotId: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  scenarioId: string;
  scenarioName: string;
  teacherId: string;
  teacherName: string;
  enrolled: number;
  status: AttendanceSessionStatus;
}

/** Sesiones reales de una semana/rango según el horario de cada ACUDE. */
export async function listAttendanceSessions(
  user: AuthUser,
  filter: {
    from?: string;
    to?: string;
    acudeId?: string;
    status?: AttendanceSessionStatus;
  } = {},
): Promise<AttendanceSession[]> {
  const today = todayKey();
  const currentWeekStart = startOfWeek(today);
  const oldest = addDays(today, -ATTENDANCE_EDIT_WINDOW_DAYS);
  const latest = addDays(currentWeekStart, 13);
  const requestedFrom = filter.from ?? currentWeekStart;
  const from = requestedFrom < oldest ? oldest : requestedFrom;
  const requestedTo = filter.to ?? addDays(currentWeekStart, 6);
  const to = requestedTo > latest ? latest : requestedTo;
  if (from > to) return [];

  const scopedAcudes = (await listAcudes(
    user.role === "manager" ? { teacherId: user.uid } : {},
  )).filter((acude) => {
    if (acude.status === "archived") return false;
    // El profesor solo pasa lista de ACUDES publicados; el admin ve borradores.
    if (user.role === "manager") return acude.status === "published";
    return true;
  });
  const acudes = scopedAcudes.filter(
    (acude) => !filter.acudeId || acude.id === filter.acudeId,
  );
  const scenarios = await listScenarioOptions();
  const scenarioNames = new Map(scenarios.map((item) => [item.id, item.name]));
  const acudeIds = new Set(acudes.map((acude) => acude.id));
  const records = (await listAttendance({ from, to })).filter((item) =>
    acudeIds.has(item.acudeId),
  );
  const saved = new Set(records.map((item) => `${item.acudeId}:${item.slotId}:${item.date}`));
  const sessions: AttendanceSession[] = [];

  for (const acude of acudes) {
    for (const slot of acude.schedule) {
      for (let date = from; date <= to; date = addDays(date, 1)) {
        if (weekdayOf(date) !== slot.day) continue;
        const sessionKey = `${acude.id}:${slot.id}:${date}`;
        const status: AttendanceSessionStatus =
          date > today ? "scheduled" : saved.has(sessionKey) ? "saved" : "pending";
        if (filter.status && filter.status !== status) continue;
        sessions.push({
          sessionKey,
          acudeId: acude.id,
          acudeName: acude.name,
          acudeStatus: acude.status === "draft" ? "draft" : "published",
          slotId: slot.id,
          date,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          scenarioId: slot.scenarioId,
          scenarioName: scenarioNames.get(slot.scenarioId) ?? "Por asignar",
          teacherId: acude.teacherId,
          teacherName: acude.teacherName,
          enrolled: acude.slotEnrolled?.[slot.id] ?? 0,
          status,
        });
      }
    }
  }

  return sessions.sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );
}

export interface AttendanceFilter {
  acudeId?: string;
  teacherId?: string;
  slotId?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: AttendanceStatus;
  updatedSince?: string;
}

export async function listAttendance(filter: AttendanceFilter = {}): Promise<AttendanceRecord[]> {
  let query: FirebaseFirestore.Query = db().collection(ATTENDANCE);
  if (filter.updatedSince) query = query.where("updatedAt", ">", filter.updatedSince);
  const snap = await query.get();
  let items = snap.docs.map((doc) => toAttendance(doc.id, doc.data() as AttendanceDoc));
  if (filter.acudeId) items = items.filter((item) => item.acudeId === filter.acudeId);
  if (filter.teacherId) items = items.filter((item) => item.teacherId === filter.teacherId);
  if (filter.slotId) items = items.filter((item) => item.slotId === filter.slotId);
  if (filter.date) items = items.filter((item) => item.date === filter.date);
  if (filter.from) items = items.filter((item) => item.date >= filter.from!);
  if (filter.to) items = items.filter((item) => item.date <= filter.to!);
  if (filter.status) items = items.filter((item) => item.status === filter.status);
  return items.sort(
    (a, b) => b.date.localeCompare(a.date) || a.userName.localeCompare(b.userName, "es"),
  );
}

/** Última asistencia registrada por inscripción (para precargar el formulario). */
export async function attendanceForSlotDate(
  acudeId: string,
  slotId: string,
  date: string,
): Promise<AttendanceRecord[]> {
  return listAttendance({ acudeId, slotId, date });
}

export async function attendanceForAcude(acudeId: string): Promise<AttendanceRecord[]> {
  return listAttendance({ acudeId });
}

/** Inscripciones activas de la franja con su asistencia del día (si existe). */
export async function attendanceRoster(
  acudeId: string,
  slotId: string,
  date: string,
): Promise<{ enrollments: Enrollment[]; attendance: AttendanceRecord[] }> {
  const [enrollments, attendance] = await Promise.all([
    listActiveEnrollments(acudeId, slotId),
    attendanceForSlotDate(acudeId, slotId, date),
  ]);
  return { enrollments, attendance };
}
