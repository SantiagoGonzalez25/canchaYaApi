import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AcudeCard } from "@/components/acude-card";
import {
  buttonClass,
  EmptyState,
  inputClass,
  PageHeader,
  secondaryButtonClass,
  selectClass,
} from "@/components/ui";
import { listLiveAcudes } from "@/lib/data/acudes";
import { CATEGORY_LABELS, WEEKDAYS, WEEKDAY_LABELS } from "@/lib/labels";
import { requireWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Cartelera digital" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function LiveList({ searchParams }: { searchParams: PageProps<"/acudes">["searchParams"] }) {
  const user = await requireWebUser();
  const params = await searchParams;
  const q = first(params.q)?.trim().slice(0, 100) || undefined;
  const category = first(params.category) as keyof typeof CATEGORY_LABELS | undefined;
  const day = first(params.day) as (typeof WEEKDAYS)[number] | undefined;
  const acudes = await listLiveAcudes({ q, category, day });

  return (
    <>
      <form className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar ACUDE, disciplina o docente..."
          className={inputClass}
          aria-label="Buscar"
        />
        <select name="category" defaultValue={category ?? ""} className={selectClass} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select name="day" defaultValue={day ?? ""} className={selectClass} aria-label="Día">
          <option value="">Todos los días</option>
          {WEEKDAYS.map((value) => (
            <option key={value} value={value}>
              {WEEKDAY_LABELS[value]}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button className={buttonClass}>Filtrar</button>
          <Link href="/acudes" className={secondaryButtonClass}>
            Limpiar
          </Link>
        </div>
      </form>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-bold text-slate-900">{acudes.length}</span> ACUDES publicados
        </p>
        {user.role !== "student" && (
          <Link href="/manager/acudes" className={secondaryButtonClass}>
            Gestionar ACUDES
          </Link>
        )}
      </div>

      {acudes.length === 0 ? (
        <EmptyState
          title="No encontramos ACUDES"
          description="Prueba con otra categoría, otro día o limpia los filtros."
          action={
            <Link href="/acudes" className={buttonClass}>
              Ver toda la cartelera
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {acudes.map((acude) => (
            <li key={acude.id}>
              <AcudeCard acude={acude} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
      ))}
    </div>
  );
}

export default function AcudesPage(props: PageProps<"/acudes">) {
  return (
    <>
      <PageHeader
        eyebrow="Cartelera digital"
        title="Oferta formativa y deportiva"
        description="Horarios actualizados, subgrupos, cupos en tiempo real y el escenario de cada sesión. Sin reservas: te inscribes al ACUDE."
        actions={
          <Link href="/calendar" className={buttonClass}>
            Ver calendario semanal
          </Link>
        }
      />
      <Suspense fallback={<Skeleton />}>
        <LiveList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
