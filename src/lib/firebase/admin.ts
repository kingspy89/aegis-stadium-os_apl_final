import { cert, getApps, getApp, initializeApp, applicationDefault, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cachedApp: App | null = null;

function parseServiceAccountJson(raw: string) {
  const parsed = JSON.parse(raw) as ServiceAccount & { private_key?: string };

  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  return parsed;
}

export function getFirebaseApp() {
  if (cachedApp) {
    return cachedApp;
  }

  if (getApps().length > 0) {
    cachedApp = getApp();
    return cachedApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

  try {
    if (serviceAccountJson) {
      const serviceAccount = parseServiceAccountJson(serviceAccountJson);
      cachedApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId || projectId,
      });
      return cachedApp;
    }

    cachedApp = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    return cachedApp;
  } catch (error) {
    console.warn("[Firebase] Admin SDK not configured:", error instanceof Error ? error.message : error);
    cachedApp = null;
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}