/**
 * Etiquetas y utilidades de presentación compartidas por la API y el panel web.
 * Este archivo NO importa Firebase ni `server-only`: puede usarse en componentes
 * de cliente.
 */
import type {
  AcudeCategory,
  AcudeStatus,
  AttendanceStatus,
  EnrollmentStatus,
  ReportGroupBy,
  Role,
  ScenarioStatus,
  ScenarioType,
  Sex,
  Weekday,
} from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  student: "Estudiante",
  manager: "Profesor",
  admin: "Administrador",
};

export const SEX_LABELS: Record<Sex, string> = {
  female: "Femenino",
  male: "Masculino",
  non_binary: "No binario",
  prefer_not_to_say: "Prefiero no decirlo",
};

export const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

/** JS usa 0=domingo; nuestros horarios usan 1=lunes ... 7=domingo. */
export const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const CATEGORY_LABELS: Record<AcudeCategory, string> = {
  sports: "Deportiva",
  cultural: "Cultural",
  training: "Formativa",
  recreational: "Recreativa",
};

export const CATEGORY_COLORS: Record<AcudeCategory, string> = {
  sports: "#00652e",
  cultural: "#45a78f",
  training: "#1d4851",
  recreational: "#7aa51d",
};

export const ACUDE_STATUS_LABELS: Record<AcudeStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

export const SCENARIO_TYPE_LABELS: Record<ScenarioType, string> = {
  court: "Cancha",
  field: "Campo",
  room: "Salón",
  pool: "Piscina",
  auditorium: "Auditorio",
  gym: "Gimnasio",
  other: "Otro",
};

export const SCENARIO_STATUS_LABELS: Record<ScenarioStatus, string> = {
  available: "Disponible",
  maintenance: "En mantenimiento",
  inactive: "Inactivo",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: "Activa",
  canceled: "Cancelada",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Asistió",
  absent: "No asistió",
};

export const REPORT_GROUP_LABELS: Record<ReportGroupBy, string> = {
  date: "Fecha",
  week: "Semana",
  month: "Mes",
  student: "Estudiante",
  acude: "ACUDE",
  category: "Categoría",
  discipline: "Disciplina",
  scenario: "Escenario",
  slot: "Subgrupo / franja",
  day: "Día de la semana",
  sex: "Sexo",
  status: "Estado",
  teacher: "Docente",
};

export const TIMEZONE = "America/Bogota";

/** Período académico configurado para esta entrega. */
export const CURRENT_SEMESTER = {
  name: "2026-2",
  start: "2026-08-03",
  end: "2026-11-22",
};

export const SEMESTER_LABEL = `Semestre ${CURRENT_SEMESTER.name} · 03/08/2026 – 22/11/2026`;

export function isWithinSemester(dateKey: string): boolean {
  return dateKey >= CURRENT_SEMESTER.start && dateKey <= CURRENT_SEMESTER.end;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  // Las fechas sin hora se interpretan al mediodía local para evitar el salto
  // de día que produce UTC en America/Bogota.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00-05:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
}

export function formatDateKey(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  // en-CA produce YYYY-MM-DD de forma estable.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).format(value);
}

/** Formato numérico para títulos de asistencia: 29/10/2026. */
export function formatDateNumeric(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00-05:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

export function weekdayOf(dateKey: string): Weekday {
  const date = new Date(`${dateKey}T12:00:00`);
  return WEEKDAY_BY_JS_DAY[date.getDay()];
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function timeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "p. m." : "a. m.";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

/** Lunes de la semana que contiene `dateKey`. */
export function startOfWeek(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  const offset = (date.getDay() + 6) % 7; // lunes = 0
  date.setDate(date.getDate() - offset);
  return formatDateKey(date);
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

export function isDateKey(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

export function occupancyColor(pct: number): string {
  if (pct >= 90) return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  if (pct >= 60) return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}
