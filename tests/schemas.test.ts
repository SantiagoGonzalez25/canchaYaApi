import { describe, expect, it } from "vitest";
import {
  acudeSchema,
  attendanceQuerySchema,
  attendanceSessionsQuerySchema,
  createEnrollmentSchema,
  loginSchema,
  managerRegisterSchema,
  registerSchema,
  reportQuerySchema,
  saveAttendanceSchema,
  scenarioSchema,
} from "@/lib/schemas";

const baseAcude = {
  name: "Fútbol sala formativo",
  description: "Taller de técnica y táctica.",
  category: "sports" as const,
  discipline: "Fútbol sala",
  teacherId: "teacher-1",
  teacherName: "Carlos Restrepo",
  scenarioId: "coliseo",
  maxCapacity: 20,
  status: "published" as const,
  semester: "2026-2",
  requirements: "Carné",
  attendanceMin: 80,
  schedule: [
    {
      day: "tuesday" as const,
      startTime: "14:00",
      endTime: "16:00",
      scenarioId: "coliseo",
    },
  ],
};

describe("loginSchema", () => {
  it("normaliza el correo", () => {
    expect(loginSchema.parse({ email: "  Ana@Mail.COM ", password: "x" }).email).toBe(
      "ana@mail.com",
    );
  });
  it("rechaza correos inválidos", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("exige sexo en el formulario", () => {
    expect(
      registerSchema.safeParse({
        email: "a@b.co",
        password: "123456",
        displayName: "Ana",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        email: "a@b.co",
        password: "123456",
        displayName: "Ana",
        sex: "female",
      }).success,
    ).toBe(true);
  });
  it("exige contraseña de 6+ caracteres", () => {
    expect(
      registerSchema.safeParse({
        email: "a@b.co",
        password: "12345",
        displayName: "Ana",
        sex: "female",
      }).success,
    ).toBe(false);
  });
  it("rechaza símbolos y números en el nombre", () => {
    for (const displayName of ["Ana@Tdea", "Ana 123", "Ana-María", "@@@@"]) {
      expect(
        registerSchema.safeParse({
          email: "a@b.co",
          password: "123456",
          displayName,
          sex: "female",
        }).success,
      ).toBe(false);
    }
  });
  it("normaliza espacios y acepta tildes y ñ", () => {
    const parsed = registerSchema.parse({
      email: "a@b.co",
      password: "123456",
      displayName: "  José   Ñáñez  ",
      sex: "male",
    });
    expect(parsed.displayName).toBe("José Ñáñez");
  });
});

describe("managerRegisterSchema", () => {
  it("acepta perfiles institucionales", () => {
    expect(
      managerRegisterSchema.safeParse({
        email: "gestor@tdea.edu.co",
        password: "Clave1234",
        displayName: "Gestor",
        sex: "male",
      }).success,
    ).toBe(true);
  });
});

describe("createEnrollmentSchema", () => {
  it("acepta un uuid como clientRequestId", () => {
    expect(
      createEnrollmentSchema.safeParse({
        acudeId: "futsal-formativo",
        slotId: "futsal-tue",
        clientRequestId: "3f2b8c1e-7d44-4b9a-9a1e-0c5d2f6a7b11",
        sex: "female",
      }).success,
    ).toBe(true);
  });
  it("rechaza ids con rutas y clientRequestId cortos", () => {
    expect(
      createEnrollmentSchema.safeParse({
        acudeId: "../../etc/passwd",
        slotId: "x",
        clientRequestId: "abc",
        sex: "female",
      }).success,
    ).toBe(false);
  });
  it("permite omitir el sexo si el perfil ya lo tiene", () => {
    expect(
      createEnrollmentSchema.safeParse({
        acudeId: "futsal-formativo",
        slotId: "futsal-tue",
        clientRequestId: "abcdefgh",
      }).success,
    ).toBe(true);
  });
});

describe("acudeSchema", () => {
  it("acepta un ACUDE válido", () => {
    expect(acudeSchema.safeParse(baseAcude).success).toBe(true);
  });
  it("rechaza franjas internas cruzadas en el mismo escenario", () => {
    const result = acudeSchema.safeParse({
      ...baseAcude,
      schedule: [
        { day: "tuesday", startTime: "14:00", endTime: "16:00", scenarioId: "coliseo" },
        { day: "tuesday", startTime: "15:00", endTime: "17:00", scenarioId: "coliseo" },
      ],
    });
    expect(result.success).toBe(false);
  });
  it("rechaza si el escenario principal no está en la programación", () => {
    const result = acudeSchema.safeParse({ ...baseAcude, scenarioId: "auditorio" });
    expect(result.success).toBe(false);
  });
  it("rechaza hora de fin anterior al inicio", () => {
    const result = acudeSchema.safeParse({
      ...baseAcude,
      schedule: [
        { day: "tuesday", startTime: "16:00", endTime: "14:00", scenarioId: "coliseo" },
      ],
    });
    expect(result.success).toBe(false);
  });
  it("rechaza horas negativas o fuera de rango", () => {
    for (const [startTime, endTime] of [
      ["-141111111", "10:00"],
      ["24:00", "25:00"],
      ["08:60", "10:00"],
    ]) {
      expect(
        acudeSchema.safeParse({
          ...baseAcude,
          schedule: [{ day: "tuesday", startTime, endTime, scenarioId: "coliseo" }],
        }).success,
      ).toBe(false);
    }
  });
  it("acepta franjas consecutivas que se tocan", () => {
    const result = acudeSchema.safeParse({
      ...baseAcude,
      schedule: [
        { day: "tuesday", startTime: "14:00", endTime: "16:00", scenarioId: "coliseo" },
        { day: "tuesday", startTime: "16:00", endTime: "18:00", scenarioId: "coliseo" },
      ],
    });
    expect(result.success).toBe(true);
  });
  it("permite un borrador sin escenario principal ni franjas asignadas", () => {
    const result = acudeSchema.safeParse({
      ...baseAcude,
      status: "draft",
      scenarioId: "",
      schedule: [
        { day: "tuesday", startTime: "14:00", endTime: "16:00", scenarioId: "" },
      ],
    });
    expect(result.success).toBe(true);
  });
  it("no marca cruce entre franjas sin escenario", () => {
    const result = acudeSchema.safeParse({
      ...baseAcude,
      status: "draft",
      scenarioId: "",
      schedule: [
        { day: "tuesday", startTime: "14:00", endTime: "16:00", scenarioId: "" },
        { day: "tuesday", startTime: "15:00", endTime: "17:00", scenarioId: "" },
      ],
    });
    expect(result.success).toBe(true);
  });
  it("exige escenario principal y en todas las franjas al publicar", () => {
    const result = acudeSchema.safeParse({
      ...baseAcude,
      scenarioId: "",
      schedule: [
        { day: "tuesday", startTime: "14:00", endTime: "16:00", scenarioId: "" },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("scenarioSchema", () => {
  it("valida capacidad y tipo", () => {
    expect(
      scenarioSchema.safeParse({
        name: "Coliseo",
        type: "gym",
        location: "Bloque 10",
        capacity: "300",
      }).success,
    ).toBe(true);
  });
});

describe("saveAttendanceSchema", () => {
  it("valida fecha y estados", () => {
    expect(
      saveAttendanceSchema.safeParse({
        acudeId: "futsal-formativo",
        slotId: "futsal-tue",
        date: "2026-10-20",
        records: [{ enrollmentId: "e1", status: "absent", notes: "" }],
      }).success,
    ).toBe(true);
    expect(
      saveAttendanceSchema.safeParse({
        acudeId: "futsal-formativo",
        slotId: "futsal-tue",
        date: "2026-10-20",
        records: [{ enrollmentId: "e1", status: "late" }],
      }).success,
    ).toBe(false);
    expect(
      saveAttendanceSchema.safeParse({
        acudeId: "futsal-formativo",
        slotId: "futsal-tue",
        date: "20/10/2026",
        records: [{ enrollmentId: "e1", status: "present" }],
      }).success,
    ).toBe(false);
  });
});

describe("reportQuerySchema", () => {
  it("aplica groupBy por defecto y valida fechas", () => {
    expect(reportQuerySchema.parse({}).groupBy).toBe("date");
    expect(reportQuerySchema.safeParse({ from: "2026-10-01", to: "2026-10-31" }).success).toBe(true);
    expect(reportQuerySchema.safeParse({ from: "ayer" }).success).toBe(false);
  });
  it("acepta estados de inscripción y de asistencia", () => {
    expect(reportQuerySchema.safeParse({ status: "active" }).success).toBe(true);
    expect(reportQuerySchema.safeParse({ status: "present" }).success).toBe(true);
    expect(reportQuerySchema.safeParse({ status: "late" }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ status: "otro" }).success).toBe(false);
  });
  it("acepta búsqueda por estudiante y agrupación por estudiante", () => {
    const parsed = reportQuerySchema.parse({ student: "Ana", groupBy: "student" });
    expect(parsed.student).toBe("Ana");
    expect(parsed.groupBy).toBe("student");
  });
});

describe("attendanceQuerySchema", () => {
  it("convierte fechas vacías en undefined", () => {
    expect(attendanceQuerySchema.parse({ date: "" }).date).toBeUndefined();
  });
});

describe("attendanceSessionsQuerySchema", () => {
  it("valida rango, ACUDE y estado de la sesión", () => {
    const parsed = attendanceSessionsQuerySchema.parse({
      from: "2026-11-02",
      to: "2026-11-08",
      acudeId: "futsal-formativo",
      status: "pending",
    });
    expect(parsed).toMatchObject({ status: "pending", acudeId: "futsal-formativo" });
    expect(attendanceSessionsQuerySchema.safeParse({ status: "saved" }).success).toBe(true);
    expect(attendanceSessionsQuerySchema.safeParse({ status: "canceled" }).success).toBe(false);
    expect(attendanceSessionsQuerySchema.safeParse({ from: "ayer" }).success).toBe(false);
  });
});
