"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAttendanceAction, type FormState } from "@/app/actions";
import type { AttendanceRecord, AttendanceStatus, Enrollment } from "@/lib/types";
import type { SaveAttendanceInput } from "@/lib/schemas";
import { Alert, buttonClass } from "./ui";

const OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Asistió" },
  { value: "absent", label: "No asistió" },
];

export function AttendanceForm({
  acudeId,
  slotId,
  date,
  enrollments,
  attendance,
}: {
  acudeId: string;
  slotId: string;
  date: string;
  enrollments: Enrollment[];
  attendance: AttendanceRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({});
  const [entries, setEntries] = useState<Record<string, AttendanceStatus | null>>(() => {
    const previous = new Map(attendance.map((item) => [item.enrollmentId, item.status]));
    return Object.fromEntries(
      enrollments.map((enrollment) => [enrollment.id, previous.get(enrollment.id) ?? null]),
    );
  });

  const marked = useMemo(
    () => enrollments.filter((enrollment) => entries[enrollment.id]).length,
    [enrollments, entries],
  );
  const missing = enrollments.length - marked;

  const setStatus = (id: string, status: AttendanceStatus) => {
    setEntries((current) => ({ ...current, [id]: status }));
  };

  const save = () => {
    const records: SaveAttendanceInput["records"] = enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      status: entries[enrollment.id] as AttendanceStatus,
      notes: "",
    }));
    startTransition(async () => {
      const result = await saveAttendanceAction({ acudeId, slotId, date, records });
      setState(result);
      if (result.ok) router.refresh();
    });
  };

  if (enrollments.length === 0) {
    return (
      <Alert kind="info">
        No hay estudiantes inscritos activos en esta franja. Cuando se inscriban, aparecerán aquí.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
        <p className="font-medium text-slate-700">
          {marked} de {enrollments.length} estudiantes marcados
        </p>
        <p className={`text-xs font-semibold ${missing > 0 ? "text-amber-700" : "text-emerald-700"}`}>
          {missing > 0 ? `Faltan ${missing} por marcar` : "Lista completa"}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {enrollments.map((enrollment) => {
          const value = entries[enrollment.id] ?? null;
          return (
            <li
              key={enrollment.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{enrollment.userName}</p>
                <p className="truncate text-xs text-slate-500">{enrollment.userEmail}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(enrollment.id, option.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      value === option.value
                        ? option.value === "present"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                    aria-pressed={value === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || missing > 0}
          className={buttonClass}
        >
          {pending ? "Guardando..." : "Guardar asistencia"}
        </button>
        {missing > 0 && (
          <p className="text-xs text-slate-500">
            Marca a todos los estudiantes para poder guardar.
          </p>
        )}
      </div>

      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}
    </div>
  );
}
