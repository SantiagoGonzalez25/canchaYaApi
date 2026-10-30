import { describe, expect, it } from "vitest";
import {
  assertSemesterLimit,
  countActiveInSemester,
  MAX_ACUDES_PER_SEMESTER,
} from "@/lib/domain/enrollment-rules";
import { ApiError } from "@/lib/errors";

describe("límite de ACUDES por semestre", () => {
  it("cuenta solo activas del semestre", () => {
    const items = [
      { status: "active" as const, semester: "2026-2" },
      { status: "active" as const, semester: "2026-2" },
      { status: "canceled" as const, semester: "2026-2" },
      { status: "active" as const, semester: "2026-1" },
    ];
    expect(countActiveInSemester(items, "2026-2")).toBe(2);
  });

  it("bloquea un tercer ACUDE en el mismo semestre", () => {
    const items = [
      { status: "active" as const, semester: "2026-2" },
      { status: "active" as const, semester: "2026-2" },
    ];
    try {
      assertSemesterLimit(items, "2026-2");
      throw new Error("debía fallar");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("MAX_ACUDES");
    }
  });

  it("permite inscribirse si una se canceló", () => {
    const items = [
      { status: "active" as const, semester: "2026-2" },
      { status: "canceled" as const, semester: "2026-2" },
    ];
    expect(() => assertSemesterLimit(items, "2026-2")).not.toThrow();
  });

  it("el máximo es dos", () => {
    expect(MAX_ACUDES_PER_SEMESTER).toBe(2);
  });
});
