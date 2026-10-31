/**
 * Especificación OpenAPI 3.1 generada a partir de los esquemas Zod de entrada.
 * Las rutas documentadas se comparan con los `route.ts` reales en
 * tests/openapi.test.ts: si agregas una ruta y olvidas documentarla, la prueba falla.
 */
import { z } from "zod";
import {
  acudeQuerySchema,
  acudeSchema,
  attendanceQuerySchema,
  createEnrollmentSchema,
  enrollmentQuerySchema,
  liveQuerySchema,
  loginSchema,
  managerRegisterSchema,
  occupationQuerySchema,
  refreshSchema,
  registerSchema,
  reportQuerySchema,
  saveAttendanceSchema,
  scenarioQuerySchema,
  scenarioSchema,
} from "./schemas";

type Json = Record<string, unknown>;

function toSchema(schema: z.ZodType, io: "input" | "output" = "input"): Json {
  const { $schema, ...rest } = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io,
    unrepresentable: "any",
  }) as Json;
  void $schema;
  return rest;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: Json) => ({ "application/json": { schema } });
const bearer = [{ bearerAuth: [] }, { sessionCookie: [] }];

const iso = { type: "string", format: "date-time" };
const nullableIso = { type: ["string", "null"], format: "date-time" };

const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "INVALID_CREDENTIALS",
  "FORBIDDEN",
  "NOT_FOUND",
  "EMAIL_IN_USE",
  "ALREADY_ENROLLED",
  "MAX_ACUDES",
  "NO_CAPACITY",
  "SCHEDULE_CONFLICT",
  "STUDENT_OVERLAP",
  "INVALID_STATE",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "CONFIG_ERROR",
  "INTERNAL_ERROR",
] as const;

function queryParams(schema: z.ZodType): Json[] {
  const props = (toSchema(schema).properties ?? {}) as Record<string, Json>;
  return Object.entries(props).map(([name, value]) => ({
    name,
    in: "query",
    required: false,
    schema: value,
  }));
}

const errorResponse = (description: string) => ({
  description,
  content: json(ref("ErrorBody")),
});

const RESPONSES = {
  BadRequest: errorResponse("Datos inválidos (VALIDATION_ERROR)"),
  Unauthorized: errorResponse("Falta el token o es inválido o expiró (UNAUTHENTICATED)"),
  Forbidden: errorResponse("El rol del usuario no permite esta acción (FORBIDDEN)"),
  NotFound: errorResponse("El recurso no existe (NOT_FOUND)"),
  Conflict: errorResponse(
    "Conflicto con el estado actual (NO_CAPACITY, SCHEDULE_CONFLICT, STUDENT_OVERLAP, INVALID_STATE...)",
  ),
};

const r = (name: keyof typeof RESPONSES) => ({ $ref: `#/components/responses/${name}` });

const pageMeta = {
  type: "object",
  properties: { serverTime: { type: "string", format: "date-time" } },
};

function listResponse(name: string, refName: string, extra: Json = {}): Json {
  return {
    type: "object",
    properties: {
      [name]: { type: "array", items: ref(refName) },
      ...pageMeta.properties,
      ...(extra.properties ?? {}),
    },
  };
}

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "Identificador del recurso",
};

