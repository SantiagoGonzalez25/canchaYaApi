import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "../firebase";
import { ApiError } from "../errors";
import { normalizeText } from "../text";
import {
  assertNoScheduleConflicts,
  findScheduleConflicts,
  slotCapacity,
  sortSlots,
} from "../domain/schedule";
import type {
  Acude,
  AcudeCategory,
  AcudeStatus,
  AuthUser,
  LiveAcude,
  LiveScheduleSlot,
  ScheduleSlot,
  Scenario,
} from "../types";
import type { AcudeInput, ScheduleSlotInput } from "../schemas";

export const ACUDES = "acudes";
export const ENROLLMENTS = "enrollments";

type AcudeDoc = Omit<Acude, "id">;

export function toAcude(id: string, data: AcudeDoc): Acude {
  return {
    id,
    ...data,
    schedule: sortSlots(data.schedule ?? []),
    currentEnrolled: data.currentEnrolled ?? 0,
    slotEnrolled: data.slotEnrolled ?? {},
    requirements: data.requirements ?? "",
    attendanceMin: data.attendanceMin ?? 80,
    imageUrl: data.imageUrl ?? null,
  };
}

/** Conserva los ids de franja existentes y genera ids estables para las nuevas. */
export function normalizeSchedule(
  schedule: ScheduleSlotInput[],
  existing: ScheduleSlot[] = [],
): ScheduleSlot[] {
  const used = new Set<string>();
  return sortSlots(
    schedule.map((slot, index) => {
      const existingId = slot.id && existing.some((item) => item.id === slot.id) ? slot.id : null;
      let id = existingId ?? slot.id ?? `${existing[index]?.id ?? ""}`.trim();
      if (!id || used.has(id)) id = randomUUID();
      used.add(id);
      return {
        id,
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        scenarioId: slot.scenarioId,
        ...(slot.maxCapacity ? { maxCapacity: slot.maxCapacity } : {}),
      };
    }),
  );
}

interface AcudeFilter {
  q?: string;
  category?: AcudeCategory;
  discipline?: string;
  status?: AcudeStatus;
  teacherId?: string;
  updatedSince?: string;
}

export async function listAcudes(filter: AcudeFilter = {}): Promise<Acude[]> {
  // Solo se filtra por el cursor en Firestore (evita índices compuestos);
  // status/categoría/docente se filtran en memoria.
  let query: FirebaseFirestore.Query = db().collection(ACUDES);
  if (filter.updatedSince) query = query.where("updatedAt", ">", filter.updatedSince);
  const snap = await query.get();
  let acudes = snap.docs.map((doc) => toAcude(doc.id, doc.data() as AcudeDoc));
  if (filter.status) acudes = acudes.filter((item) => item.status === filter.status);
  if (filter.category) acudes = acudes.filter((item) => item.category === filter.category);
  if (filter.teacherId) acudes = acudes.filter((item) => item.teacherId === filter.teacherId);
  if (filter.discipline) {
    const discipline = normalizeText(filter.discipline);
    acudes = acudes.filter((item) => normalizeText(item.discipline).includes(discipline));
  }
  if (filter.q) {
    const q = normalizeText(filter.q);
    acudes = acudes.filter((item) =>
      normalizeText(`${item.name} ${item.discipline} ${item.teacherName} ${item.description}`).includes(
        q,
      ),
    );
  }
  return acudes.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getAcude(id: string): Promise<Acude> {
  const snap = await db().collection(ACUDES).doc(id).get();
  if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "ACUDE no encontrado");
  return toAcude(snap.id, snap.data() as AcudeDoc);
}

