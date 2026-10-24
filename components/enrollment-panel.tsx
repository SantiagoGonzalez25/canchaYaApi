"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelFormAction, enrollFormAction, type EnrollState } from "@/app/actions";
import { SEX_LABELS, WEEKDAY_LABELS } from "@/lib/labels";
import type { Enrollment, LiveAcude, Sex } from "@/lib/types";
import { Alert, buttonClass, dangerButtonClass, Field, ProgressBar, selectClass } from "./ui";

const initial: EnrollState = {};

export function EnrollmentPanel({
  acude,
  userSex,
  existing,
}: {
  acude: LiveAcude;
  userSex: Sex | null;
  existing: Enrollment | null;
}) {
  const router = useRouter();
  const firstAvailable = acude.schedule.find((slot) => slot.available > 0) ?? acude.schedule[0];
  const [slotId, setSlotId] = useState(firstAvailable?.id ?? "");
  const [state, action, pending] = useActionState(enrollFormAction, initial);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelFormAction, initial);

  useEffect(() => {
    if (state.ok || cancelState.ok) router.refresh();
  }, [state.ok, cancelState.ok, router]);

  if (existing) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div>
          <p className="text-sm font-bold text-emerald-900">Ya estás inscrito</p>
          <p className="text-xs text-emerald-700">
            {WEEKDAY_LABELS[existing.day]} {existing.startTime}–{existing.endTime} ·{" "}
            {existing.scenarioName}
          </p>
        </div>
        <p className="mt-3 text-xs text-emerald-800">
          Inscripción del {new Date(existing.enrolledAt).toLocaleDateString("es-CO")}. Si cancelas,
          el cupo se libera inmediatamente para otra persona.
        </p>
        <form action={cancelAction} className="mt-4">
          <input type="hidden" name="id" value={existing.id} />
          <button type="submit" disabled={cancelPending} className={dangerButtonClass}>
            {cancelPending ? "Cancelando..." : "Cancelar inscripción"}
          </button>
        </form>
        {cancelState.error && (
          <div className="mt-3">
            <Alert kind="error">{cancelState.error}</Alert>
          </div>
        )}
        {cancelState.ok && (
          <div className="mt-3">
            <Alert kind="ok">{cancelState.ok}</Alert>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="acudeId" value={acude.id} />
      <div>
        <p className="text-sm font-bold text-slate-900">Elige tu subgrupo</p>
        <p className="text-xs text-slate-500">
          Cada franja tiene cupo independiente. Los cruces con tus otros ACUDES se validan en el
          servidor.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {acude.schedule.map((slot) => {
          const disabled = slot.available <= 0;
          const selected = slotId === slot.id;
          return (
            <label
              key={slot.id}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                disabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                  : selected
                    ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                    : "border-slate-200 bg-white hover:border-teal-300"
              }`}
            >
              <input
                type="radio"
                name="slotId"
                value={slot.id}
                checked={selected}
                disabled={disabled}
                onChange={() => setSlotId(slot.id)}
                className="sr-only"
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {WEEKDAY_LABELS[slot.day]} · {slot.startTime}–{slot.endTime}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{slot.scenarioName}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    disabled
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {disabled ? "Lleno" : `${slot.available} cupos`}
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar
                  value={slot.occupancyPct}
                  tone={slot.occupancyPct >= 90 ? "rose" : slot.occupancyPct >= 60 ? "amber" : "teal"}
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  {slot.enrolled} de {slot.capacity} inscritos
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <Field label="Sexo" hint="El formulario de inscripción debe registrar el sexo de la persona.">
        <select name="sex" required defaultValue={userSex ?? ""} className={selectClass}>
          <option value="" disabled>
            Selecciona...
          </option>
          {Object.entries(SEX_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}

      <button
        type="submit"
        disabled={pending || !slotId || acude.totalAvailable <= 0}
        className={buttonClass}
      >
        {pending ? "Inscribiendo..." : "Confirmar inscripción"}
      </button>
      <p className="text-center text-[11px] text-slate-400">
        Al inscribirte aceptas la regla de asistencia mínima del {acude.attendanceMin}%.
      </p>
    </form>
  );
}
