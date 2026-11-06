import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { updateUserAccessAction } from "@/app/actions";
import {
  Alert,
  Badge,
  PageHeader,
  buttonClass,
  cardClass,
  emptyBoxClass,
  secondaryButtonClass,
  selectClass,
} from "@/components/ui";
import { listEnrollments } from "@/lib/data/enrollments";
import { ROLE_LABELS, formatDate } from "@/lib/labels";
import { listUsers } from "@/lib/services/auth";
import { requirePageUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Usuarios y roles" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  banned: "Baneado",
};

const STATUS_TONE: Record<string, "teal" | "amber" | "rose"> = {
  active: "teal",
  inactive: "amber",
  banned: "rose",
};

async function UsersContent({
  searchParams,
}: {
  searchParams: PageProps<"/manager/users-all">["searchParams"];
}) {
  await requirePageUser("admin");
  const params = await searchParams;
  const users = await listUsers();
  const selectedId = first(params.user);
  const selectedUser = selectedId ? users.find((item) => item.uid === selectedId) : null;
  const enrollments = selectedId ? await listEnrollments({ userId: selectedId }) : [];
  const error = first(params.error);
  const saved = first(params.saved);

  return (
    <>
      {saved && <Alert kind="ok">Cambios guardados correctamente.</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      <div className="mb-4">
        <Alert kind="info">
          Banear a un estudiante cancela sus inscripciones activas y libera cupos. Un profesor con
          ACUDES asignados no puede ser baneado, desactivado ni degradado hasta reasignar o archivar
          sus ACUDES.
        </Alert>
      </div>

      {selectedUser && (
        <section className={`${cardClass} mb-5 p-5`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Inscripciones de {selectedUser.name}
              </h2>
              <p className="text-xs text-slate-500">{selectedUser.email}</p>
            </div>
            <Link href="/manager/users-all" className={secondaryButtonClass}>
              Cerrar historial
            </Link>
          </div>
          {enrollments.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Este usuario no tiene inscripciones.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {enrollments.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.acudeName}</p>
                    <p className="text-xs text-slate-500">
                      {item.day} {item.startTime}–{item.endTime} · {item.scenarioName} ·{" "}
                      {formatDate(item.enrolledAt)}
                    </p>
                  </div>
                  <Badge tone={item.status === "active" ? "teal" : "neutral"}>
                    {item.status === "active" ? "Activa" : "Cancelada"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Usuarios registrados</h2>
          <Badge tone="neutral">{users.length}</Badge>
        </div>
        <ul className="divide-y divide-slate-100">
          {users.map((user) => {
            const status = user.status ?? "active";
            return (
              <li key={user.uid} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {user.phone || "Sin teléfono"} · UID {user.uid}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form action={updateUserAccessAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={user.uid} />
                    <select name="role" defaultValue={user.role} className={selectClass} aria-label="Rol">
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <select
                      name="status"
                      defaultValue={status}
                      className={selectClass}
                      aria-label="Estado"
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button className={buttonClass}>Guardar</button>
                  </form>
                  <Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_LABELS[status]}</Badge>
                  <Link
                    href={`/manager/users-all?user=${encodeURIComponent(user.uid)}`}
                    className={secondaryButtonClass}
                  >
                    Inscripciones
                  </Link>
                </div>
              </li>
            );
          })}
          {users.length === 0 && (
            <li className={`${emptyBoxClass} m-5`}>No hay usuarios registrados.</li>
          )}
        </ul>
      </div>
    </>
  );
}

export default function UsersAllPage({
  searchParams,
}: {
  searchParams: PageProps<"/manager/users-all">["searchParams"];
}) {
  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios y roles"
        description="Consulta todos los usuarios, cambia su rol o estado y revisa su historial de inscripciones."
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
      >
        <UsersContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
