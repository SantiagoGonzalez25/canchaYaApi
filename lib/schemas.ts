import { z } from "zod";

// Mensajes de validación por defecto en español.
z.config(z.locales.es());

/** Los teclados móviles agregan espacios: se normaliza antes de validar. */
const emailField = z.string().trim().toLowerCase().pipe(z.email("Correo inválido"));

const personNameField = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre no puede superar 80 caracteres")
      .regex(
        /^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u,
        "El nombre solo puede contener letras y espacios",
      ),
  );

const phoneField = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^3\d{9}$/, "El teléfono debe tener 10 dígitos y empezar por 3")
    .optional(),
);

const optionalDate = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.iso.date("La fecha debe tener formato AAAA-MM-DD").optional(),
);

export const sexSchema = z.enum(["female", "male", "non_binary", "prefer_not_to_say"], {
  message: "Selecciona el sexo de la persona",
});

export const roleSchema = z.enum(["student", "manager", "admin"]);

export const weekdayEnum = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm");

const idField = z
  .string()
  .min(1, "El identificador es obligatorio")
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/, "Identificador inválido");

const optionalScenarioId = z
  .string()
  .trim()
  .max(120)
  .refine((value) => value === "" || /^[A-Za-z0-9_-]+$/.test(value), "Identificador inválido")
  .default("");

// ───────────────────────────── Autenticación ─────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const registerSchema = z.object({
  email: emailField,
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(72),
  displayName: personNameField,
  sex: sexSchema,
  phone: phoneField,
});

export const managerRegisterSchema = z.object({
  email: emailField,
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(72),
  displayName: personNameField,
  sex: sexSchema,
  phone: phoneField,
});

export const userStatusSchema = z.enum(["active", "inactive", "banned"]);

export const updateUserSchema = z
  .object({
    role: roleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: "Indica al menos un cambio de rol o estado",
  });

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ───────────────────────────── Escenarios ─────────────────────────────

export const scenarioSchema = z.object({
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(100),
  type: z.enum(["court", "field", "room", "pool", "auditorium", "gym", "other"]),
  status: z.enum(["available", "maintenance", "inactive"]).default("available"),
  location: z.string().trim().min(3, "Indica la ubicación").max(160),
  capacity: z.coerce.number().int().min(1).max(5000),
  description: z.string().trim().max(600).default(""),
});

export const scenarioQuerySchema = z.object({
  status: z.enum(["available", "maintenance", "inactive"]).optional(),
  updatedSince: z.iso.datetime().optional(),
});

// ───────────────────────────── ACUDES ─────────────────────────────

export const scheduleSlotSchema = z
  .object({
    id: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,80}$/, "Identificador de franja inválido")
      .optional(),
    day: weekdayEnum,
    startTime: timeField,
    endTime: timeField,
    scenarioId: optionalScenarioId,
    maxCapacity: z.coerce.number().int().min(1).max(500).optional(),
  })
  .refine((slot) => slot.startTime < slot.endTime, {
    message: "La hora de fin debe ser mayor que la hora de inicio",
    path: ["endTime"],
  });

const scheduleField = z
  .array(scheduleSlotSchema)
  .min(1, "Agrega al menos una franja horaria")
  .max(30, "Un ACUDE no puede tener más de 30 franjas");

export const acudeSchema = z
  .object({
    name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(120),
    description: z.string().trim().max(1500).default(""),
    category: z.enum(["sports", "cultural", "training", "recreational"]),
    discipline: z.string().trim().min(2, "Indica la disciplina").max(80),
    teacherId: z.string().trim().min(2, "Selecciona un docente").max(120),
    teacherName: z.string().trim().min(2, "Indica el nombre del docente").max(120),
    scenarioId: optionalScenarioId,
    schedule: scheduleField,
    maxCapacity: z.coerce
      .number()
      .int()
      .min(1, "El cupo debe ser mayor que cero")
      .max(500),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    semester: z
      .string()
      .trim()
      .regex(/^\d{4}-[12]$/, "El semestre debe tener el formato AAAA-1 o AAAA-2"),
    imageUrl: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z
        .string()
        .trim()
        .max(500)
        .refine(
          (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
          "La imagen debe ser una ruta interna o una URL http(s) válida",
        )
        .optional(),
    ),
    requirements: z.string().trim().max(800).default(""),
    attendanceMin: z.coerce.number().int().min(0).max(100).default(80),
  })
  .superRefine((acude, ctx) => {
    // Las franjas del mismo ACUDE no pueden solaparse entre sí en el mismo escenario.
    for (let i = 0; i < acude.schedule.length; i += 1) {
      for (let j = i + 1; j < acude.schedule.length; j += 1) {
        const a = acude.schedule[i];
        const b = acude.schedule[j];
        if (
          a.scenarioId &&
          a.scenarioId === b.scenarioId &&
          a.day === b.day &&
          a.startTime < b.endTime &&
          b.startTime < a.endTime
        ) {
          ctx.addIssue({
            code: "custom",
            message: `Las franjas ${i + 1} y ${j + 1} se cruzan en el mismo escenario`,
            path: ["schedule", i, "startTime"],
          });
        }
      }
    }
    // El escenario principal debe aparecer en la programación.
    if (
      acude.scenarioId &&
      !acude.schedule.some((slot) => slot.scenarioId === acude.scenarioId)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Selecciona el escenario principal también en una de las franjas",
        path: ["scenarioId"],
      });
    }
    // Un ACUDE publicado no puede quedar sin espacio asignado.
    if (acude.status === "published") {
      if (!acude.scenarioId) {
        ctx.addIssue({
          code: "custom",
          message: "Asigna un escenario antes de publicar el ACUDE",
          path: ["scenarioId"],
        });
      }
      acude.schedule.forEach((slot, index) => {
        if (!slot.scenarioId) {
          ctx.addIssue({
            code: "custom",
            message: "Asigna un escenario a cada franja antes de publicar",
            path: ["schedule", index, "scenarioId"],
          });
        }
      });
    }
  });

