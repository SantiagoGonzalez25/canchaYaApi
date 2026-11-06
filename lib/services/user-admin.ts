import "server-only";
import { listAcudes } from "../data/acudes";
import { cancelActiveEnrollmentsForUser } from "../data/enrollments";
import { ApiError } from "../errors";
import type { AuthUser, Role, UserProfile, UserStatus } from "../types";
import { getProfile, updateUserAccess } from "./auth";

/**
 * Cambia rol/estado con las reglas de seguridad del panel:
 * - No permite que el admin se quite su propio rol o se deshabilite.
 * - Un profesor con ACUDES activos no puede ser baneado/desactivado ni
 *   degradado hasta reasignar o archivar sus ACUDES.
 * - Banear a un estudiante cancela sus inscripciones activas y libera cupos.
 */
export async function changeUserAccess(
  actor: AuthUser,
  uid: string,
  input: { role?: Role; status?: UserStatus },
): Promise<UserProfile> {
  const target = await getProfile(uid);
  const nextRole = input.role ?? target.role;
  const nextStatus = input.status ?? target.status;

  if (uid === actor.uid && (nextRole !== "admin" || nextStatus !== "active")) {
    throw new ApiError(
      409,
      "INVALID_STATE",
      "No puedes quitarte el rol de administrador ni deshabilitar tu propia cuenta",
    );
  }

  const reassignTeacher =
    target.role === "manager" &&
    (nextRole !== "manager" || nextStatus === "banned" || nextStatus === "inactive");
  if (reassignTeacher) {
    const assigned = (await listAcudes({ teacherId: uid })).filter(
      (acude) => acude.status !== "archived",
    );
    if (assigned.length > 0) {
      throw new ApiError(
        409,
        "INVALID_STATE",
        "No puedes cambiar el rol ni banear/desactivar a este profesor mientras tenga ACUDES asignados. Reasígnalos o archívalos primero.",
      );
    }
  }

  if (target.role === "student" && nextStatus === "banned") {
    await cancelActiveEnrollmentsForUser(actor, uid);
  }

  return updateUserAccess(uid, input);
}
