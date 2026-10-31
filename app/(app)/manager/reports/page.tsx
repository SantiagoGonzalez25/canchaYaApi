import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReportActions, ReportChart } from "@/components/report-chart";
import {
  Alert,
  Badge,
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  secondaryButtonClass,
  selectClass,
  StatCard,
} from "@/components/ui";
import { listAcudes } from "@/lib/data/acudes";
import { attendanceReport, enrollmentReport } from "@/lib/data/reports";
import { listScenarios } from "@/lib/data/scenarios";
import {
  ATTENDANCE_STATUS_LABELS,
  CATEGORY_LABELS,
  ENROLLMENT_STATUS_LABELS,
  REPORT_GROUP_LABELS,
  SEX_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
} from "@/lib/labels";
import { reportQuerySchema, type ReportQuery } from "@/lib/schemas";
import type { ReportGroupBy } from "@/lib/types";
import { requirePageStaff } from "@/lib/web/session";

export const metadata: Metadata = { title: "Reportes" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const GROUP_OPTIONS = Object.keys(REPORT_GROUP_LABELS) as ReportGroupBy[];

function buildHref(
  params: Record<string, string | string[] | undefined>,
  kind: string,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const item = first(value);
    if (item) search.set(key, item);
  }
  search.set("kind", kind);
  return `/manager/reports?${search.toString()}`;
}