export const acudeQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(["sports", "cultural", "training", "recreational"]).optional(),
  discipline: z.string().trim().max(80).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  teacherId: z.string().trim().max(120).optional(),
  updatedSince: z.iso.datetime().optional(),
});

export const liveQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(["sports", "cultural", "training", "recreational"]).optional(),
  day: weekdayEnum.optional(),
  updatedSince: z.iso.datetime().optional(),
});

// ───────────────────────────── Inscripciones ─────────────────────────────

export const createEnrollmentSchema = z.object({
  acudeId: idField,
  slotId: idField,
  clientRequestId: z
    .string()
    .min(8, "clientRequestId debe tener al menos 8 caracteres")
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, "Formato de clientRequestId inválido"),
  sex: sexSchema.optional(),
});

export const enrollmentQuerySchema = z.object({
  status: z.enum(["active", "canceled"]).optional(),
  acudeId: idField.optional(),
  slotId: idField.optional(),
  updatedSince: z.iso.datetime().optional(),
  from: optionalDate,
  to: optionalDate,
});

// ───────────────────────────── Asistencia ─────────────────────────────

export const attendanceEntrySchema = z.object({
  enrollmentId: idField,
  status: z.enum(["present", "absent"]),
  notes: z.string().trim().max(300).default(""),
});

export const saveAttendanceSchema = z.object({
  acudeId: idField,
  slotId: idField,
  date: z.iso.date("La fecha debe tener formato AAAA-MM-DD"),
  records: z.array(attendanceEntrySchema).min(1, "Registra al menos una asistencia").max(300),
});

export const attendanceSessionsQuerySchema = z.object({
  from: optionalDate,
  to: optionalDate,
  acudeId: idField.optional(),
  status: z.enum(["pending", "saved"]).optional(),
});

export const attendanceQuerySchema = z.object({
  acudeId: idField.optional(),
  slotId: idField.optional(),
  date: optionalDate,
  from: optionalDate,
  to: optionalDate,
  status: z.enum(["present", "absent"]).optional(),
  updatedSince: z.iso.datetime().optional(),
});

// ───────────────────────────── Ocupación y reportes ─────────────────────────────

export const occupationQuerySchema = z.object({
  date: optionalDate,
  day: weekdayEnum.optional(),
  updatedSince: z.iso.datetime().optional(),
});

export const reportQuerySchema = z.object({
  from: optionalDate,
  to: optionalDate,
  acudeId: idField.optional(),
  slotId: idField.optional(),
  category: z.enum(["sports", "cultural", "training", "recreational"]).optional(),
  discipline: z.string().trim().max(80).optional(),
  scenarioId: idField.optional(),
  day: weekdayEnum.optional(),
  sex: sexSchema.optional(),
  status: z.enum(["active", "canceled", "present", "absent"]).optional(),
  teacherId: idField.optional(),
  userId: idField.optional(),
  student: z.string().trim().max(120).optional(),
  groupBy: z
    .enum([
      "date",
      "week",
      "month",
      "student",
      "acude",
      "category",
      "discipline",
      "scenario",
      "slot",
      "day",
      "sex",
      "status",
      "teacher",
    ])
    .default("date"),
});

export type AcudeInput = z.infer<typeof acudeSchema>;
export type ScheduleSlotInput = z.infer<typeof scheduleSlotSchema>;
export type ScenarioInput = z.infer<typeof scenarioSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>;
