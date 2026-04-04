import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import path from "path";
import fs from "fs";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "lait-video-editor";
const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
  "lait-video-editor.firebasestorage.app";

/** Mensaje de ayuda cuando las credenciales fallan (reloj o clave revocada) */
export const FIREBASE_CREDENTIAL_HELP =
  "Si ves 'Invalid JWT Signature' o 'UNAUTHENTICATED': (1) Sincroniza la hora del sistema. (2) Regenera la clave en Firebase Console → Configuración → Cuentas de servicio → Generar nueva clave privada.";

function getCredential() {
  const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // 1. GOOGLE_APPLICATION_CREDENTIALS como JSON inline (App Hosting / Secret Manager)
  if (adc?.trimStart().startsWith("{")) {
    try {
      const parsed = JSON.parse(adc);
      return cert(parsed);
    } catch {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS contiene JSON inválido.");
    }
  }

  // 2. GOOGLE_APPLICATION_CREDENTIALS como ruta a un archivo (desarrollo local)
  const adcPath = adc ?? "lait-video-editor-firebase-adminsdk-fbsvc-423ef0596b.json";
  const resolvedPath = path.isAbsolute(adcPath)
    ? adcPath
    : path.resolve(process.cwd(), adcPath);
  if (fs.existsSync(resolvedPath)) {
    return cert(resolvedPath);
  }
  if (adc) {
    throw new Error(
      `GOOGLE_APPLICATION_CREDENTIALS apunta a un archivo inexistente: ${resolvedPath}`
    );
  }

  // 3. Archivos *-adminsdk-*.json en la raíz del proyecto (fallback local)
  const candidates = [
    "lait-video-editor-firebase-adminsdk-fbsvc-423ef0596b.json",
    "lait-video-editor-firebase-adminsdk-fbsvc-feeabf3dcd.json",
  ];
  for (const name of candidates) {
    const p = path.join(process.cwd(), name);
    if (fs.existsSync(p)) {
      try {
        return cert(p);
      } catch {
        continue;
      }
    }
  }

  // 4. Variables de entorno individuales (FIREBASE_PRIVATE_KEY, etc.)
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "Configura Firebase Admin: GOOGLE_APPLICATION_CREDENTIALS (ruta o JSON), el archivo JSON del service account, o FIREBASE_PRIVATE_KEY en .env"
    );
  }
  const privateKey = raw.replace(/\\n/g, "\n").trim();
  return cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey,
  });
}

export const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: getCredential(),
        projectId: PROJECT_ID,
        storageBucket: STORAGE_BUCKET,
      })
    : getApps()[0];

export const adminAuth = getAuth(adminApp);

/** Bucket principal: gs://lait-video-editor.firebasestorage.app */
export const adminStorage = getStorage(adminApp);
