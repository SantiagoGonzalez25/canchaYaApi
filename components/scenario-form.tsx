"use client";

import { useActionState } from "react";
import { saveScenarioAction, type FormState } from "@/app/actions";
import {
  SCENARIO_STATUS_LABELS,
  SCENARIO_TYPE_LABELS,
} from "@/lib/labels";
import type { Scenario } from "@/lib/types";
import { Alert, buttonClass, Field, inputClass, selectClass, textareaClass } from "./ui";
const initial: FormState = {};

export function ScenarioForm({ scenario }: { scenario?: Scenario }) {
  const [state, action, pending] = useActionState(saveScenarioAction, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      {scenario && <input type="hidden" name="id" value={scenario.id} />}
      <Field label="Nombre">
        <input
          name="name"
          required
          minLength={3}
          maxLength={100}
          defaultValue={scenario?.name}
          className={inputClass}
          placeholder="Coliseo institucional"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo">
          <select name="type" defaultValue={scenario?.type ?? "court"} className={selectClass}>
            {Object.entries(SCENARIO_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select
            name="status"
            defaultValue={scenario?.status ?? "available"}
            className={selectClass}
          >
            {Object.entries(SCENARIO_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Ubicación">
        <input
          name="location"
          required
          minLength={3}
          maxLength={160}
          defaultValue={scenario?.location}
          className={inputClass}
          placeholder="Campus Robledo · Bloque 10"
        />
      </Field>
      <Field label="Capacidad física">
        <input
          name="capacity"
          type="number"
          min={1}
          max={5000}
          required
          defaultValue={scenario?.capacity ?? 30}
          className={inputClass}
        />
      </Field>
      <Field label="Descripción">
        <textarea
          name="description"
          rows={2}
          maxLength={600}
          defaultValue={scenario?.description}
          className={textareaClass}
          placeholder="Maderamen, iluminación, accesibilidad..."
        />
      </Field>
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Guardando..." : scenario ? "Guardar escenario" : "Crear escenario"}
      </button>
    </form>
  );
}
