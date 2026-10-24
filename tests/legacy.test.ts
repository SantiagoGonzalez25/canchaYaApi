import { describe, expect, it } from "vitest";
import { isAcudeDocument } from "@/lib/data/acudes";
import { isScenarioDocument } from "@/lib/data/scenarios";

/**
 * La app móvil comparte el proyecto de Firebase y dejó documentos con campos en
 * español (`nombre`, `horarios`, `rol`). La API no debe mezclarlos con el modelo
 * nuevo ni romper los listados al ordenarlos.
 */
describe("compatibilidad con datos legacy", () => {
  it("reconoce un ACUDE del modelo nuevo", () => {
    expect(
      isAcudeDocument({
        name: "Fútbol sala",
        schedule: [
          { id: "s1", day: "tuesday", startTime: "14:00", endTime: "16:00", scenarioId: "coliseo" },
        ],
        maxCapacity: 20,
      }),
    ).toBe(true);
  });

  it("ignora un ACUDE legacy con nombre/horarios en español", () => {
    expect(
      isAcudeDocument({
        nombre: "Fútbol sala",
        horarios: [{ dia: "Martes", horaInicio: "14:00", horaFin: "16:00" }],
        cupoTotal: 20,
      }),
    ).toBe(false);
  });

  it("ignora cualquier documento sin schedule", () => {
    expect(isAcudeDocument({ name: "Sin programación" })).toBe(false);
    expect(isAcudeDocument(null)).toBe(false);
  });

  it("reconoce escenarios nuevos e ignora los legacy", () => {
    expect(isScenarioDocument({ name: "Coliseo", type: "gym" })).toBe(true);
    expect(isScenarioDocument({ nombre: "Coliseo", tipo: "deportivo" })).toBe(false);
  });
});
