import "server-only";
import { db } from "../firebase";
import { ApiError } from "../errors";
import type { Acude, AttendanceRecord, AuthUser, Enrollment } from "../types";
import type { SaveAttendanceInput } from "../schemas";
import { ACUDES } from "./acudes";
import { listActiveEnrollments } from "./enrollments";

export const ATTENDANCE = "attendance";

type AttendanceDoc = Omit<AttendanceRecord, "id">;

export function toAttendance(id: string, data: AttendanceDoc): AttendanceRecord {
  return { id, ...data, notes: data.notes ?? "" };
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
  const slot = acude.schedule.find((item) => item.id === input.slotId);
  if (!slot) throw new ApiError(404, "NOT_FOUND", "La franja horaria no existe en este ACUDE");

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

export interface AttendanceFilter {
  acudeId?: string;
  slotId?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  updatedSince?: string;
}

export async function listAttendance(filter: AttendanceFilter = {}): Promise<AttendanceRecord[]> {
  let query: FirebaseFirestore.Query = db().collection(ATTENDANCE);
  if (filter.updatedSince) query = query.where("updatedAt", ">", filter.updatedSince);
  const snap = await query.get();
  let items = snap.docs.map((doc) => toAttendance(doc.id, doc.data() as AttendanceDoc));
  if (filter.acudeId) items = items.filter((item) => item.acudeId === filter.acudeId);
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
