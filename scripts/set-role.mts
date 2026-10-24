/**
 * Asigna el rol de un usuario existente.
 *   pnpm set-role -- correo@dominio.com manager
 *   pnpm set-role -- correo@dominio.com admin
 * El usuario debe cerrar sesión y volver a entrar para ver el cambio.
 */
import type { Role } from "../lib/types";
import { initAdmin } from "./firebase.mts";

const [email, roleArg] = process.argv.slice(2).filter((arg) => arg !== "--");
const roles: Role[] = ["student", "manager", "admin"];

if (!email || !roles.includes(roleArg as Role)) {
  console.error("Uso: pnpm set-role -- <correo> <student|manager|admin>");
  process.exit(1);
}
const role = roleArg as Role;
const { auth, db } = initAdmin();
const user = await auth.getUserByEmail(email);
const current = (user.customClaims ?? {}) as { sex?: string };
await auth.setCustomUserClaims(user.uid, { ...current, role });
await auth.revokeRefreshTokens(user.uid);
await db.collection("users").doc(user.uid).set({ role, updatedAt: new Date().toISOString() }, { merge: true });
console.log(`${email} ahora es ${role}. Debe volver a iniciar sesión.`);
