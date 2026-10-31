import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CancelEnrollmentButton } from "@/components/cancel-enrollment-button";
import {
  Alert,
  Badge,
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  secondaryButtonClass,
} from "@/components/ui";
import { listAcudes } from "@/lib/data/acudes";
import { listMyEnrollments } from "@/lib/data/enrollments";
import {
  CATEGORY_LABELS,
  CURRENT_SEMESTER,
  formatDate,
  WEEKDAY_LABELS,
} from "@/lib/labels";
import { requirePageUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Mis ACUDES" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function MyEnrollments({
  searchParams,
}: {
  searchParams: PageProps<"/my-enrollments">["searchParams"];
}) {
  const user = await requirePageUser("student");
  const params = await searchParams;
  const requested = first(params.status);
  const status =
    requested === "canceled" || requested === "finished" ? requested : "active";
  const enrolled = first(params.enrolled) === "1";
  const canceled = first(params.canceled) === "1";
  const [all, acudes] = await Promise.all([
    listMyEnrollments(user, {}),
    listAcudes(),
  ]);
  const acudeById = new Map(acudes.map((acude) => [acude.id, acude]));
  const isFinished = (item: (typeof all)[number]) => {
    const acude = acudeById.get(item.acudeId);
    return acude?.status === "archived" || item.semester < CURRENT_SEMESTER.name;
  };
  const activeItems = all.filter((item) => item.status === "active" && !isFinished(item));
  const finishedItems = all.filter((item) => item.status === "active" && isFinished(item));
  const canceledItems = all.filter((item) => item.status === "canceled");
  const enrollments =
    status === "active" ? activeItems : status === "finished" ? finishedItems : canceledItems;

  return (
    <>
      {enrolled && (
        <div className="mb-4">
          <Alert kind="ok">
            Inscripción confirmada. Ya aparece en tus ACUDES y el cupo quedó reservado para ti.
          </Alert>
        </div>
      )}
      {canceled && (
        <div className="mb-4">
          <Alert kind="ok">Inscripción cancelada. El cupo quedó libre de inmediato.</Alert>
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link
          href="/my-enrollments"
          className={status === "active" ? buttonClass : secondaryButtonClass}
        >
          Activas ({activeItems.length})
        </Link>
        <Link
          href="/my-enrollments?status=finished"
          className={status === "finished" ? buttonClass : secondaryButtonClass}
        >
          Finalizadas ({finishedItems.length})
        </Link>
        <Link
          href="/my-enrollments?status=canceled"
          className={status === "canceled" ? buttonClass : secondaryButtonClass}
        >
          Canceladas ({canceledItems.length})
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          title={
            status === "active"
              ? "No tienes inscripciones activas"
              : status === "finished"
                ? "No hay ACUDES finalizados"
                : "No hay inscripciones canceladas"
          }
          description={
            status === "active"
              ? "Explora la cartelera o el calendario semanal y elige un subgrupo con cupo."
              : status === "finished"
                ? "Aquí aparecerán los ACUDES archivados o de semestres anteriores."
                : "Cuando canceles una inscripción quedará registrada aquí en tu historial."
          }
          action={
            <Link href="/acudes" className={buttonClass}>
              Explorar cartelera
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {enrollments.map((enrollment) => (
            <li key={enrollment.id} className={`${cardClass} flex flex-col p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge
                    tone={enrollment.category === "sports" ? "teal" : "violet"}
                  >
                    {CATEGORY_LABELS[enrollment.category]}
                  </Badge>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">
                    <Link href={`/acudes/${enrollment.acudeId}`} className="hover:text-teal-800">
                      {enrollment.acudeName}
                    </Link>
                  </h2>
                </div>
                <Badge
                  tone={
                    enrollment.status === "canceled"
                      ? "rose"
                      : isFinished(enrollment)
                        ? "neutral"
                        : "teal"
                  }
                >
                  {enrollment.status === "canceled"
                    ? "Cancelada"
                    : isFinished(enrollment)
                      ? "Finalizada"
                      : "Activa"}
                </Badge>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Subgrupo
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {WEEKDAY_LABELS[enrollment.day]} {enrollment.startTime}–{enrollment.endTime}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Escenario
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{enrollment.scenarioName}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Docente
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{enrollment.teacherName}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Inscripción
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {formatDate(enrollment.enrolledAt)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <Link
                  href={`/acudes/${enrollment.acudeId}`}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  Ver ficha del ACUDE →
                </Link>
                {enrollment.status === "active" && !isFinished(enrollment) && (
                  <CancelEnrollmentButton id={enrollment.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-busy>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-56 animate-pulse rounded-2xl bg-slate-200/60" />
      ))}
    </div>
  );
}

export default function MyEnrollmentsPage(props: PageProps<"/my-enrollments">) {
  return (
    <>
      <PageHeader
        eyebrow="Estudiante"
        title="Mis ACUDES"
        description="Consulta tus subgrupos, el escenario asignado y cancela cuando lo necesites. El cupo se libera de inmediato."
        actions={
          <Link href="/calendar" className={buttonClass}>
            Abrir calendario
          </Link>
        }
      />
      <Suspense fallback={<Skeleton />}>
        <MyEnrollments searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
