import { describe, expect, it } from "vitest";
import {
  findScheduleConflicts,
  isStudentOverlap,
  sessionPhase,
  slotCapacity,
  slotsOverlap,
} from "@/lib/domain/schedule";
import { upcomingSessions } from "@/lib/domain/agenda";
import type { Acude, LiveAcude } from "@/lib/types";

const baseAcude = {
  id: "acude-a",
  name: "Fútbol sala",
  status: "published" as const,
  teacherId: "teacher-1",
  schedule: [
    {
      id: "slot-a",
      day: "tuesday" as const,
      startTime: "14:00",
      endTime: "16:00",
      scenarioId: "coliseo",
    },
  ],
};

const otherAcude = {
  ...baseAcude,
  id: "acude-b",
  name: "Baloncesto",
  teacherId: "teacher-2",
  schedule: [
    {
      id: "slot-b",
      day: "tuesday" as const,
      startTime: "15:00",
      endTime: "17:00",
      scenarioId: "coliseo",
    },
  ],
};

const asAcude = (value: typeof baseAcude) => value as unknown as Acude;

describe("slotsOverlap", () => {
  it("detecta cruce en el mismo día", () => {
    expect(
      slotsOverlap(
        { day: "tuesday", startTime: "14:00", endTime: "16:00" },
        { day: "tuesday", startTime: "15:00", endTime: "17:00" },
      ),
    ).toBe(true);
  });
  it("permite franjas consecutivas", () => {
    expect(
      slotsOverlap(
        { day: "tuesday", startTime: "14:00", endTime: "16:00" },
        { day: "tuesday", startTime: "16:00", endTime: "18:00" },
      ),
    ).toBe(false);
  });
  it("no cruza días distintos", () => {
    expect(
      slotsOverlap(
        { day: "monday", startTime: "14:00", endTime: "16:00" },
        { day: "tuesday", startTime: "14:00", endTime: "16:00" },
      ),
    ).toBe(false);
  });
});

describe("findScheduleConflicts", () => {
  it("detecta cruce de escenario", () => {
    const conflicts = findScheduleConflicts(baseAcude, [asAcude(otherAcude)]);
    expect(conflicts.some((conflict) => conflict.type === "scenario")).toBe(true);
  });
  it("permite el mismo docente en escenarios distintos", () => {
    const conflicts = findScheduleConflicts(baseAcude, [
      {
        ...otherAcude,
        teacherId: "teacher-1",
        schedule: [{ ...otherAcude.schedule[0], scenarioId: "auditorio" }],
      } as unknown as Acude,
    ]);
    expect(conflicts).toHaveLength(0);
  });
  it("ignora ACUDES archivados", () => {
    const conflicts = findScheduleConflicts(baseAcude, [
      { ...otherAcude, status: "archived" } as unknown as Acude,
    ]);
    expect(conflicts).toHaveLength(0);
  });
  it("ignora el mismo ACUDE al editar", () => {
    const conflicts = findScheduleConflicts(baseAcude, [asAcude(baseAcude)], "acude-a");
    expect(conflicts).toHaveLength(0);
  });
});

describe("slotCapacity", () => {
  it("usa el cupo propio o el general", () => {
    expect(slotCapacity({ maxCapacity: 10 }, 20)).toBe(10);
    expect(slotCapacity({}, 20)).toBe(20);
  });
});

describe("isStudentOverlap", () => {
  const candidate = {
    acudeId: "acude-a",
    slotId: "slot-a",
    day: "tuesday" as const,
    startTime: "14:00",
    endTime: "16:00",
  };
  it("bloquea el mismo ACUDE", () => {
    expect(
      isStudentOverlap(
        [{ ...candidate, slotId: "otra-franja", day: "friday", startTime: "08:00", endTime: "10:00" }],
        candidate,
      ),
    ).toBe(true);
  });
  it("bloquea franjas que se solapan en otro ACUDE", () => {
    expect(
      isStudentOverlap(
        [
          {
            acudeId: "acude-b",
            slotId: "slot-b",
            day: "tuesday",
            startTime: "15:00",
            endTime: "17:00",
          },
        ],
        candidate,
      ),
    ).toBe(true);
  });
  it("permite franjas sin solape", () => {
    expect(
      isStudentOverlap(
        [
          {
            acudeId: "acude-b",
            slotId: "slot-b",
            day: "tuesday",
            startTime: "16:00",
            endTime: "18:00",
          },
        ],
        candidate,
      ),
    ).toBe(false);
  });
});

describe("sessionPhase", () => {
  it("calcula la fase con la hora de Bogotá", () => {
    // 2026-10-12T15:00:00Z = lunes 10:00 en America/Bogota
    const now = new Date("2026-10-12T15:00:00.000Z");
    expect(sessionPhase({ day: "monday", startTime: "09:00", endTime: "11:00" }, now)).toBe(
      "in_session",
    );
    expect(sessionPhase({ day: "monday", startTime: "11:00", endTime: "13:00" }, now)).toBe(
      "upcoming",
    );
    expect(sessionPhase({ day: "monday", startTime: "07:00", endTime: "09:00" }, now)).toBe(
      "finished",
    );
    expect(sessionPhase({ day: "tuesday", startTime: "09:00", endTime: "11:00" }, now)).toBe(
      "scheduled",
    );
  });
});

describe("upcomingSessions", () => {
  it("ordena las próximas franjas y no repite la que ya terminó", () => {
    const acude = {
      id: "a",
      name: "ACUDE",
      schedule: [
        {
          id: "s1",
          day: "monday",
          startTime: "07:00",
          endTime: "08:00",
          scenarioId: "x",
          scenarioName: "X",
          capacity: 10,
          enrolled: 2,
          available: 8,
          occupancyPct: 20,
        },
      ],
    } as unknown as LiveAcude;
    // Lunes 10:00 Bogotá: la franja de 07:00 ya pasó y debe ir a la próxima semana.
    const items = upcomingSessions([acude], new Date("2026-10-12T15:00:00.000Z"), 5);
    expect(items).toHaveLength(1);
    expect(items[0].date > "2026-10-12").toBe(true);
    expect(items[0].slot.startTime).toBe("07:00");
  });
});
