"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveAcudeAction, type FormState } from "@/app/actions";
import {
  ACUDE_STATUS_LABELS,
  CATEGORY_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
} from "@/lib/labels";
import type { Acude, AcudeCategory, AcudeStatus, Scenario, ScheduleSlot, Weekday } from "@/lib/types";
import {
  Alert,
  buttonClass,
  cardClass,
  dangerButtonClass,
  Field,
  inputClass,
  secondaryButtonClass,
  selectClass,
  textareaClass,
} from "./ui";

export interface TeacherOption {
  uid: string;
  name: string;
  email: string;
}

interface Row {
  key: string;
  id?: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  scenarioId: string;
  maxCapacity: string;
}

const initial: FormState = {};

function newRow(scenarioId: string, key?: string): Row {
  return {
    key: key ?? `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    day: "monday",
    startTime: "14:00",
    endTime: "16:00",
    scenarioId,
    maxCapacity: "",
  };
}

export function AcudeForm({
  initialAcude,
  scenarios,
  teachers,
  defaultSemester,
}: {
  initialAcude: Acude | null;
  scenarios: Scenario[];
  teachers: TeacherOption[];
  defaultSemester: string;
}) {
  const [state, action, pending] = useActionState(saveAcudeAction, initial);
  const [name, setName] = useState(initialAcude?.name ?? "");
  const [description, setDescription] = useState(initialAcude?.description ?? "");
  const [category, setCategory] = useState<AcudeCategory>(initialAcude?.category ?? "sports");
  const [discipline, setDiscipline] = useState(initialAcude?.discipline ?? "");
  const [teacherId, setTeacherId] = useState(initialAcude?.teacherId ?? "pending");
  const [teacherName, setTeacherName] = useState(initialAcude?.teacherName ?? "Por asignar");
  const [maxCapacity, setMaxCapacity] = useState(String(initialAcude?.maxCapacity ?? 20));
  const [status, setStatus] = useState<AcudeStatus>(initialAcude?.status ?? "draft");
  const [semester, setSemester] = useState(initialAcude?.semester ?? defaultSemester);
  const [imageUrl, setImageUrl] = useState(initialAcude?.imageUrl ?? "");
  const [requirements, setRequirements] = useState(initialAcude?.requirements ?? "");
  const [attendanceMin, setAttendanceMin] = useState(String(initialAcude?.attendanceMin ?? 80));
  const [schedule, setSchedule] = useState<Row[]>(
    initialAcude
      ? initialAcude.schedule.map((slot: ScheduleSlot) => ({
          key: slot.id,
          id: slot.id,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          scenarioId: slot.scenarioId,
          maxCapacity: slot.maxCapacity ? String(slot.maxCapacity) : "",
        }))
      : [newRow(scenarios[0]?.id ?? "", "new-initial")],
  );

  const patchRow = (key: string, patch: Partial<Row>) => {
    setSchedule((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const payload = {
    name,
    description,
    category,
    discipline,
    teacherId,
    teacherName,
    scenarioId: schedule[0]?.scenarioId ?? "",
    schedule: schedule.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      day: row.day,
      startTime: row.startTime,
      endTime: row.endTime,
      scenarioId: row.scenarioId,
      ...(row.maxCapacity ? { maxCapacity: Number(row.maxCapacity) } : {}),
    })),
    maxCapacity: Number(maxCapacity),
    status,
    semester,
    ...(imageUrl ? { imageUrl } : {}),
    requirements,
    attendanceMin: Number(attendanceMin),
  };

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      {initialAcude && <input type="hidden" name="id" value={initialAcude.id} />}
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="flex flex-col gap-6">
        <section className={`${cardClass} p-5`}>
          <h2 className="text-lg font-bold text-slate-900">Datos generales</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Nombre del ACUDE"
              hint="Puedes repetir el nombre si cambia el docente, el horario o el escenario."
              className="sm:col-span-2"
            >
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={3}
                maxLength={120}
                className={inputClass}
                placeholder="Fútbol sala formativo y representativo"
              />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={1500}
                className={textareaClass}
                placeholder="Objetivo, enfoque y público del ACUDE..."
              />
            </Field>
            <Field label="Categoría">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as AcudeCategory)}
                className={selectClass}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Disciplina">
              <input
                value={discipline}
                onChange={(event) => setDiscipline(event.target.value)}
                required
                maxLength={80}
                className={inputClass}
                placeholder="Fútbol sala, danza, teatro..."
              />
            </Field>
            <Field label="Semestre">
              <input
                value={semester}
                onChange={(event) => setSemester(event.target.value)}
                required
                pattern="\d{4}-[12]"
                className={inputClass}
                placeholder="2026-2"
              />
            </Field>
            <Field label="Docente" hint="Selecciona un gestor o escribe el nombre manualmente.">
              <select
                value={teacherId}
                onChange={(event) => {
                  const value = event.target.value;
                  setTeacherId(value);
                  const teacher = teachers.find((item) => item.uid === value);
                  setTeacherName(teacher ? teacher.name : "Por asignar");
                }}
                className={selectClass}
              >
                <option value="pending">Sin asignar / por asignar</option>
                {teacherId && !teachers.some((teacher) => teacher.uid === teacherId) && (
                  <option value={teacherId}>{teacherName || teacherId}</option>
                )}
                {teachers.map((teacher) => (
                  <option key={teacher.uid} value={teacher.uid}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre del docente">
              <input
                value={teacherName}
                onChange={(event) => setTeacherName(event.target.value)}
                required
                maxLength={120}
                className={inputClass}
                placeholder="Prof. Carlos Mario Restrepo"
              />
            </Field>
            <Field label="Cupo por subgrupo" hint="Cada franja puede sobrescribir este cupo.">
              <input
                type="number"
                min={1}
                max={500}
                value={maxCapacity}
                onChange={(event) => setMaxCapacity(event.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Asistencia mínima (%)">
              <input
                type="number"
                min={0}
                max={100}
                value={attendanceMin}
                onChange={(event) => setAttendanceMin(event.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Requisitos" className="sm:col-span-2">
              <textarea
                value={requirements}
                onChange={(event) => setRequirements(event.target.value)}
                rows={2}
                maxLength={800}
                className={textareaClass}
                placeholder="Carné, vestimenta, implementos..."
              />
            </Field>
            <Field
              label="Imagen de portada"
              hint="JPG, PNG o WebP. Máximo 500 KB."
              className="sm:col-span-2"
            >
              <div className="flex flex-col gap-2">
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={`Portada actual de ${name}`}
                    className="h-32 w-52 rounded-lg border border-slate-200 object-cover"
                  />
                )}
                <input
                  type="file"
                  name="imageFile"
                  accept="image/jpeg,image/png,image/webp"
                  className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-teal-800`}
                />
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  maxLength={500}
                  className={inputClass}
                  placeholder="O pega una URL externa: https://..."
                />
                {initialAcude?.imageUrl && (
                  <button
                    type="submit"
                    name="removeImage"
                    value="1"
                    className={dangerButtonClass}
                    onClick={(event) => {
                      if (!window.confirm("¿Eliminar la imagen actual del ACUDE?")) {
                        event.preventDefault();
                      }
                    }}
                  >
                    Eliminar imagen actual
                  </button>
                )}
              </div>
            </Field>
          </div>
        </section>

        <section className={`${cardClass} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Programación semanal</h2>
              <p className="text-xs text-slate-500">
                Cada franja tiene su propio escenario. El escenario principal de la ficha se toma de
                la primera franja. El servidor bloquea cruces de escenario y de docente.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSchedule((rows) => [...rows, newRow(scenarios[0]?.id ?? "")])
              }
              className={secondaryButtonClass}
            >
              + Agregar franja
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {schedule.map((row, index) => (
              <div
                key={row.key}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Franja {index + 1}
                  </p>
                  {schedule.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSchedule((rows) => rows.filter((item) => item.key !== row.key))
                      }
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <Field label="Día">
                    <select
                      value={row.day}
                      onChange={(event) =>
                        patchRow(row.key, { day: event.target.value as Weekday })
                      }
                      className={selectClass}
                    >
                      {WEEKDAYS.map((day) => (
                        <option key={day} value={day}>
                          {WEEKDAY_LABELS[day]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Inicio">
                    <input
                      type="time"
                      value={row.startTime}
                      onChange={(event) => patchRow(row.key, { startTime: event.target.value })}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Fin">
                    <input
                      type="time"
                      value={row.endTime}
                      onChange={(event) => patchRow(row.key, { endTime: event.target.value })}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Escenario">
                    <select
                      value={row.scenarioId}
                      onChange={(event) => patchRow(row.key, { scenarioId: event.target.value })}
                      className={selectClass}
                    >
                      <option value="">Sin asignar / Por asignar</option>
                      {scenarios.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cupo propio" hint="Opcional">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={row.maxCapacity}
                      onChange={(event) =>
                        patchRow(row.key, { maxCapacity: event.target.value })
                      }
                      className={inputClass}
                      placeholder={maxCapacity}
                    />
                  </Field>
                </div>
                {row.startTime >= row.endTime && (
                  <p className="mt-2 text-xs font-semibold text-rose-600">
                    La hora de fin debe ser mayor que la de inicio.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <section className={`${cardClass} p-5`}>
          <h2 className="text-lg font-bold text-slate-900">Publicación</h2>
          <div className="mt-4 flex flex-col gap-4">
            <Field
              label="Estado"
              hint="Solo los publicados aparecen en cartelera, calendario y ocupación. Con inscripciones activas solo puedes mantenerlo publicado."
            >
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as AcudeStatus)}
                className={selectClass}
              >
                {Object.entries(ACUDE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="rounded-xl bg-teal-50 p-3 text-xs leading-relaxed text-teal-800">
              <p className="font-bold">Programación de subgrupos</p>
              <p className="mt-1">
                Este formulario programa los subgrupos de un ACUDE. No genera reservas individuales
                de escenarios.
              </p>
            </div>
            {state.error && <Alert kind="error">{state.error}</Alert>}
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending
                ? "Guardando..."
                : initialAcude
                  ? "Guardar cambios"
                  : "Crear ACUDE"}
            </button>
            <Link href="/manager/acudes" className={secondaryButtonClass}>
              Cancelar
            </Link>
          </div>
        </section>
        <section className={`${cardClass} p-5 text-xs text-slate-500`}>
          <p className="font-bold text-slate-700">Validaciones del servidor</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Cupo por franja y cupo total.</li>
            <li>Cruce de escenario en el mismo día y hora.</li>
            <li>Cruce de docente en el mismo día y hora.</li>
            <li>No eliminar franjas con inscritos activos.</li>
          </ul>
        </section>
      </aside>
    </form>
  );
}
