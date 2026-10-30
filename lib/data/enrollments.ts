import "server-only";
import { db } from "../firebase";
import { ApiError } from "../errors";
import { formatDateKey } from "../labels";
import { isStudentOverlap, slotCapacity } from "../domain/schedule";
import { updateUserSex } from "../services/auth";
import type {
  Acude,
  AuthUser,
  Enrollment,
  EnrollmentStatus,
  ScheduleSlot,
} from "../types";
import type { z } from "zod";
import type { createEnrollmentSchema } from "../schemas";
import { ACUDES } from "./acudes";

export const ENROLLMENTS = "enrollments";

type EnrollmentDoc = Omit<Enrollment, "id">;
type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

export function toEnrollment(id: string, data: EnrollmentDoc): Enrollment {
  return { id, ...data, canceledAt: data.canceledAt ?? null };
}

function findSlot(acude: Acude, slotId: string): ScheduleSlot {
  const slot = acude.schedule.find((item) => item.id === slotId);
  if (!slot) throw new ApiError(404, "NOT_FOUND", "La franja horaria no existe en este ACUDE");
  return slot;
}

export interface CreateEnrollmentResult {
  enrollment: Enrollment;
  created: boolean;
}

/**
 * Inscripción idempotente a una franja de un ACUDE.
 *
 * El id del documento se deriva de `{uid}_{clientRequestId}`: si la app móvil
 * reintenta una inscripción creada sin conexión, recibe la misma inscripción en
 * lugar de duplicarla. La transacción garantiza que dos estudiantes no ocupen el
 * último cupo a la vez.
 */
export async function createEnrollment(
  user: AuthUser,
  input: CreateEnrollmentInput,
): Promise<CreateEnrollmentResult> {
  if (user.role !== "student") {
    throw new ApiError(403, "FORBIDDEN", "Solo los estudiantes pueden inscribirse a un ACUDE");
  }
  const sex = input.sex ?? user.sex;
  if (!sex) {
    throw new ApiError(400, "VALIDATION_ERROR", "Falta el sexo del estudiante en el perfil");
  }
  const firestore = db();
  const enrollmentRef = firestore.collection(ENROLLMENTS).doc(`${user.uid}_${input.clientRequestId}`);
  const acudeRef = firestore.collection(ACUDES).doc(input.acudeId);

  const result = await firestore.runTransaction(async (tx) => {
    const existing = await tx.get(enrollmentRef);
    if (existing.exists) {
      return {
        enrollment: toEnrollment(existing.id, existing.data() as EnrollmentDoc),
        created: false,
      };
    }

    const acudeSnap = await tx.get(acudeRef);
    if (!acudeSnap.exists) throw new ApiError(404, "NOT_FOUND", "ACUDE no encontrado");
    const acude = { id: acudeSnap.id, ...(acudeSnap.data() as Omit<Acude, "id">) } as Acude;
    if (acude.status !== "published") {
      throw new ApiError(409, "INVALID_STATE", "El ACUDE no está abierto para inscripciones");
    }
    const slot = findSlot(acude, input.slotId);

    const [acudeEnrollments, myEnrollments] = await Promise.all([
      tx.get(
        firestore
          .collection(ENROLLMENTS)
          .where("acudeId", "==", input.acudeId)
          .where("status", "==", "active"),
      ),
      tx.get(
        firestore
          .collection(ENROLLMENTS)
          .where("userId", "==", user.uid)
          .where("status", "==", "active"),
      ),
    ]);

    const docsInSlot = acudeEnrollments.docs.filter(
      (doc) => (doc.data() as EnrollmentDoc).slotId === slot.id,
    ).length;
    // El contador del ACUDE serializa las inscripciones concurrentes. Usamos el
    // máximo entre el contador y los documentos para autocorregir datos legados.
    const tracked = acude.slotEnrolled?.[slot.id] ?? 0;
    const slotEnrolled = Math.max(tracked, docsInSlot);
    const capacity = slotCapacity(slot, acude.maxCapacity);
    if (slotEnrolled >= capacity) {
      throw new ApiError(
        409,
        "NO_CAPACITY",
        `El subgrupo de ${slot.day} ${slot.startTime}-${slot.endTime} ya está lleno (${capacity} cupos)`,
      );
    }

    const conflicts = myEnrollments.docs.map((doc) => doc.data() as EnrollmentDoc);
    if (
      isStudentOverlap(conflicts, {
        acudeId: input.acudeId,
        slotId: slot.id,
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
    ) {
      throw new ApiError(
        409,
        "STUDENT_OVERLAP",
        "Ya estás inscrito en este ACUDE o en otro grupo que se cruza en el mismo horario",
      );
    }

    const scenarioSnap = await tx.get(
      firestore.collection("scenarios").doc(slot.scenarioId),
    );
    const scenarioName = scenarioSnap.exists
      ? ((scenarioSnap.data() as { name?: string }).name ?? "Escenario")
      : "Escenario";

    const now = new Date().toISOString();
    const data: EnrollmentDoc = {
      acudeId: acude.id,
      acudeName: acude.name,
      userId: user.uid,
      userEmail: user.email,
      userName: user.name,
      userSex: sex,
      slotId: slot.id,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      scenarioId: slot.scenarioId,
      scenarioName,
      category: acude.category,
      discipline: acude.discipline,
      teacherId: acude.teacherId,
      teacherName: acude.teacherName,
      status: "active",
      clientRequestId: input.clientRequestId,
      enrolledAt: now,
      enrolledOn: formatDateKey(now),
      canceledAt: null,
      updatedAt: now,
    };
    tx.set(enrollmentRef, data);
    const nextSlotEnrolled = {
      ...(acude.slotEnrolled ?? {}),
      [slot.id]: slotEnrolled + 1,
    };
    tx.update(acudeRef, {
      currentEnrolled: Math.max(acude.currentEnrolled ?? 0, acudeEnrollments.size) + 1,
      slotEnrolled: nextSlotEnrolled,
      updatedAt: now,
    });
    return { enrollment: toEnrollment(enrollmentRef.id, data), created: true };
  });

  // El sexo se toma del perfil; solo se actualiza si el usuario lo cambió.
  if (result.created && user.sex !== sex) {
    try {
      await updateUserSex(user.uid, sex);
    } catch (err) {
      console.warn("[enrollments] no se pudo actualizar el sexo del perfil:", err);
    }
  }
  return result;
}

/** Cancelación idempotente: libera el cupo de inmediato. */
export async function cancelEnrollment(
  actor: AuthUser,
  id: string,
): Promise<{ enrollment: Enrollment; alreadyCanceled: boolean }> {
  const firestore = db();
  const ref = firestore.collection(ENROLLMENTS).doc(id);
  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "Inscripción no encontrada");
    const enrollment = toEnrollment(snap.id, snap.data() as EnrollmentDoc);
    const isOwner = enrollment.userId === actor.uid;
    const canManage =
      actor.role === "admin" ||
      (actor.role === "manager" && enrollment.teacherId === actor.uid);
    if (!isOwner && !canManage) {
      // No se revela la existencia de inscripciones ajenas.
      throw new ApiError(404, "NOT_FOUND", "Inscripción no encontrada");
    }
    if (enrollment.status === "canceled") {
      return { enrollment, alreadyCanceled: true };
    }

    const acudeRef = firestore.collection(ACUDES).doc(enrollment.acudeId);
    const acudeSnap = await tx.get(acudeRef);
    const activeSnap = await tx.get(
      firestore
        .collection(ENROLLMENTS)
        .where("acudeId", "==", enrollment.acudeId)
        .where("status", "==", "active"),
    );
    const now = new Date().toISOString();
    const updated: EnrollmentDoc = {
      ...(snap.data() as EnrollmentDoc),
      status: "canceled",
      canceledAt: now,
      updatedAt: now,
    };
    tx.set(ref, updated);
    if (acudeSnap.exists) {
      const remaining = activeSnap.docs.filter((doc) => doc.id !== id);
      const slotEnrolled: Record<string, number> = {};
      for (const doc of remaining) {
        const data = doc.data() as EnrollmentDoc;
        slotEnrolled[data.slotId] = (slotEnrolled[data.slotId] ?? 0) + 1;
      }
      tx.update(acudeRef, {
        currentEnrolled: remaining.length,
        slotEnrolled,
        updatedAt: now,
      });
    }
    return { enrollment: toEnrollment(id, updated), alreadyCanceled: false };
  });
}