export function buildOpenApiSpec(): Json {
  return {
    openapi: "3.1.0",
    info: {
      title: "API CanchaYa · ACUDES e Inscripciones",
      version: "1.0.0",
      description: [
        "API REST para la gestión de ACUDES (actividades culturales y deportivas) del TdeA.",
        "",
        "**Regla de cero reservas:** no existe ningún endpoint para reservar escenarios. La ocupación",
        "se deriva de las inscripciones a los subgrupos de cada ACUDE.",
        "",
        "**Sincronización:** todos los listados aceptan `updatedSince` (fecha ISO) y devuelven",
        "`serverTime`, el cursor para la próxima sincronización de la app móvil.",
        "",
        "**Idempotencia:** `POST /api/enrollments` exige `clientRequestId`; repetirlo devuelve la",
        "misma inscripción con estado 200.",
        "",
        "Para probar: `POST /api/auth/login`, copia `tokens.idToken`, pulsa **Authorize** y pégalo.",
      ].join("\n"),
    },
    servers: [{ url: "/", description: "Mismo servidor de la documentación" }],
    tags: [
      { name: "Sistema" },
      { name: "Autenticación" },
      { name: "Cartelera" },
      { name: "ACUDES" },
      { name: "Escenarios" },
      { name: "Inscripciones" },
      { name: "Asistencia" },
      { name: "Reportes" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "idToken de Firebase (app móvil).",
        },
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "canchaya_session",
          description: "Cookie httpOnly del panel web.",
        },
      },
      schemas: {
        ErrorBody: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", enum: ERROR_CODES },
                message: { type: "string" },
                details: {},
              },
            },
          },
        },
        User: {
          type: "object",
          properties: {
            uid: { type: "string" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: { type: "string", enum: ["student", "manager", "admin"] },
            sex: {
              type: ["string", "null"],
              enum: ["female", "male", "non_binary", "prefer_not_to_say", null],
            },
          },
        },
        AuthResult: {
          type: "object",
          properties: {
            tokens: {
              type: "object",
              properties: {
                idToken: { type: "string" },
                refreshToken: { type: "string" },
                expiresIn: { type: "integer" },
              },
            },
            user: ref("User"),
          },
        },
        Scenario: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            type: {
              type: "string",
              enum: ["court", "field", "room", "pool", "auditorium", "gym", "other"],
            },
            status: { type: "string", enum: ["available", "maintenance", "inactive"] },
            location: { type: "string" },
            capacity: { type: "integer" },
            description: { type: "string" },
            createdAt: iso,
            updatedAt: iso,
          },
        },
        ScheduleSlot: {
          type: "object",
          properties: {
            id: { type: "string" },
            day: {
              type: "string",
              enum: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ],
            },
            startTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
            endTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
            scenarioId: { type: "string" },
            maxCapacity: { type: "integer" },
          },
        },
        Acude: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            category: {
              type: "string",
              enum: ["sports", "cultural", "training", "recreational"],
            },
            discipline: { type: "string" },
            scenarioId: { type: "string" },
            teacherId: { type: "string" },
            teacherName: { type: "string" },
            schedule: { type: "array", items: ref("ScheduleSlot") },
            maxCapacity: { type: "integer" },
            currentEnrolled: { type: "integer" },
            slotEnrolled: {
              type: "object",
              additionalProperties: { type: "integer" },
              description: "Contador transaccional de inscritos por franja",
            },
            status: { type: "string", enum: ["draft", "published", "archived"] },
            semester: { type: "string" },
            imageUrl: { type: ["string", "null"] },
            imageStoragePath: { type: ["string", "null"] },
            requirements: { type: "string" },
            attendanceMin: { type: "integer" },
            createdBy: { type: ["string", "null"] },
            createdAt: iso,
            updatedAt: iso,
          },
        },
        LiveScheduleSlot: {
          allOf: [
            ref("ScheduleSlot"),
            {
              type: "object",
              properties: {
                scenarioName: { type: "string" },
                capacity: { type: "integer" },
                enrolled: { type: "integer" },
                available: { type: "integer" },
                occupancyPct: { type: "integer" },
              },
            },
          ],
        },
        LiveAcude: {
          allOf: [
            ref("Acude"),
            {
              type: "object",
              properties: {
                schedule: { type: "array", items: ref("LiveScheduleSlot") },
                totalCapacity: { type: "integer" },
                totalAvailable: { type: "integer" },
              },
            },
          ],
        },
        Enrollment: {
          type: "object",
          properties: {
            id: { type: "string" },
            acudeId: { type: "string" },
            acudeName: { type: "string" },
            userId: { type: "string" },
            userEmail: { type: "string" },
            userName: { type: "string" },
            userSex: {
              type: "string",
              enum: ["female", "male", "non_binary", "prefer_not_to_say"],
            },
            slotId: { type: "string" },
            day: { type: "string" },
            startTime: { type: "string" },
            endTime: { type: "string" },
            scenarioId: { type: "string" },
            scenarioName: { type: "string" },
            category: { type: "string" },
            discipline: { type: "string" },
            teacherId: { type: "string" },
            teacherName: { type: "string" },
            status: { type: "string", enum: ["active", "canceled"] },
            clientRequestId: { type: "string" },
            semester: { type: "string" },
            enrolledAt: iso,
            enrolledOn: { type: "string", format: "date" },
            canceledAt: nullableIso,
            updatedAt: iso,
          },
        },
        AttendanceRecord: {
          type: "object",
          properties: {
            id: { type: "string" },
            acudeId: { type: "string" },
            acudeName: { type: "string" },
            slotId: { type: "string" },
            enrollmentId: { type: "string" },
            userId: { type: "string" },
            userName: { type: "string" },
            userEmail: { type: "string" },
            userSex: { type: "string" },
            category: { type: "string" },
            discipline: { type: "string" },
            teacherId: { type: "string" },
            teacherName: { type: "string" },
            scenarioId: { type: "string" },
            scenarioName: { type: "string" },
            day: { type: "string" },
            startTime: { type: "string" },
            endTime: { type: "string" },
            date: { type: "string", format: "date" },
            status: { type: "string", enum: ["present", "absent"] },
            notes: { type: "string" },
            recordedBy: { type: "string" },
            recordedAt: iso,
            updatedAt: iso,
          },
        },
        ReportResult: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["enrollments", "attendance"] },
            groupBy: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
            series: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  color: { type: "string" },
                  points: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string" },
                        label: { type: "string" },
                        value: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  student: { type: "string" },
                  email: { type: "string" },
                  sex: { type: "string" },
                  acude: { type: "string" },
                  slot: { type: "string" },
                  scenario: { type: "string" },
                  teacher: { type: "string" },
                  category: { type: "string" },
                  discipline: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
            summary: {
              type: "object",
              properties: {
                total: { type: "integer" },
                active: { type: "integer" },
                canceled: { type: "integer" },
                present: { type: "integer" },
                absent: { type: "integer" },
                attendanceRate: { type: "integer" },
              },
            },
            generatedAt: iso,
            serverTime: iso,
          },
        },
        OccupationSession: {
          type: "object",
          properties: {
            slotId: { type: "string" },
            day: { type: "string" },
            startTime: { type: "string" },
            endTime: { type: "string" },
            acudeId: { type: "string" },
            acudeName: { type: "string" },
            teacherName: { type: "string" },
            category: { type: "string" },
            enrolled: { type: "integer" },
            capacity: { type: "integer" },
            occupancyPct: { type: "integer" },
            phase: {
              type: "string",
              enum: ["in_session", "upcoming", "finished", "scheduled"],
            },
          },
        },
        ScenarioOccupation: {
          type: "object",
          properties: {
            scenario: ref("Scenario"),
            sessions: { type: "array", items: ref("OccupationSession") },
            current: { oneOf: [ref("OccupationSession"), { type: "null" }] },
            next: { oneOf: [ref("OccupationSession"), { type: "null" }] },
            enrolledToday: { type: "integer" },
          },
        },
      },
      responses: RESPONSES,
    },
    security: bearer,
    paths: {
      "/api/health": {
        get: {
          tags: ["Sistema"],
          summary: "Comprueba que el servidor responde",
          security: [],
          responses: {
            "200": {
              description: "Servidor activo",
              content: json({
                type: "object",
                properties: {
                  status: { const: "ok" },
                  service: { type: "string" },
                  timestamp: iso,
                },
              }),
            },
          },
        },
      },
      "/api/openapi.json": {
        get: {
          tags: ["Sistema"],
          summary: "Esta especificación OpenAPI",
          security: [],
          responses: {
            "200": { description: "OpenAPI 3.1", content: json({ type: "object" }) },
          },
        },
      },
      "/api/docs": {
        get: {
          tags: ["Sistema"],
          summary: "Swagger UI interactivo",
          security: [],
          responses: {
            "200": {
              description: "Página HTML",
              content: { "text/html": { schema: { type: "string" } } },
            },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Autenticación"],
          summary: "Registro público de estudiante (incluye sexo)",
          security: [],
          requestBody: { required: true, content: json(toSchema(registerSchema)) },
          responses: {
            "201": { description: "Cuenta creada", content: json(ref("AuthResult")) },
            "400": r("BadRequest"),
            "409": errorResponse("Correo ya registrado (EMAIL_IN_USE)"),
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Autenticación"],
          summary: "Inicio de sesión con correo y contraseña",
          security: [],
          requestBody: { required: true, content: json(toSchema(loginSchema)) },
          responses: {
            "200": { description: "Tokens y usuario", content: json(ref("AuthResult")) },
            "400": r("BadRequest"),
            "401": errorResponse("Credenciales inválidas (INVALID_CREDENTIALS)"),
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Autenticación"],
          summary: "Renueva el idToken",
          security: [],
          requestBody: { required: true, content: json(toSchema(refreshSchema)) },
          responses: {
            "200": { description: "Tokens nuevos", content: json(ref("AuthResult")) },
            "401": errorResponse("Refresh token inválido"),
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Autenticación"],
          summary: "Usuario autenticado",
          responses: {
            "200": {
              description: "Usuario y rol",
              content: json({ type: "object", properties: { user: ref("User") } }),
            },
            "401": r("Unauthorized"),
          },
        },
      },
      "/api/auth/manager-register": {
        post: {
          tags: ["Autenticación"],
          summary: "Crea un perfil de gestor (solo admin)",
          requestBody: { required: true, content: json(toSchema(managerRegisterSchema)) },
          responses: {
            "201": {
              description: "Gestor creado",
              content: json({ type: "object", properties: { manager: ref("User") } }),
            },
            "401": r("Unauthorized"),
            "403": r("Forbidden"),
            "409": errorResponse("Correo ya registrado"),
          },
        },
      },
      "/api/auth/managers": {
        get: {
          tags: ["Autenticación"],
          summary: "Lista los perfiles de profesor (solo admin)",
          responses: {
            "200": {
              description: "Profesores registrados",
              content: json(listResponse("managers", "User")),
            },
            "401": r("Unauthorized"),
            "403": r("Forbidden"),
          },
        },
      },
      "/api/acudes/live": {
        get: {
          tags: ["Cartelera"],
          summary: "Cartelera digital en tiempo real",
          description:
            "Devuelve solo ACUDES publicados, con cupos por subgrupo y `serverTime` como cursor.",
          parameters: queryParams(liveQuerySchema),
          responses: {
            "200": {
              description: "ACUDES publicados",
              content: json(listResponse("acudes", "LiveAcude")),
            },
            "401": r("Unauthorized"),
          },
        },
      },
      "/api/acudes": {
        get: {
          tags: ["ACUDES"],
          summary: "Lista ACUDES para gestión",
          parameters: queryParams(acudeQuerySchema),
          responses: {
            "200": {
              description: "ACUDES",
              content: json(listResponse("acudes", "Acude")),
            },
            "401": r("Unauthorized"),
            "403": r("Forbidden"),
          },
        },
        post: {
          tags: ["ACUDES"],
          summary: "Crea un ACUDE",
          description: "Rechaza cruces de escenario o docente con 409 SCHEDULE_CONFLICT.",
          requestBody: { required: true, content: json(toSchema(acudeSchema)) },
          responses: {
            "201": {
              description: "ACUDE creado",
              content: json({ type: "object", properties: { acude: ref("Acude") } }),
            },
            "400": r("BadRequest"),
            "401": r("Unauthorized"),
            "403": r("Forbidden"),
            "409": r("Conflict"),
          },
        },
      },
      "/api/acudes/{id}": {
        get: {
          tags: ["ACUDES"],
          summary: "Detalle de un ACUDE",
          parameters: [idParam],
          responses: {
            "200": {
              description: "ACUDE",
              content: json({ type: "object", properties: { acude: ref("Acude") } }),
            },
            "401": r("Unauthorized"),
            "404": r("NotFound"),
          },
        },
        put: {
          tags: ["ACUDES"],
          summary: "Actualiza un ACUDE",
          parameters: [idParam],
          requestBody: { required: true, content: json(toSchema(acudeSchema)) },
          responses: {
            "200": {
              description: "ACUDE actualizado",
              content: json({ type: "object", properties: { acude: ref("Acude") } }),
            },
            "400": r("BadRequest"),
            "403": r("Forbidden"),
            "404": r("NotFound"),
            "409": r("Conflict"),
          },
        },
        delete: {
          tags: ["ACUDES"],
          summary: "Archiva un ACUDE (borrado lógico)",
          parameters: [idParam],
          responses: {
            "200": {
              description: "ACUDE archivado",
              content: json({ type: "object", properties: { acude: ref("Acude") } }),
            },
            "403": r("Forbidden"),
            "404": r("NotFound"),
          },
        },
      },
      "/api/acudes/{id}/image": {
        get: {
          tags: ["ACUDES"],
          summary: "Imagen de portada del ACUDE",
          description:
            "Imagen pública servida desde Firestore cuando el proyecto no tiene Firebase Storage habilitado.",
          security: [],
          parameters: [idParam],
          responses: {
            "200": {
              description: "Imagen JPEG, PNG o WebP",
              content: { "image/*": { schema: { type: "string", format: "binary" } } },
            },
            "404": r("NotFound"),
          },
        },
        post: {
          tags: ["ACUDES"],
          summary: "Sube o reemplaza la portada global (solo admin)",
          parameters: [idParam],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description: "JPEG, PNG o WebP de máximo 500 KB",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Portada actualizada",
              content: json({
                type: "object",
                properties: {
                  acude: ref("Acude"),
                  image: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      storagePath: { type: ["string", "null"] },
                    },
                  },
                },
              }),
            },
            "400": r("BadRequest"),
            "401": r("Unauthorized"),
            "403": r("Forbidden"),
            "404": r("NotFound"),
          },
        },
        delete: {
          tags: ["ACUDES"],
          summary: "Quita la portada global (solo admin)",
          parameters: [idParam],
          responses: {
            "200": {
              description: "Portada eliminada",
              content: json({
                type: "object",
                properties: {
                  acude: ref("Acude"),
                  deleted: { type: "boolean" },
                },
              }),
            },
            "401": r("Unauthorized"),
            "403": r("Forbidden"),
            "404": r("NotFound"),
          },
        },
      },
      "/api/scenarios": {
        get: {
          tags: ["Escenarios"],
          summary: "Lista escenarios",
          parameters: queryParams(scenarioQuerySchema),
          responses: {
            "200": {
              description: "Escenarios",
              content: json(listResponse("scenarios", "Scenario")),
            },
            "401": r("Unauthorized"),
          },
        },
        post: {
          tags: ["Escenarios"],
          summary: "Crea un escenario",
          requestBody: { required: true, content: json(toSchema(scenarioSchema)) },
          responses: {
            "201": {
              description: "Escenario creado",
              content: json({ type: "object", properties: { scenario: ref("Scenario") } }),
            },
            "400": r("BadRequest"),
            "403": r("Forbidden"),
          },
        },
      },
      "/api/scenarios/{id}": {
        get: {
          tags: ["Escenarios"],
          summary: "Detalle de un escenario",
          parameters: [idParam],
          responses: {
            "200": {
              description: "Escenario",
              content: json({ type: "object", properties: { scenario: ref("Scenario") } }),
            },
            "404": r("NotFound"),
          },
        },
        put: {
          tags: ["Escenarios"],
          summary: "Actualiza un escenario",
          parameters: [idParam],
          requestBody: { required: true, content: json(toSchema(scenarioSchema)) },
          responses: {
            "200": {
              description: "Escenario actualizado",
              content: json({ type: "object", properties: { scenario: ref("Scenario") } }),
            },
            "403": r("Forbidden"),
            "404": r("NotFound"),
          },
        },
        delete: {
          tags: ["Escenarios"],
          summary: "Elimina un escenario sin ACUDES activos",
          parameters: [idParam],
          responses: {
            "200": {
              description: "Eliminado",
              content: json({ type: "object", properties: { deleted: { type: "boolean" } } }),
            },
            "409": r("Conflict"),
          },
        },
      },
      "/api/scenarios/occupation": {
        get: {
          tags: ["Escenarios"],
          summary: "Panel de ocupación por escenario",
          parameters: queryParams(occupationQuerySchema),
          responses: {
            "200": {
              description: "Ocupación en vivo",
              content: json({
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  day: { type: "string" },
                  scenarios: { type: "array", items: ref("ScenarioOccupation") },
                  generatedAt: iso,
                  serverTime: iso,
                },
              }),
            },
            "403": r("Forbidden"),
          },
        },
      },
      "/api/enrollments": {
        get: {
          tags: ["Inscripciones"],
          summary: "Lista todas las inscripciones (gestor)",
          parameters: queryParams(enrollmentQuerySchema),
          responses: {
            "200": {
              description: "Inscripciones",
              content: json(listResponse("enrollments", "Enrollment")),
            },
            "403": r("Forbidden"),
          },
        },
        post: {
          tags: ["Inscripciones"],
          summary: "Inscribe a un estudiante (idempotente)",
          description:
            "Exige clientRequestId. 201 si creó, 200 si ya existía. 409 NO_CAPACITY o STUDENT_OVERLAP.",
          requestBody: { required: true, content: json(toSchema(createEnrollmentSchema)) },
          responses: {
            "201": {
              description: "Inscripción creada",
              content: json({
                type: "object",
                properties: { enrollment: ref("Enrollment"), created: { type: "boolean" } },
              }),
            },
            "200": {
              description: "Inscripción ya existente (reintento idempotente)",
              content: json({
                type: "object",
                properties: { enrollment: ref("Enrollment"), created: { type: "boolean" } },
              }),
            },
            "400": r("BadRequest"),
            "409": r("Conflict"),
          },
        },
      },
      "/api/enrollments/me": {
        get: {
          tags: ["Inscripciones"],
          summary: "Mis inscripciones",
          parameters: queryParams(enrollmentQuerySchema),
          responses: {
            "200": {
              description: "Inscripciones del estudiante",
              content: json(listResponse("enrollments", "Enrollment")),
            },
            "401": r("Unauthorized"),
          },
        },
      },
      "/api/enrollments/{id}/cancel": {
        patch: {
          tags: ["Inscripciones"],
          summary: "Cancela una inscripción y libera el cupo",
          parameters: [idParam],
          responses: {
            "200": {
              description: "Inscripción cancelada",
              content: json({
                type: "object",
                properties: {
                  enrollment: ref("Enrollment"),
                  alreadyCanceled: { type: "boolean" },
                },
              }),
            },
            "404": r("NotFound"),
          },
        },
      },
      "/api/attendance": {
        get: {
          tags: ["Asistencia"],
          summary: "Consulta asistencia",
          parameters: queryParams(attendanceQuerySchema),
          responses: {
            "200": {
              description: "Registros de asistencia",
              content: json(listResponse("attendance", "AttendanceRecord")),
            },
            "403": r("Forbidden"),
          },
        },
        post: {
          tags: ["Asistencia"],
          summary: "Registra asistencia de un subgrupo",
          requestBody: { required: true, content: json(toSchema(saveAttendanceSchema)) },
          responses: {
            "200": {
              description: "Asistencia guardada",
              content: json({
                type: "object",
                properties: {
                  attendance: { type: "array", items: ref("AttendanceRecord") },
                  saved: { type: "integer" },
                },
              }),
            },
            "400": r("BadRequest"),
            "403": r("Forbidden"),
          },
        },
      },
      "/api/reports/enrollments": {
        get: {
          tags: ["Reportes"],
          summary: "Reporte de eventos de inscripción",
          description:
            "Filtros por todos los campos del formulario y rango de fechas. `groupBy` permite agrupar por fecha, semana, mes, estudiante, ACUDE, categoría, disciplina, escenario, franja, día, sexo, estado o docente.",
          parameters: queryParams(reportQuerySchema),
          responses: {
            "200": { description: "Reporte", content: json(ref("ReportResult")) },
            "403": r("Forbidden"),
          },
        },
      },
      "/api/reports/attendance": {
        get: {
          tags: ["Reportes"],
          summary: "Reporte de asistencia por ACUDE",
          description:
            "Mismos filtros y agrupaciones que el reporte de inscripciones. Resume presentes, tardanzas, ausencias y excusas.",
          parameters: queryParams(reportQuerySchema),
          responses: {
            "200": { description: "Reporte", content: json(ref("ReportResult")) },
            "403": r("Forbidden"),
          },
        },
      },
    },
  };
}