export async function listLiveAcudes(
  filter: {
    q?: string;
    category?: AcudeCategory;
    day?: string;
    updatedSince?: string;
  } = {},
): Promise<LiveAcude[]> {
  const firestore = db();
  const [acudes, enrollmentSnap, scenarioSnap] = await Promise.all([
    listAcudes({
      q: filter.q,
      category: filter.category,
      status: "published",
      updatedSince: filter.updatedSince,
    }),
    firestore.collection(ENROLLMENTS).where("status", "==", "active").get(),
    firestore.collection("scenarios").get(),
  ]);

  const counts = new Map<string, number>();
  for (const doc of enrollmentSnap.docs) {
    const data = doc.data() as { acudeId: string; slotId: string };
    const key = `${data.acudeId}:${data.slotId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const scenarios = new Map<string, Scenario>(
    scenarioSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() } as Scenario]),
  );

  const result: LiveAcude[] = [];
  for (const acude of acudes) {
    const slots: LiveScheduleSlot[] = acude.schedule
      .filter((slot) => !filter.day || slot.day === filter.day)
      .map((slot) => {
        const capacity = slotCapacity(slot, acude.maxCapacity);
        const enrolled = counts.get(`${acude.id}:${slot.id}`) ?? 0;
        return {
          ...slot,
          scenarioName: scenarios.get(slot.scenarioId)?.name ?? "Escenario por asignar",
          capacity,
          enrolled,
          available: Math.max(0, capacity - enrolled),
          occupancyPct: capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0,
        };
      });
    if (filter.day && slots.length === 0) continue;
    const totalCapacity = slots.reduce((sum, slot) => sum + slot.capacity, 0);
    const totalEnrolled = slots.reduce((sum, slot) => sum + slot.enrolled, 0);
    result.push({
      ...acude,
      schedule: slots,
      currentEnrolled: totalEnrolled,
      totalCapacity,
      totalAvailable: Math.max(0, totalCapacity - totalEnrolled),
    });
  }
  return result;
}

export async function getLiveAcude(id: string): Promise<LiveAcude> {
  const acude = await getAcude(id);
  if (acude.status !== "published") {
    throw new ApiError(404, "NOT_FOUND", "El ACUDE no está publicado en la cartelera");
  }
  const snap = await db()
    .collection(ENROLLMENTS)
    .where("acudeId", "==", id)
    .where("status", "==", "active")
    .get();
  const counts = new Map<string, number>();
  for (const doc of snap.docs) {
    const data = doc.data() as { slotId: string };
    counts.set(data.slotId, (counts.get(data.slotId) ?? 0) + 1);
  }
  const scenarios = await db().collection("scenarios").get();
  const names = new Map(scenarios.docs.map((doc) => [doc.id, (doc.data() as Scenario).name]));
  const slots = acude.schedule.map((slot) => {
    const capacity = slotCapacity(slot, acude.maxCapacity);
    const enrolled = counts.get(slot.id) ?? 0;
    return {
      ...slot,
      scenarioName: names.get(slot.scenarioId) ?? "Escenario por asignar",
      capacity,
      enrolled,
      available: Math.max(0, capacity - enrolled),
      occupancyPct: capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0,
    };
  });
  const totalCapacity = slots.reduce((sum, slot) => sum + slot.capacity, 0);
  const totalEnrolled = slots.reduce((sum, slot) => sum + slot.enrolled, 0);
  return {
    ...acude,
    schedule: slots,
    currentEnrolled: totalEnrolled,
    totalCapacity,
    totalAvailable: Math.max(0, totalCapacity - totalEnrolled),
  };
}

async function assertScenariosExist(
  tx: FirebaseFirestore.Transaction,
  schedule: ScheduleSlot[],
): Promise<void> {
  const ids = [...new Set(schedule.map((slot) => slot.scenarioId))];
  const snaps = await Promise.all(
    ids.map((id) => tx.get(db().collection("scenarios").doc(id))),
  );
  snaps.forEach((snap, index) => {
    if (!snap.exists) {
      throw new ApiError(404, "NOT_FOUND", `El escenario ${ids[index]} no existe`);
    }
    const scenario = snap.data() as Scenario;
    if (scenario.status === "inactive") {
      throw new ApiError(409, "INVALID_STATE", `El escenario "${scenario.name}" está inactivo`);
    }
  });
}

function buildAcudeDoc(
  input: AcudeInput,
  user: AuthUser,
  schedule: ScheduleSlot[],
  previous?: AcudeDoc,
): AcudeDoc {
  const now = new Date().toISOString();
  return {
    name: input.name,
    description: input.description,
    category: input.category,
    discipline: input.discipline,
    scenarioId: input.scenarioId,
    teacherId: input.teacherId,
    teacherName: input.teacherName,
    schedule,
    maxCapacity: input.maxCapacity,
    currentEnrolled: previous?.currentEnrolled ?? 0,
    slotEnrolled: previous?.slotEnrolled ?? {},
    status: input.status,
    semester: input.semester,
    imageUrl: input.imageUrl ?? null,
    requirements: input.requirements,
    attendanceMin: input.attendanceMin,
    createdBy: previous?.createdBy ?? user.uid,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function createAcude(input: AcudeInput, user: AuthUser): Promise<Acude> {
  const firestore = db();
  const ref = firestore.collection(ACUDES).doc();
  const schedule = normalizeSchedule(input.schedule);

  return firestore.runTransaction(async (tx) => {
    // Todas las lecturas primero (regla de transacciones de Firestore).
    const allSnap = await tx.get(firestore.collection(ACUDES));
    await assertScenariosExist(tx, schedule);
    const others = allSnap.docs.map((doc) => toAcude(doc.id, doc.data() as AcudeDoc));
    const conflicts = findScheduleConflicts(
      { id: ref.id, name: input.name, teacherId: input.teacherId, schedule },
      others,
    );
    assertNoScheduleConflicts(conflicts);
    const data = buildAcudeDoc(input, user, schedule);
    tx.set(ref, data);
    return toAcude(ref.id, data);
  });
}

export async function updateAcude(
  id: string,
  input: AcudeInput,
  user: AuthUser,
): Promise<Acude> {
  const firestore = db();
  const ref = firestore.collection(ACUDES).doc(id);
  const schedule = normalizeSchedule(input.schedule, (await getAcude(id)).schedule);

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "ACUDE no encontrado");
    const previous = snap.data() as AcudeDoc;

    const allSnap = await tx.get(firestore.collection(ACUDES));
    await assertScenariosExist(tx, schedule);
    const activeSnap = await tx.get(
      firestore
        .collection(ENROLLMENTS)
        .where("acudeId", "==", id)
        .where("status", "==", "active"),
    );
    if (input.status === "archived" && activeSnap.size > 0) {
      throw new ApiError(
        409,
        "INVALID_STATE",
        `No puedes archivar un ACUDE con ${activeSnap.size} inscripciones activas. Cancélalas primero.`,
      );
    }

    const counts = new Map<string, number>();
    for (const doc of activeSnap.docs) {
      const data = doc.data() as { slotId: string };
      counts.set(data.slotId, (counts.get(data.slotId) ?? 0) + 1);
    }
    for (const slot of schedule) {
      const capacity = slotCapacity(slot, input.maxCapacity);
      const enrolled = counts.get(slot.id) ?? 0;
      if (enrolled > capacity) {
        throw new ApiError(
          409,
          "NO_CAPACITY",
          `No puedes reducir el cupo de la franja ${slot.day} ${slot.startTime} por debajo de ${enrolled} inscritos`,
        );
      }
    }

    // Las franjas que se eliminan no pueden tener inscritos activos.
    for (const oldSlot of previous.schedule) {
      if (!schedule.some((slot) => slot.id === oldSlot.id) && (counts.get(oldSlot.id) ?? 0) > 0) {
        throw new ApiError(
          409,
          "INVALID_STATE",
          "No puedes eliminar una franja que tiene estudiantes inscritos. Cancela esas inscripciones primero.",
        );
      }
    }

    const others = allSnap.docs.map((doc) => toAcude(doc.id, doc.data() as AcudeDoc));
    const conflicts = findScheduleConflicts(
      { id, name: input.name, teacherId: input.teacherId, schedule },
      others,
      id,
    );
    assertNoScheduleConflicts(conflicts);

    // Recalcular el total y los contadores por franja con las inscripciones activas.
    const currentEnrolled = activeSnap.size;
    const slotEnrolled = Object.fromEntries(
      schedule.map((slot) => [slot.id, counts.get(slot.id) ?? 0]),
    );
    const data = buildAcudeDoc(input, user, schedule, {
      ...previous,
      currentEnrolled,
      slotEnrolled,
    });
    tx.set(ref, data);
    return toAcude(id, data);
  });
}

/** Borrado lógico: conserva el histórico de inscripciones y asistencia. */
export async function archiveAcude(id: string): Promise<Acude> {
  const firestore = db();
  const ref = firestore.collection(ACUDES).doc(id);
  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "ACUDE no encontrado");
    const activeSnap = await tx.get(
      firestore
        .collection(ENROLLMENTS)
        .where("acudeId", "==", id)
        .where("status", "==", "active"),
    );
    if (activeSnap.size > 0) {
      throw new ApiError(
        409,
        "INVALID_STATE",
        `No puedes archivar un ACUDE con ${activeSnap.size} inscripciones activas. Cancélalas primero.`,
      );
    }
    const data = {
      ...(snap.data() as AcudeDoc),
      status: "archived" as const,
      updatedAt: new Date().toISOString(),
    };
    tx.set(ref, data);
    return toAcude(id, data);
  });
}

/** Datos de apoyo para formularios del panel: escenarios disponibles. */
export async function listScenarioOptions(): Promise<Scenario[]> {
  const snap = await db().collection("scenarios").get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Scenario)
    .filter((scenario) => scenario.status !== "inactive")
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
