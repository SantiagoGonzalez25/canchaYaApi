import "server-only";
import { db } from "../firebase";
import { slotCapacity, sessionPhase, sortSlots } from "../domain/schedule";
import { formatDateKey, isDateKey, todayKey, weekdayOf } from "../labels";
import type {
  Acude,
  OccupationSession,
  Scenario,
  ScenarioOccupation,
  SessionPhase,
  Weekday,
} from "../types";
import { isAcudeDocument } from "./acudes";
import { isScenarioDocument } from "./scenarios";

export interface OccupationResult {
  date: string;
  day: Weekday;
  scenarios: ScenarioOccupation[];
  generatedAt: string;
}

/**
 * Panel de ocupación: qué grupo ACUDE está usando cada escenario en una fecha.
 * La fuente de verdad son las franjas publicadas y las inscripciones activas.
 */
export async function getOccupation(
  requestedDate = todayKey(),
  day?: Weekday,
  now = new Date(),
): Promise<OccupationResult> {
  const date = isDateKey(requestedDate) ? requestedDate : todayKey();
  const firestore = db();
  const [scenarioSnap, acudeSnap, enrollmentSnap] = await Promise.all([
    firestore.collection("scenarios").get(),
    firestore.collection("acudes").where("status", "==", "published").get(),
    firestore.collection("enrollments").where("status", "==", "active").get(),
  ]);

  const scenarios = scenarioSnap.docs.flatMap((doc) => {
    const data = doc.data();
    return isScenarioDocument(data) ? [{ id: doc.id, ...data } as Scenario] : [];
  });
  const acudes = acudeSnap.docs.flatMap((doc) => {
    const data = doc.data();
    return isAcudeDocument(data) ? [{ id: doc.id, ...data } as Acude] : [];
  });
  const counts = new Map<string, number>();
  for (const doc of enrollmentSnap.docs) {
    const data = doc.data() as { acudeId: string; slotId: string };
    const key = `${data.acudeId}:${data.slotId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = formatDateKey(now);
  const targetDay = day ?? weekdayOf(date);
  const result: ScenarioOccupation[] = [];
  const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
  // Incluye escenarios referenciados por un ACUDE aunque el documento no exista.
  for (const acude of acudes) {
    for (const slot of acude.schedule) {
      if (!scenarioIds.has(slot.scenarioId)) {
        scenarios.push({
          id: slot.scenarioId,
          name: "Escenario sin registrar",
          type: "other",
          status: "inactive",
          location: "",
          capacity: 0,
          description: "",
          createdAt: "",
          updatedAt: "",
        });
        scenarioIds.add(slot.scenarioId);
      }
    }
  }

  for (const scenario of scenarios) {
    const sessions: OccupationSession[] = [];
    for (const acude of acudes) {
      for (const slot of sortSlots(acude.schedule)) {
        if (slot.scenarioId !== scenario.id || slot.day !== targetDay) continue;
        const capacity = slotCapacity(slot, acude.maxCapacity);
        const enrolled = counts.get(`${acude.id}:${slot.id}`) ?? 0;
        let phase: SessionPhase;
        if (date < today) phase = "finished";
        else if (date > today) phase = "scheduled";
        else phase = sessionPhase(slot, now);
        sessions.push({
          slotId: slot.id,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          acudeId: acude.id,
          acudeName: acude.name,
          teacherName: acude.teacherName,
          category: acude.category,
          enrolled,
          capacity,
          occupancyPct: capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0,
          phase,
        });
      }
    }
    sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
    const current = sessions.find((session) => session.phase === "in_session") ?? null;
    const next =
      sessions
        .filter((session) => session.phase === "upcoming")
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null;
    result.push({
      scenario,
      sessions,
      current,
      next,
      enrolledToday: sessions.reduce((sum, session) => sum + session.enrolled, 0),
    });
  }

  result.sort((a, b) => a.scenario.name.localeCompare(b.scenario.name, "es"));
  return { date, day: targetDay, scenarios: result, generatedAt: now.toISOString() };
}
