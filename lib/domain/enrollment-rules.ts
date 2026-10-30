import { ApiError } from "../errors";
import type { Enrollment, EnrollmentStatus } from "../types";

export const MAX_ACUDES_PER_SEMESTER = 2;

export interface EnrollmentLimitItem {
  status: EnrollmentStatus;
  semester?: string;
}

/** Cuenta solo inscripciones activas del semestre indicado. */
export function countActiveInSemester(
  items: EnrollmentLimitItem[],
  semester: string,
): number {
  return items.filter(
    (item) =>
      item.status === "active" && (item.semester === undefined || item.semester === semester),
  ).length;
}

export function assertSemesterLimit(
  items: EnrollmentLimitItem[],
  semester: string,
): void {
  if (countActiveInSemester(items, semester) >= MAX_ACUDES_PER_SEMESTER) {
    throw new ApiError(
      409,
      "MAX_ACUDES",
      `Solo puedes estar inscrito en ${MAX_ACUDES_PER_SEMESTER} ACUDES por semestre. Cancela uno para inscribirte en otro.`,
    );
  }
}

export function hasReachedSemesterLimit(
  items: Pick<Enrollment, "status" | "semester">[],
  semester: string,
): boolean {
  return countActiveInSemester(items, semester) >= MAX_ACUDES_PER_SEMESTER;
}
