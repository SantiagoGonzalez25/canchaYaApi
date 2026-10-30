import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { archiveAcudeAction } from "@/app/actions";
import { AcudeForm } from "@/components/acude-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  Alert,
  buttonClass,
  PageHeader,
  secondaryButtonClass,
} from "@/components/ui";
import { getAcude, listScenarioOptions } from "@/lib/data/acudes";
import { ApiError } from "@/lib/errors";
import { ACUDE_STATUS_LABELS, formatDateTime } from "@/lib/labels";
import { listManagers } from "@/lib/services/auth";
import { requirePageAdmin } from "@/lib/web/session";

export const metadata: Metadata = { title: "Editar ACUDE" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function EditAcude({
  params,
  searchParams,
}: {
  params: PageProps<"/manager/acudes/[id]">["params"];
  searchParams: PageProps<"/manager/acudes/[id]">["searchParams"];
}) {
  await requirePageAdmin();
  const { id } = await params;
  const query = await searchParams;
  const acude = await getAcude(id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });
  const [scenarios, managers] = await Promise.all([listScenarioOptions(), listManagers()]);

  return (
    <>
      <PageHeader
        eyebrow={`Gestión · ${ACUDE_STATUS_LABELS[acude.status]}`}
        title={acude.name}
        description={`Creado ${formatDateTime(acude.createdAt)} · Última actualización ${formatDateTime(acude.updatedAt)}`}
        actions={
          <>
            {acude.status === "published" && (
              <Link href={`/acudes/${acude.id}`} className={secondaryButtonClass}>
                Ver en cartelera
              </Link>
            )}
            <Link href={`/manager/attendance?acudeId=${acude.id}`} className={secondaryButtonClass}>
              Asistencia
            </Link>
            <form action={archiveAcudeAction.bind(null, acude.id)}>
              <ConfirmSubmit
                message={`¿Archivar "${acude.name}"? Dejará de aparecer en la cartelera.`}
                className={secondaryButtonClass}
              >
                Archivar
              </ConfirmSubmit>
            </form>
          </>
        }
      />
      {first(query.saved) && (
        <div className="mb-4">
          <Alert kind="ok">Cambios guardados. La cartelera y la ocupación ya reflejan la nueva programación.</Alert>
        </div>
      )}
      <AcudeForm
        initialAcude={acude}
        scenarios={scenarios}
        teachers={managers.map((manager) => ({
          uid: manager.uid,
          name: manager.name,
          email: manager.email,
        }))}
        defaultSemester={acude.semester}
      />
      <div className="mt-6">
        <Link href="/manager/acudes" className={buttonClass}>
          Volver a la lista
        </Link>
      </div>
    </>
  );
}

export default function EditAcudePage(props: PageProps<"/manager/acudes/[id]">) {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
    >
      <EditAcude params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
