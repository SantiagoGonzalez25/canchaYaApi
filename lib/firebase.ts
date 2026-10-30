import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getEnv } from "./env";

function adminApp(): App {
  if (getApps().length > 0) return getApp();
  const env = getEnv();
  return initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    }),
  });
}

export const adminAuth = () => getAuth(adminApp());
export const db = () => getFirestore(adminApp());

export const storageBucket = () => {
  const env = getEnv();
  const name =
    env.FIREBASE_STORAGE_BUCKET ?? `${env.FIREBASE_PROJECT_ID}.firebasestorage.app`;
  return getStorage(adminApp()).bucket(name);
};
