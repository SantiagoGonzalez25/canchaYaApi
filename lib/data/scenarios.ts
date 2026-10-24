import "server-only";
import { db } from "../firebase";
import { ApiError } from "../errors";
import type { Scenario, ScenarioStatus } from "../types";
import type { ScenarioInput } from "../schemas";

export const SCENARIOS = "scenarios";

type ScenarioDoc = Omit<Scenario, "id">;

export function isScenarioDocument(data: unknown): data is ScenarioDoc {
  if (!data || typeof data !== "object") return false;
  const value = data as Partial<ScenarioDoc>;
  return typeof value.name === "string" && value.name.length > 0;
}

export function toScenario(id: string, data: ScenarioDoc): Scenario {
  return { id, ...data };
}

export interface ScenarioFilter {
  status?: ScenarioStatus;
  updatedSince?: string;
}

export async function listScenarios(filter: ScenarioFilter = {}): Promise<Scenario[]> {
  // Cursor en Firestore; estado en memoria para no exigir índices compuestos.
  let query: FirebaseFirestore.Query = db().collection(SCENARIOS);
  if (filter.updatedSince) query = query.where("updatedAt", ">", filter.updatedSince);
  const snap = await query.get();
  let scenarios = snap.docs.flatMap((doc) => {
    const data = doc.data();
    return isScenarioDocument(data) ? [toScenario(doc.id, data)] : [];
  });
  if (filter.status) scenarios = scenarios.filter((item) => item.status === filter.status);
  return scenarios.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getScenario(id: string): Promise<Scenario> {
  const snap = await db().collection(SCENARIOS).doc(id).get();
  if (!snap.exists || !isScenarioDocument(snap.data())) {
    throw new ApiError(404, "NOT_FOUND", "Escenario no encontrado");
  }
  return toScenario(snap.id, snap.data() as ScenarioDoc);
}

export async function getScenarioMap(): Promise<Map<string, Scenario>> {
  const scenarios = await listScenarios();
  return new Map(scenarios.map((scenario) => [scenario.id, scenario]));
}

export async function createScenario(input: ScenarioInput): Promise<Scenario> {
  const now = new Date().toISOString();
  const ref = db().collection(SCENARIOS).doc();
  const data: ScenarioDoc = {
    name: input.name,
    type: input.type,
    status: input.status,
    location: input.location,
    capacity: input.capacity,
    description: input.description,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return toScenario(ref.id, data);
}

export async function updateScenario(id: string, input: ScenarioInput): Promise<Scenario> {
  const ref = db().collection(SCENARIOS).doc(id);
  const result = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "Escenario no encontrado");
    const current = snap.data() as ScenarioDoc;
    const data: ScenarioDoc = {
      ...current,
      name: input.name,
      type: input.type,
      status: input.status,
      location: input.location,
      capacity: input.capacity,
      description: input.description,
      updatedAt: new Date().toISOString(),
    };
    tx.set(ref, data);
    return toScenario(id, data);
  });
  return result;
}

export async function deleteScenario(id: string): Promise<void> {
  const firestore = db();
  const scenarioRef = firestore.collection(SCENARIOS).doc(id);
  const acudes = await firestore.collection("acudes").get();
  const usedBy = acudes.docs.find((doc) => {
    const data = doc.data() as { schedule?: { scenarioId?: string }[]; status?: string };
    if (data.status === "archived") return false;
    return (data.schedule ?? []).some((slot) => slot.scenarioId === id);
  });
  if (usedBy) {
    throw new ApiError(
      409,
      "INVALID_STATE",
      "No puedes eliminar un escenario que está asignado a un ACUDE activo",
    );
  }
  const snap = await scenarioRef.get();
  if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "Escenario no encontrado");
  await scenarioRef.delete();
}