async function ReportsContent({
  searchParams,
}: {
  searchParams: PageProps<"/manager/reports">["searchParams"];
}) {
  const user = await requirePageStaff();
  const isAdmin = user.role === "admin";
  const params = await searchParams;
  const kind = first(params.kind) === "attendance" ? "attendance" : "enrollments";
  const defaultGroup: ReportGroupBy = kind === "attendance" ? "acude" : "date";
  const groupBy = (first(params.groupBy) as ReportGroupBy | undefined) ?? defaultGroup;

  const raw: Record<string, string> = { groupBy };
  for (const key of [
    "from",
    "to",
    "acudeId",
    "slotId",
    "category",
    "discipline",
    "scenarioId",
    "day",
    "sex",
    "status",
    "teacherId",
    "userId",
    "student",
  ]) {
    const value = first(params[key]);
    if (value) raw[key] = value;
  }
  if (user.role === "manager") raw.teacherId = user.uid;
  const parsed = reportQuerySchema.safeParse(raw);
  const query: ReportQuery = parsed.success ? parsed.data : { groupBy: defaultGroup };

  const [acudes, scenarios, report] = await Promise.all([
    listAcudes(user.role === "manager" ? { teacherId: user.uid } : {}),
    listScenarios(),
    kind === "attendance" ? attendanceReport(query) : enrollmentReport(query),
  ]);

  const teachers = [...new Map(acudes.map((acude) => [acude.teacherId, acude.teacherName])).entries()];
  const categories = [...new Set(acudes.map((acude) => acude.category))].sort((a, b) =>
    CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b], "es"),
  );
  const scenarioIds = new Set(acudes.flatMap((acude) => acude.schedule.map((slot) => slot.scenarioId)));
  const availableScenarios = scenarios.filter((scenario) => scenarioIds.has(scenario.id));
  const disciplines = [...new Set(acudes.map((acude) => acude.discipline))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const slots = acudes.flatMap((acude) =>
    acude.schedule.map((slot) => ({
      id: slot.id,
      label: `${acude.name} · ${WEEKDAY_LABELS[slot.day]} ${slot.startTime}–${slot.endTime}`,
    })),
  );
  const statusOptions =
    kind === "attendance"
      ? Object.entries(ATTENDANCE_STATUS_LABELS)
      : Object.entries(ENROLLMENT_STATUS_LABELS);
  const labels = new Map<string, string>();
  for (const series of report.series) {
    for (const point of series.points) labels.set(point.key, point.label);
  }
  const keys = [...labels.keys()];
  const total = report.summary.total;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={buildHref(params, "enrollments")}
          className={kind === "enrollments" ? buttonClass : secondaryButtonClass}
        >
          Reporte de eventos (inscripciones)
        </Link>
        <Link
          href={buildHref(params, "attendance")}
          className={kind === "attendance" ? buttonClass : secondaryButtonClass}
        >
          Reporte de asistencia por ACUDE
        </Link>
      </div>

      {!parsed.success && (
        <div className="mb-4">
          <Alert kind="error">
            Algunos filtros no eran válidos y se ignoraron: {parsed.error.issues[0]?.message}
          </Alert>
        </div>
      )}

      <form className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input type="hidden" name="kind" value={kind} />
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Desde
          <input
            type="date"
            name="from"
            defaultValue={first(params.from) ?? report.from}
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Hasta
          <input
            type="date"
            name="to"
            defaultValue={first(params.to) ?? report.to}
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Estudiante
          <input
            name="student"
            defaultValue={first(params.student) ?? ""}
            placeholder="Nombre o correo"
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          ACUDE
          <select name="acudeId" defaultValue={first(params.acudeId) ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {acudes.map((acude) => (
              <option key={acude.id} value={acude.id}>
                {acude.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Categoría
          <select name="category" defaultValue={first(params.category) ?? ""} className={selectClass}>
            <option value="">Todas</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Disciplina
          <select
            name="discipline"
            defaultValue={first(params.discipline) ?? ""}
            className={selectClass}
          >
            <option value="">Todas</option>
            {disciplines.map((discipline) => (
              <option key={discipline} value={discipline}>
                {discipline}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Escenario
          <select
            name="scenarioId"
            defaultValue={first(params.scenarioId) ?? ""}
            className={selectClass}
          >
            <option value="">Todos</option>
            {availableScenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Subgrupo / franja
          <select name="slotId" defaultValue={first(params.slotId) ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Día
          <select name="day" defaultValue={first(params.day) ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {WEEKDAYS.map((day) => (
              <option key={day} value={day}>
                {WEEKDAY_LABELS[day]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Sexo
          <select name="sex" defaultValue={first(params.sex) ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {Object.entries(SEX_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          {kind === "attendance" ? "Estado de asistencia" : "Estado de inscripción"}
          <select name="status" defaultValue={first(params.status) ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {isAdmin && (
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Docente
            <select name="teacherId" defaultValue={first(params.teacherId) ?? ""} className={selectClass}>
              <option value="">Todos</option>
              {teachers.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Agrupar por
          <select name="groupBy" defaultValue={groupBy} className={selectClass}>
            {GROUP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {REPORT_GROUP_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className={buttonClass}>Generar reporte</button>
          <Link href={`/manager/reports?kind=${kind}`} className={secondaryButtonClass}>
            Limpiar
          </Link>
        </div>
      </form>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kind === "attendance" ? (
          <>
            <StatCard label="Registros" value={report.summary.total} />
            <StatCard label="Asistencias" value={report.summary.present} tone="blue" />
            <StatCard label="Ausencias" value={report.summary.absent} tone="rose" />
            <StatCard
              label="Asistencia efectiva"
              value={`${report.summary.attendanceRate}%`}
              tone="violet"
            />
          </>
        ) : (
          <>
            <StatCard label="Eventos de inscripción" value={report.summary.total} />
            <StatCard label="Activas" value={report.summary.active} tone="blue" />
            <StatCard label="Canceladas" value={report.summary.canceled} tone="rose" />
            <StatCard
              label="Tasa de cancelación"
              value={`${total > 0 ? Math.round((report.summary.canceled / total) * 100) : 0}%`}
              tone="amber"
            />
          </>
        )}
      </div>

      <section className={`${cardClass} p-5`}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {kind === "attendance" ? "Asistencia por ACUDE" : "Eventos de inscripción"} ·{" "}
              {REPORT_GROUP_LABELS[report.groupBy]}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Rango {report.from || "sin límite"} → {report.to || "hoy"} · {report.summary.total}{" "}
              registros · generado {new Date(report.generatedAt).toLocaleString("es-CO")}
            </p>
          </div>
          <ReportActions report={report} />
        </div>

        {report.summary.total === 0 ? (
          <EmptyState
            title="No hay datos para los filtros"
            description="Amplía el rango de fechas o quita algunos filtros. Recuerda que la asistencia solo existe después de registrarla."
          />
        ) : (
          <>
            <ReportChart report={report} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="py-2">{REPORT_GROUP_LABELS[report.groupBy]}</th>
                    {report.series.map((series) => (
                      <th key={series.name} className="py-2 text-right">
                        {series.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 font-medium text-slate-700">{labels.get(key)}</td>
                      {report.series.map((series) => (
                        <td key={series.name} className="py-2 text-right text-slate-600">
                          {series.points.find((point) => point.key === key)?.value ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge tone="neutral">Datos del servidor</Badge>
        <span>
          Los reportes se calculan con los campos registrados en cada inscripción y en cada registro
          de asistencia. Las inscripciones se consolidan por estudiante y franja para no duplicar
          cancelaciones repetidas.
        </span>
      </div>
    </>
  );
}

export default function ReportsPage(props: PageProps<"/manager/reports">) {
  return (
    <>
      <PageHeader
        eyebrow="Gestión · Analítica"
        title="Reportes de eventos y asistencia"
        description="Filtra por todos los campos del formulario y por fechas. Consulta los resultados en gráficas y exporta a CSV."
        actions={
          <Link href="/manager/attendance" className={secondaryButtonClass}>
            Registrar asistencia
          </Link>
        }
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
      >
        <ReportsContent searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
