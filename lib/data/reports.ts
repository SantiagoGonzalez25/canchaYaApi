import "server-only";
import {
  buildAttendanceReport,
  buildEnrollmentReport,
  latestEnrollmentPerSlot,
  type ReportFilters,
} from "../domain/reporting";
import { addDays, todayKey } from "../labels";
import type { ReportQuery } from "../schemas";
import type { ReportResult } from "../types";
import { listAttendance } from "./attendance";
import { listEnrollments } from "./enrollments";

function filtersOf(query: ReportQuery): ReportFilters {
  const to = query.to ?? todayKey();
  const from = query.from ?? addDays(to, -30);
  return {
    from,
    to,
    acudeId: query.acudeId,
    slotId: query.slotId,
    category: query.category,
    discipline: query.discipline,
    scenarioId: query.scenarioId,
    day: query.day,
    sex: query.sex,
    status: query.status,
    teacherId: query.teacherId,
    userId: query.userId,
    student: query.student,
  };
}

/** Reporte de eventos de inscripción: todos los campos del formulario + fechas. */
export async function enrollmentReport(query: ReportQuery): Promise<ReportResult> {
  const filters = filtersOf(query);
  const items = latestEnrollmentPerSlot(await listEnrollments({}));
  return buildEnrollmentReport(items, filters, query.groupBy);
}

/** Reporte de asistencia por ACUDE y por cualquier campo del formulario. */
export async function attendanceReport(query: ReportQuery): Promise<ReportResult> {
  const filters = filtersOf(query);
  const items = await listAttendance({});
  return buildAttendanceReport(items, filters, query.groupBy);
}
