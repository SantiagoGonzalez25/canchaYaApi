"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { archiveAcude, createAcude, updateAcude, updateAcudeImage } from "@/lib/data/acudes";
import { saveAttendance } from "@/lib/data/attendance";
import { cancelEnrollment, createEnrollment } from "@/lib/data/enrollments";
import { createScenario, deleteScenario, updateScenario } from "@/lib/data/scenarios";
import { messageOf } from "@/lib/errors";
import {
  acudeSchema,
  createEnrollmentSchema,
  loginSchema,
  managerRegisterSchema,
  registerSchema,
  saveAttendanceSchema,
  scenarioSchema,
  type SaveAttendanceInput,
} from "@/lib/schemas";
import {
  createManager,
  createSessionCookie,
  login,
  register,
} from "@/lib/services/auth";
import { uploadAcudeImage } from "@/lib/services/storage";
import {
  clearSessionCookie,
  requireWebStaff,
  requireWebUser,
  setSessionCookie,
} from "@/lib/web/session";

export interface FormState {
  error?: string;
  ok?: string;
  id?: string;
}

export interface EnrollState {
  error?: string;
  ok?: string;
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Datos inválidos";
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  try {
    const { tokens } = await login(parsed.data.email, parsed.data.password);
    await setSessionCookie(await createSessionCookie(tokens.idToken));
  } catch (err) {
    return { error: messageOf(err) };
  }
  redirect("/dashboard");
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  try {
    const { tokens } = await register(parsed.data);
    await setSessionCookie(await createSessionCookie(tokens.idToken));
  } catch (err) {
    return { error: messageOf(err) };
  }
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

/** Inscripción desde la web: genera el clientRequestId (la app móvil lo genera offline). */
export async function enrollAction(input: {
  acudeId: string;
  slotId: string;
  sex?: string;
}): Promise<EnrollState> {
  const user = await requireWebUser("student");
  const parsed = createEnrollmentSchema.safeParse({
    acudeId: input.acudeId,
    slotId: input.slotId,
    ...(input.sex ? { sex: input.sex } : {}),
    clientRequestId: randomUUID(),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  try {
    const { enrollment, created } = await createEnrollment(user, parsed.data);
    revalidatePath("/acudes");
    revalidatePath(`/acudes/${input.acudeId}`);
    revalidatePath("/calendar");
    revalidatePath("/my-enrollments");
    revalidatePath("/dashboard");
    revalidatePath("/manager/occupation");
    revalidatePath("/manager/acudes");
    return {
      ok: created
        ? `Inscripción confirmada en ${enrollment.acudeName}, ${enrollment.day} ${enrollment.startTime}-${enrollment.endTime}.`
        : "La inscripción ya existía; no se duplicó.",
    };
  } catch (err) {
    return { error: messageOf(err) };
  }
}

export async function cancelEnrollmentAction(id: string): Promise<EnrollState> {
  const user = await requireWebUser();
  try {
    const { enrollment, alreadyCanceled } = await cancelEnrollment(user, id);
    revalidatePath("/my-enrollments");
    revalidatePath("/calendar");
    revalidatePath("/acudes");
    revalidatePath(`/acudes/${enrollment.acudeId}`);
    revalidatePath("/dashboard");
    revalidatePath("/manager/acudes");
    revalidatePath("/manager/occupation");
    revalidatePath("/manager/attendance");
    return {
      ok: alreadyCanceled
        ? "La inscripción ya estaba cancelada."
        : "Inscripción cancelada. El cupo quedó libre de inmediato.",
    };
  } catch (err) {
    return { error: messageOf(err) };
  }
}

/** Envoltorio de formulario para usar `useActionState` en el panel. */
export async function enrollFormAction(
  _prev: EnrollState,
  formData: FormData,
): Promise<EnrollState> {
  return enrollAction({
    acudeId: String(formData.get("acudeId") ?? ""),
    slotId: String(formData.get("slotId") ?? ""),
    ...(formData.get("sex") ? { sex: String(formData.get("sex")) } : {}),
  });
}

export async function cancelFormAction(
  _prev: EnrollState,
  formData: FormData,
): Promise<EnrollState> {
  return cancelEnrollmentAction(String(formData.get("id") ?? ""));
}

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function saveAcudeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireWebUser("admin");
  const id = String(formData.get("id") ?? "");
  const raw = parseJson(formData.get("payload"));
  const parsed = acudeSchema.safeParse(raw);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  let savedId: string;
  try {
    const acude = id
      ? await updateAcude(id, parsed.data, user)
      : await createAcude(parsed.data, user);
    savedId = acude.id;

    const imageFile = formData.get("imageFile");
    if (imageFile instanceof File && imageFile.size > 0) {
      const image = await uploadAcudeImage(acude.id, imageFile);
      await updateAcudeImage(acude.id, image.url, image.path);
    }

    revalidatePath("/manager/acudes");
    revalidatePath("/acudes");
    revalidatePath("/calendar");
    revalidatePath("/manager/occupation");
    revalidatePath("/dashboard");
    revalidatePath(`/acudes/${acude.id}`);
    revalidatePath(`/manager/acudes/${acude.id}`);
  } catch (err) {
    return { error: messageOf(err) };
  }
  redirect(`/manager/acudes/${savedId}?saved=1`);
}

export async function archiveAcudeAction(id: string): Promise<void> {
  await requireWebUser("admin");
  try {
    await archiveAcude(id);
  } catch (err) {
    console.error("[web] no se pudo archivar el ACUDE:", err);
    redirect(`/manager/acudes?error=${encodeURIComponent(messageOf(err))}`);
  }
  revalidatePath("/manager/acudes");
  revalidatePath("/acudes");
  revalidatePath("/calendar");
  revalidatePath("/manager/occupation");
  redirect("/manager/acudes?archived=1");
}

export async function saveScenarioAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireWebUser("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = scenarioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  try {
    if (id) await updateScenario(id, parsed.data);
    else await createScenario(parsed.data);
    revalidatePath("/manager/scenarios");
    revalidatePath("/manager/acudes");
    revalidatePath("/manager/occupation");
    revalidatePath("/calendar");
  } catch (err) {
    return { error: messageOf(err) };
  }
  redirect("/manager/scenarios?saved=1");
}

export async function deleteScenarioAction(id: string): Promise<void> {
  await requireWebUser("admin");
  try {
    await deleteScenario(id);
  } catch (err) {
    console.error("[web] no se pudo eliminar el escenario:", err);
    redirect(`/manager/scenarios?error=${encodeURIComponent(messageOf(err))}`);
  }
  revalidatePath("/manager/scenarios");
  redirect("/manager/scenarios?deleted=1");
}

export async function saveAttendanceAction(
  payload: SaveAttendanceInput,
): Promise<FormState> {
  const user = await requireWebStaff();
  const parsed = saveAttendanceSchema.safeParse(payload);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  try {
    const records = await saveAttendance(parsed.data, user);
    revalidatePath("/manager/attendance");
    revalidatePath("/manager/reports");
    return { ok: `Asistencia guardada para ${records.length} estudiantes.` };
  } catch (err) {
    return { error: messageOf(err) };
  }
}

export async function createManagerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireWebUser("admin");
  const parsed = managerRegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  try {
    const manager = await createManager(parsed.data);
    revalidatePath("/manager/users");
    return {
      ok: `Gestor creado: ${manager.name} (${manager.email}). Ya puede iniciar sesión.`,
      id: manager.uid,
    };
  } catch (err) {
    return { error: messageOf(err) };
  }
}
