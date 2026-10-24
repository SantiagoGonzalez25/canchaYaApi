"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAttendanceAction, type FormState } from "@/app/actions";
import { ATTENDANCE_STATUS_LABELS, SEX_LABELS, weekdayOf, WEEKDAY_LABELS } from "@/lib/labels";
import type {
  AttendanceRecord,
  AttendanceStatus,
  Enrollment,
} from "@/lib/types";
import type { SaveAttendanceInput } from "@/lib/schemas";
import {
  Alert,
  buttonClass,
  ProgressBar,
  secondaryButtonClass,
  textareaClass,
} from "./ui";

const STATUS_OPTIONS: AttendanceStatus[] = ["present", "late", "absent", "excused"];

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "border-emerald-500 bg-emerald-50 text-emerald-800",
  late: "border-amber-500 bg-amber-50 text-amber-800",
  absent: "border-rose-500 bg-rose-50 text-rose-800",
  excused: "border-blue-500 bg-blue-50 text-blue-800",
};

interface Entry {
  status: AttendanceStatus;
  notes: string;
}

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
  const [entries, setEntries] = useState<Record<string, Entry>>(() => {
    const previous = new Map(attendance.map((item) => [item.enrollmentId, item]));
    return Object.fromEntries(
      enrollments.map((enrollment) => {
        const record = previous.get(enrollment.id);
        return [
          enrollment.id,
          { status: record?.status ?? ("present" as AttendanceStatus), notes: record?.notes ?? "" },
        ];
      }),
    );
  });

  const setStatus = (id: string, status: AttendanceStatus) => {
    setEntries((current) => ({ ...current, [id]: { ...current[id], status } }));
  };
  const setNotes = (id: string, notes: string) => {
    setEntries((current) => ({ ...current, [id]: { ...current[id], notes } }));
  };
  const setAll = (status: AttendanceStatus) => {
    setEntries((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, entry]) => [id, { ...entry, status }]),
      ),
    );
  };

  const save = () => {
    const payload: SaveAttendanceInput = {
      acudeId,
      slotId,
      date,
      records: enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        status: entries[enrollment.id]?.status ?? "present",
        notes: entries[enrollment.id]?.notes ?? "",
      })),
    };
    startTransition(async () => {
      const result = await saveAttendanceAction(payload);
      setState(result);
      if (result.ok) router.refresh();
    });
  };

  const count = (status: AttendanceStatus) =>
    enrollments.filter((enrollment) => (entries[enrollment.id]?.status ?? "present") === status).length;
  const present = count("present") + count("late");

  if (enrollments.length === 0) {
    return (
      <Alert kind="info">
        No hay estudiantes inscritos activos en esta franja. Cuando se inscriban, aparecerán aquí
        para registrar su asistencia.
      </Alert>
    );
  }

  const mismatch = weekdayOf(date) !== enrollments[0]?.day;

  return (
    <div className="flex flex-col gap-4">
      {mismatch && (
        <Alert kind="info">
          La fecha seleccionada no corresponde al día de la franja (
          {WEEKDAY_LABELS[enrollments[0].day]}). Puedes guardar igual, pero verifica la sesión.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        {STATUS_OPTIONS.map((status) => (
          <div
            key={status}
            className={`rounded-xl border p-3 ${STATUS_STYLES[status]}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
              {ATTENDANCE_STATUS_LABELS[status]}
            </p>
            <p className="text-2xl font-black">{count(status)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          <span className="font-bold text-slate-900">{present}</span> de {enrollments.length}{" "}
          asistieron (incluye tardanzas)
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAll("present")} className={secondaryButtonClass}>
            Todos presentes
          </button>
          <button type="button" onClick={() => setAll("absent")} className={secondaryButtonClass}>
            Todos ausentes
          </button>
        </div>
      </div>

      <div className="max-h-[62vh] overflow-y-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Estudiante</th>
              <th className="px-3 py-2">Sexo</th>
              <th className="px-3 py-2">Asistencia</th>
              <th className="px-3 py-2">Nota</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment) => {
              const entry = entries[enrollment.id] ?? { status: "present", notes: "" };
              return (
                <tr key={enrollment.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-800">{enrollment.userName}</p>
                    <p className="text-[11px] text-slate-500">{enrollment.userEmail}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {SEX_LABELS[enrollment.userSex]}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatus(enrollment.id, status)}
                          className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition ${
                            entry.status === status
                              ? STATUS_STYLES[status]
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {ATTENDANCE_STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      value={entry.notes}
                      onChange={(event) => setNotes(enrollment.id, event.target.value)}
                      rows={1}
                      maxLength={300}
                      placeholder="Observación..."
                      className={`${textareaClass} min-w-36 text-xs`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className={buttonClass}>
          {pending ? "Guardando..." : `Guardar asistencia (${enrollments.length})`}
        </button>
        <div className="min-w-40 flex-1">
          <ProgressBar value={enrollments.length > 0 ? (present / enrollments.length) * 100 : 0} />
          <p className="mt-1 text-[11px] text-slate-500">
            {enrollments.length > 0 ? Math.round((present / enrollments.length) * 100) : 0}% de
            asistencia efectiva
          </p>
        </div>
      </div>

      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}
    </div>
  );
}
