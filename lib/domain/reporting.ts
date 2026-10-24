import {
  ATTENDANCE_STATUS_LABELS,
  CATEGORY_LABELS,
  ENROLLMENT_STATUS_LABELS,
  REPORT_GROUP_LABELS,
  SEX_LABELS,
  WEEKDAY_LABELS,
} from "../labels";
import type {
  AcudeCategory,
  AttendanceRecord,
  AttendanceStatus,
  Enrollment,
  EnrollmentStatus,
  ReportGroupBy,
  ReportPoint,
  ReportResult,
  ReportSeries,
  ReportSummary,
  Sex,
  Weekday,
} from "../types";

export interface ReportFilters {
  from?: string;
  to?: string;
  acudeId?: string;
  slotId?: string;
  category?: AcudeCategory;
  discipline?: string;
  scenarioId?: string;
  day?: Weekday;
  sex?: Sex;
  status?: EnrollmentStatus | AttendanceStatus;
  teacherId?: string;
  userId?: string;
}

const EMPTY_SUMMARY: Omit<ReportSummary, "total"> = {
  active: 0,
  canceled: 0,
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  attendanceRate: 0,
};

function inRange(iso: string, from?: string, to?: string): boolean {
  const date = iso.slice(0, 10);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function pointLabel(key: string, groupBy: ReportGroupBy): string {
  if (groupBy === "sex") return SEX_LABELS[key as Sex] ?? key;
  if (groupBy === "category") return CATEGORY_LABELS[key as AcudeCategory] ?? key;
  if (groupBy === "day") return WEEKDAY_LABELS[key as Weekday] ?? key;
  if (groupBy === "status") {
    return (
      ENROLLMENT_STATUS_LABELS[key as EnrollmentStatus] ??
      ATTENDANCE_STATUS_LABELS[key as AttendanceStatus] ??
      key
    );
  }
  return key;
}

/** Lunes ISO de la semana a la que pertenece una fecha YYYY-MM-DD. */
function isoWeekKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
}

function enrollmentGroupKey(item: Enrollment, groupBy: ReportGroupBy): string {
  switch (groupBy) {
    case "date":
      return item.enrolledOn ?? item.enrolledAt.slice(0, 10);
    case "week":
      return isoWeekKey(item.enrolledOn ?? item.enrolledAt.slice(0, 10));
    case "month":
      return (item.enrolledOn ?? item.enrolledAt).slice(0, 7);
    case "acude":
      return item.acudeName;
    case "category":
      return item.category;
    case "discipline":
      return item.discipline;
    case "scenario":
      return item.scenarioName;
    case "slot":
      return `${WEEKDAY_LABELS[item.day]} ${item.startTime}-${item.endTime}`;
    case "day":
      return item.day;
    case "sex":
      return item.userSex;
    case "status":
      return item.status;
    case "teacher":
      return item.teacherName;
  }
}

function attendanceGroupKey(item: AttendanceRecord, groupBy: ReportGroupBy): string {
  switch (groupBy) {
    case "date":
      return item.date;
    case "week":
      return isoWeekKey(item.date);
    case "month":
      return item.date.slice(0, 7);
    case "acude":
      return item.acudeName;
    case "category":
      return item.category;
    case "discipline":
      return item.discipline;
    case "scenario":
      return item.scenarioName;
    case "slot":
      return `${WEEKDAY_LABELS[item.day]} ${item.startTime ?? ""}`.trim();
    case "day":
      return item.day;
    case "sex":
      return item.userSex;
    case "status":
      return item.status;
    case "teacher":
      return item.teacherName;
  }
}

function sortPoints(points: ReportPoint[], groupBy: ReportGroupBy): ReportPoint[] {
  if (groupBy === "date" || groupBy === "week" || groupBy === "month") {
    return [...points].sort((a, b) => a.key.localeCompare(b.key));
  }
  return [...points].sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
}

export function filterEnrollments(items: Enrollment[], filters: ReportFilters): Enrollment[] {
  return items.filter((item) => {
    if (!inRange(item.enrolledOn ?? item.enrolledAt, filters.from, filters.to)) return false;
    if (filters.acudeId && item.acudeId !== filters.acudeId) return false;
    if (filters.slotId && item.slotId !== filters.slotId) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.discipline && item.discipline !== filters.discipline) return false;
    if (filters.scenarioId && item.scenarioId !== filters.scenarioId) return false;
    if (filters.day && item.day !== filters.day) return false;
    if (filters.sex && item.userSex !== filters.sex) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.teacherId && item.teacherId !== filters.teacherId) return false;
    if (filters.userId && item.userId !== filters.userId) return false;
    return true;
  });
}

