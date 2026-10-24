import { describe, expect, it } from "vitest";
import {
  acudeSchema,
  attendanceQuerySchema,
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
  it("exige sexo", () => {
    expect(
      createEnrollmentSchema.safeParse({
        acudeId: "futsal-formativo",
        slotId: "futsal-tue",
        clientRequestId: "abcdefgh",
      }).success,
    ).toBe(false);
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
        records: [{ enrollmentId: "e1", status: "present", notes: "" }],
      }).success,
    ).toBe(true);
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
    expect(reportQuerySchema.safeParse({ status: "otro" }).success).toBe(false);
  });
});

describe("attendanceQuerySchema", () => {
  it("convierte fechas vacías en undefined", () => {
    expect(attendanceQuerySchema.parse({ date: "" }).date).toBeUndefined();
  });
});
