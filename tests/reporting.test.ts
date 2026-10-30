import { describe, expect, it } from "vitest";
import {
  buildAttendanceReport,
  buildEnrollmentReport,
} from "@/lib/domain/reporting";
import type { AttendanceRecord, Enrollment } from "@/lib/types";

function enrollment(overrides: Partial<Enrollment>): Enrollment {
  return {
    id: "e1",
    acudeId: "futsal",
    acudeName: "Fútbol sala",
    userId: "u1",
    userEmail: "ana@tdea.edu.co",
    userName: "Ana",
    userSex: "female",
    slotId: "slot-1",
    day: "tuesday",
    startTime: "14:00",
    endTime: "16:00",
    scenarioId: "coliseo",
    scenarioName: "Coliseo",
    category: "sports",
    discipline: "Fútbol sala",
    teacherId: "t1",
    teacherName: "Carlos",
    status: "active",
    clientRequestId: "abcdefgh",
    semester: "2026-2",
    enrolledAt: "2026-10-10T15:00:00.000Z",
    enrolledOn: "2026-10-10",
    canceledAt: null,
    updatedAt: "2026-10-10T15:00:00.000Z",
    ...overrides,
  };
}

function attendance(overrides: Partial<AttendanceRecord>): AttendanceRecord {
  return {
    id: "a1",
    acudeId: "futsal",
    acudeName: "Fútbol sala",
    slotId: "slot-1",
    enrollmentId: "e1",
    userId: "u1",
    userName: "Ana",
    userEmail: "ana@tdea.edu.co",
    userSex: "female",
    category: "sports",
    discipline: "Fútbol sala",
    teacherId: "t1",
    teacherName: "Carlos",
    scenarioId: "coliseo",
    scenarioName: "Coliseo",
    day: "tuesday",
    startTime: "14:00",
    endTime: "16:00",
    date: "2026-10-13",
    status: "present",
    notes: "",
    recordedBy: "manager",
    recordedAt: "2026-10-13T21:00:00.000Z",
    updatedAt: "2026-10-13T21:00:00.000Z",
    ...overrides,
  };
}

const now = new Date("2026-10-24T12:00:00.000Z");

describe("buildEnrollmentReport", () => {
  const items = [
    enrollment({ id: "e1" }),
    enrollment({
      id: "e2",
      userId: "u2",
      acudeId: "teatro",
      acudeName: "Teatro",
      category: "cultural",
      discipline: "Teatro",
      scenarioName: "Auditorio",
      userSex: "male",
      userName: "Santiago",
      enrolledOn: "2026-10-11",
      enrolledAt: "2026-10-11T15:00:00.000Z",
    }),
    enrollment({
      id: "e3",
      status: "canceled",
      canceledAt: "2026-10-20T15:00:00.000Z",
      enrolledOn: "2026-10-12",
      enrolledAt: "2026-10-12T15:00:00.000Z",
    }),
  ];

  it("resume activas y canceladas", () => {
    const report = buildEnrollmentReport(items, {}, "date", now);
    expect(report.kind).toBe("enrollments");
    expect(report.summary.total).toBe(3);
    expect(report.summary.active).toBe(2);
    expect(report.summary.canceled).toBe(1);
    expect(report.series).toHaveLength(2);
  });

  it("filtra por rango de fechas y sexo", () => {
    const report = buildEnrollmentReport(
      items,
      { from: "2026-10-11", to: "2026-10-11", sex: "male" },
      "date",
      now,
    );
    expect(report.summary.total).toBe(1);
    expect(report.summary.active).toBe(1);
  });

  it("agrupa por categoría con etiquetas legibles", () => {
    const report = buildEnrollmentReport(items, {}, "category", now);
    const active = report.series.find((series) => series.name === "Activas")!;
    const labels = active.points.map((point) => point.label);
    expect(labels).toContain("Deportiva");
    expect(labels).toContain("Cultural");
  });

  it("devuelve series vacías si no hay datos", () => {
    const report = buildEnrollmentReport(items, { from: "2027-01-01" }, "date", now);
    expect(report.summary.total).toBe(0);
    expect(report.series.every((series) => series.points.length === 0)).toBe(true);
  });

  it("filtra y agrupa por nombre o correo del estudiante", () => {
    const filtered = buildEnrollmentReport(items, { student: "santiago" }, "date", now);
    expect(filtered.summary.total).toBe(1);

    const grouped = buildEnrollmentReport(items, {}, "student", now);
    const labels = grouped.series.flatMap((series) => series.points.map((point) => point.label));
    expect(labels).toContain("Ana");
    expect(labels).toContain("Santiago");
  });
});

describe("buildAttendanceReport", () => {
  const items = [
    attendance({ id: "a1", status: "present" }),
    attendance({
      id: "a2",
      status: "present",
      userId: "u2",
      userName: "Santiago",
      userEmail: "santiago@tdea.edu.co",
      userSex: "male",
    }),
    attendance({ id: "a3", status: "present" }),
    attendance({ id: "a4", status: "absent" }),
    attendance({
      id: "a5",
      acudeId: "teatro",
      acudeName: "Teatro",
      category: "cultural",
      status: "absent",
    }),
  ];

  it("calcula la tasa de asistencia con dos estados", () => {
    const report = buildAttendanceReport(items, {}, "acude", now);
    expect(report.kind).toBe("attendance");
    expect(report.summary.total).toBe(5);
    expect(report.summary.present).toBe(3);
    expect(report.summary.absent).toBe(2);
    expect(report.summary.attendanceRate).toBe(60);
    expect(report.series).toHaveLength(2);
  });

  it("agrupa por ACUDE, por sexo y por estudiante", () => {
    const byAcude = buildAttendanceReport(items, {}, "acude", now);
    const present = byAcude.series.find((series) => series.name === "Asistió")!;
    expect(present.points.map((point) => point.label)).toContain("Fútbol sala");

    const bySex = buildAttendanceReport(items, {}, "sex", now);
    const male = bySex.series
      .find((series) => series.name === "Asistió")!
      .points.find((point) => point.label === "Masculino");
    expect(male?.value).toBe(1);

    const byStudent = buildAttendanceReport(items, {}, "student", now);
    const labels = byStudent.series.flatMap((series) => series.points.map((point) => point.label));
    expect(labels).toContain("Santiago");
  });

  it("filtra por estado de asistencia y por nombre/correo", () => {
    const report = buildAttendanceReport(items, { status: "absent" }, "acude", now);
    expect(report.summary.total).toBe(2);
    expect(report.summary.absent).toBe(2);

    const byStudent = buildAttendanceReport(items, { student: "Santiago" }, "acude", now);
    expect(byStudent.summary.total).toBe(1);
  });
});