export interface EnrollmentFilter {
  status?: EnrollmentStatus;
  acudeId?: string;
  teacherId?: string;
  slotId?: string;
  updatedSince?: string;
  from?: string;
  to?: string;
  userId?: string;
}

export async function listEnrollments(filter: EnrollmentFilter = {}): Promise<Enrollment[]> {
  // Solo el cursor usa Firestore; el resto se filtra en memoria para evitar índices compuestos.
  let query: FirebaseFirestore.Query = db().collection(ENROLLMENTS);
  if (filter.updatedSince) query = query.where("updatedAt", ">", filter.updatedSince);
  const snap = await query.get();
  let items = snap.docs.map((doc) => toEnrollment(doc.id, doc.data() as EnrollmentDoc));
  if (filter.acudeId) items = items.filter((item) => item.acudeId === filter.acudeId);
  if (filter.teacherId) items = items.filter((item) => item.teacherId === filter.teacherId);
  if (filter.userId) items = items.filter((item) => item.userId === filter.userId);
  if (filter.status) items = items.filter((item) => item.status === filter.status);
  if (filter.slotId) items = items.filter((item) => item.slotId === filter.slotId);
  if (filter.from) items = items.filter((item) => (item.enrolledOn ?? item.enrolledAt.slice(0, 10)) >= filter.from!);
  if (filter.to) items = items.filter((item) => (item.enrolledOn ?? item.enrolledAt.slice(0, 10)) <= filter.to!);
  return items.sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
}

export async function listMyEnrollments(
  user: AuthUser,
  filter: Omit<EnrollmentFilter, "userId"> = {},
): Promise<Enrollment[]> {
  return listEnrollments({ ...filter, userId: user.uid });
}

/** Inscripciones activas de una franja: base para pasar asistencia. */
export async function listActiveEnrollments(
  acudeId: string,
  slotId?: string,
): Promise<Enrollment[]> {
  const items = await listEnrollments({ acudeId, status: "active" });
  return slotId ? items.filter((item) => item.slotId === slotId) : items;
}

export async function listMyActiveEnrollmentForAcude(
  userId: string,
  acudeId: string,
): Promise<Enrollment | null> {
  const snap = await db()
    .collection(ENROLLMENTS)
    .where("userId", "==", userId)
    .where("acudeId", "==", acudeId)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toEnrollment(snap.docs[0].id, snap.docs[0].data() as EnrollmentDoc);
}

export type { CreateEnrollmentInput, EnrollmentDoc };
