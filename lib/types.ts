/**
 * Tipos de dominio de CanchaYa (ACUDES).
 *
 * Contrato compartido entre la API REST, el panel web y (en el otro repositorio)
 * la app móvil. Aquí no existe el concepto de "reserva": toda relación entre un
 * estudiante y un escenario pasa por una inscripción (`Enrollment`) a un grupo
 * ACUDE. Los escenarios solo se ocupan a través de la programación del ACUDE.
 */

export type Role = "student" | "manager" | "admin";

/** Sexo declarado por la persona en el formulario de inscripción. */
export type Sex = "female" | "male" | "non_binary" | "prefer_not_to_say";

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
  sex: Sex | null;
}

export interface UserProfile extends AuthUser {
  createdAt: string;
  phone: string | null;
  documentId: string | null;
  updatedAt: string;
}

export interface TokenSet {
  idToken: string;
  refreshToken: string;
  /** Segundos de vigencia del idToken. */
  expiresIn: number;
}

export interface AuthResult {
  tokens: TokenSet;
  user: AuthUser;
}

// ───────────────────────────── Escenarios ─────────────────────────────

export type ScenarioType =
  | "court"
  | "field"
  | "room"
  | "pool"
  | "auditorium"
  | "gym"
  | "other";

export type ScenarioStatus = "available" | "maintenance" | "inactive";

export interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  status: ScenarioStatus;
  location: string;
  capacity: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// ───────────────────────────── ACUDES ─────────────────────────────

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type AcudeCategory = "sports" | "cultural" | "training" | "recreational";

export type AcudeStatus = "draft" | "published" | "archived";

/**
 * Franja semanal de un ACUDE. Cada franja es un subgrupo con su propio cupo.
 * El escenario se guarda por franja porque un mismo ACUDE puede rotar de
 * escenario según el día.
 */
export interface ScheduleSlot {
  id: string;
  day: Weekday;
  /** Hora local en formato HH:mm (24 h). */
  startTime: string;
  /** Hora local en formato HH:mm (24 h). Debe ser mayor que startTime. */
  endTime: string;
  scenarioId: string;
  /** Cupo propio de la franja. Si falta, se usa el maxCapacity del ACUDE. */
  maxCapacity?: number;
}

export interface Acude {
  id: string;
  name: string;
  description: string;
  category: AcudeCategory;
  discipline: string;
  /** Escenario principal (normalmente el de la primera franja). */
  scenarioId: string;
  teacherId: string;
  teacherName: string;
  schedule: ScheduleSlot[];
  /** Cupo por subgrupo (franja). Ver `totalCapacity` en las vistas enriquecidas. */
  maxCapacity: number;
  /** Total de inscripciones activas en todas las franjas. */
  currentEnrolled: number;
  /**
   * Contador transaccional por franja (`slotId -> inscritos`). Se actualiza en
   * la misma transacción del ACUDE para impedir sobrecupos concurrentes.
   */
  slotEnrolled: Record<string, number>;
  status: AcudeStatus;
  semester: string;
  imageUrl: string | null;
  imageStoragePath: string | null;
  requirements: string;
  attendanceMin: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Franja enriquecida con ocupación real y datos del escenario. */
export interface LiveScheduleSlot extends ScheduleSlot {
  scenarioName: string;
  capacity: number;
  enrolled: number;
  available: number;
  occupancyPct: number;
}

/** Acude tal como lo consume la cartelera digital y el calendario. */
export interface LiveAcude extends Omit<Acude, "schedule"> {
  schedule: LiveScheduleSlot[];
  totalCapacity: number;
  totalAvailable: number;
}

// ───────────────────────────── Inscripciones ─────────────────────────────

export type EnrollmentStatus = "active" | "canceled";

/**
 * Inscripción a una franja (subgrupo) de un ACUDE. El documento de Firestore
 * se identifica con `{uid}_{clientRequestId}` para que reintentar una petición
 * creada sin conexión no duplique la inscripción.
 */
export interface Enrollment {
  id: string;
  acudeId: string;
  acudeName: string;
  userId: string;
  userEmail: string;
  userName: string;
  userSex: Sex;
  slotId: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  scenarioId: string;
  scenarioName: string;
  category: AcudeCategory;
  discipline: string;
  teacherId: string;
  teacherName: string;
  status: EnrollmentStatus;
  clientRequestId: string;
  semester: string;
  enrolledAt: string;
  /** Fecha local (America/Bogota) de la inscripción, YYYY-MM-DD. Facilita reportes. */
  enrolledOn: string;
  canceledAt: string | null;
  updatedAt: string;
}

// ───────────────────────────── Asistencia ─────────────────────────────

export type AttendanceStatus = "present" | "absent";

export interface AttendanceRecord {
  id: string;
  acudeId: string;
  acudeName: string;
  slotId: string;
  enrollmentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userSex: Sex;
  category: AcudeCategory;
  discipline: string;
  teacherId: string;
  teacherName: string;
  scenarioId: string;
  scenarioName: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  /** Fecha de la sesión en formato YYYY-MM-DD. */
  date: string;
  status: AttendanceStatus;
  notes: string;
  recordedBy: string;
  recordedAt: string;
  updatedAt: string;
}

// ───────────────────────────── Ocupación ─────────────────────────────

export type SessionPhase = "in_session" | "upcoming" | "finished" | "scheduled";

export interface OccupationSession {
  slotId: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  acudeId: string;
  acudeName: string;
  teacherName: string;
  category: AcudeCategory;
  enrolled: number;
  capacity: number;
  occupancyPct: number;
  phase: SessionPhase;
}

export interface ScenarioOccupation {
  scenario: Scenario;
  sessions: OccupationSession[];
  current: OccupationSession | null;
  next: OccupationSession | null;
  enrolledToday: number;
}

// ───────────────────────────── Reportes ─────────────────────────────

export type ReportKind = "enrollments" | "attendance";

export type ReportGroupBy =
  | "date"
  | "week"
  | "month"
  | "student"
  | "acude"
  | "category"
  | "discipline"
  | "scenario"
  | "slot"
  | "day"
  | "sex"
  | "status"
  | "teacher";

export interface ReportPoint {
  key: string;
  label: string;
  value: number;
}

export interface ReportRow {
  date: string;
  student: string;
  email: string;
  sex: string;
  acude: string;
  slot: string;
  scenario: string;
  teacher: string;
  category: string;
  discipline: string;
  status: string;
}

export interface ReportSeries {
  name: string;
  color?: string;
  points: ReportPoint[];
}

export interface ReportSummary {
  total: number;
  active: number;
  canceled: number;
  present: number;
  absent: number;
  /** Porcentaje de asistencia sobre los registros. */
  attendanceRate: number;
}

export interface ReportResult {
  kind: ReportKind;
  groupBy: ReportGroupBy;
  from: string;
  to: string;
  series: ReportSeries[];
  rows: ReportRow[];
  summary: ReportSummary;
  generatedAt: string;
  serverTime: string;
}

// ───────────────────────────── API ─────────────────────────────

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Envoltura estándar de los listados sincronizables. */
export interface SyncMeta {
  serverTime: string;
}

export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}