export function filterAttendance(items: AttendanceRecord[], filters: ReportFilters): AttendanceRecord[] {
  return items.filter((item) => {
    if (!inRange(item.date, filters.from, filters.to)) return false;
    if (filters.acudeId && item.acudeId !== filters.acudeId) return false;
    if (filters.slotId && item.slotId !== filters.slotId) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.discipline && item.discipline !== filters.discipline) return false;
    if (filters.scenarioId && item.scenarioId !== filters.scenarioId) return false;
    if (filters.day && item.day !== filters.day) return false;
    if (filters.sex && item.userSex !== filters.sex) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.teacherId && item.teacherId !== filters.teacherId) return false;
    if (filters.userId && item.userId !== filters.userId) return false;
    return true;
  });
}

export function buildEnrollmentReport(
  raw: Enrollment[],
  filters: ReportFilters,
  groupBy: ReportGroupBy = "date",
  now: Date = new Date(),
): ReportResult {
  const items = filterEnrollments(raw, filters);
  const active = new Map<string, number>();
  const canceled = new Map<string, number>();
  const labels = new Map<string, string>();

  for (const item of items) {
    const key = enrollmentGroupKey(item, groupBy);
    labels.set(key, pointLabel(key, groupBy));
    const target = item.status === "active" ? active : canceled;
    target.set(key, (target.get(key) ?? 0) + 1);
  }

  const summary: ReportSummary = {
    ...EMPTY_SUMMARY,
    total: items.length,
    active: items.filter((item) => item.status === "active").length,
    canceled: items.filter((item) => item.status === "canceled").length,
  };

  const series: ReportSeries[] = [
    { name: "Activas", color: "#0f766e", points: [] },
    { name: "Canceladas", color: "#e11d48", points: [] },
  ].map((definition) => {
    const values = definition.name === "Activas" ? active : canceled;
    return {
      ...definition,
      points: sortPoints(
        [...values.entries()].map(([key, value]) => ({
          key,
          label: labels.get(key) ?? key,
          value,
        })),
        groupBy,
      ),
    };
  });

  return {
    kind: "enrollments",
    groupBy,
    from: filters.from ?? "",
    to: filters.to ?? "",
    series,
    summary,
    generatedAt: now.toISOString(),
    serverTime: now.toISOString(),
  };
}

export function buildAttendanceReport(
  raw: AttendanceRecord[],
  filters: ReportFilters,
  groupBy: ReportGroupBy = "acude",
  now: Date = new Date(),
): ReportResult {
  const items = filterAttendance(raw, filters);
  const statuses: AttendanceStatus[] = ["present", "late", "absent", "excused"];
  const colors: Record<AttendanceStatus, string> = {
    present: "#0f766e",
    late: "#d97706",
    absent: "#e11d48",
    excused: "#2563eb",
  };
  const maps = new Map<AttendanceStatus, Map<string, number>>(
    statuses.map((status) => [status, new Map()]),
  );
  const labels = new Map<string, string>();
  for (const item of items) {
    const key = attendanceGroupKey(item, groupBy);
    labels.set(key, pointLabel(key, groupBy));
    const target = maps.get(item.status)!;
    target.set(key, (target.get(key) ?? 0) + 1);
  }
  const present = items.filter((item) => item.status === "present").length;
  const late = items.filter((item) => item.status === "late").length;
  const absent = items.filter((item) => item.status === "absent").length;
  const excused = items.filter((item) => item.status === "excused").length;
  const total = items.length;

  const series: ReportSeries[] = statuses.map((status) => ({
    name: ATTENDANCE_STATUS_LABELS[status],
    color: colors[status],
    points: sortPoints(
      [...(maps.get(status)?.entries() ?? [])].map(([key, value]) => ({
        key,
        label: labels.get(key) ?? key,
        value,
      })),
      groupBy,
    ),
  }));

  return {
    kind: "attendance",
    groupBy,
    from: filters.from ?? "",
    to: filters.to ?? "",
    series,
    summary: {
      ...EMPTY_SUMMARY,
      total,
      present,
      late,
      absent,
      excused,
      attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
    },
    generatedAt: now.toISOString(),
    serverTime: now.toISOString(),
  };
}

export function groupLabel(groupBy: ReportGroupBy): string {
  return REPORT_GROUP_LABELS[groupBy];
}
