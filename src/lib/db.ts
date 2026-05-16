/**
 * server-only — importar solo desde rutas de API o Server Components.
 *
 * Colecciones Firestore:
 *   users/{uid}                              → perfil del usuario
 *   users/{uid}/compositions/{compositionId} → composiciones de video
 *   users/{uid}/assets/{assetId}             → assets multimedia
 */
import "server-only";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminApp } from "@/firebase-admin";
import type { CompositionHeygenMeta, RenderEngine } from "@/types/heygen";
import type {
  CompositionDTO,
  CompositionStatus,
  Sequence,
  AssetDTO,
  AssetType,
  UserPlan,
} from "@/types";
import { calcTotalDuration } from "@/utils/duration";

const db = getFirestore(adminApp);

// ─────────────────────────────────────────────────────────────────────────────
// Nombres de colecciones
// ─────────────────────────────────────────────────────────────────────────────

export const COLLECTIONS = {
  /** `users/{uid}` */
  user: (uid: string) => `users/${uid}`,
  /** `users/{uid}/compositions` */
  compositions: (uid: string) => `users/${uid}/compositions`,
  /** `users/{uid}/compositions/{compositionId}` */
  composition: (uid: string, compositionId: string) =>
    `users/${uid}/compositions/${compositionId}`,
  /** `users/{uid}/assets` */
  assets: (uid: string) => `users/${uid}/assets`,
  /** `users/{uid}/assets/{assetId}` */
  asset: (uid: string, assetId: string) => `users/${uid}/assets/${assetId}`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces de documentos Firestore (server-only)
// ─────────────────────────────────────────────────────────────────────────────

export interface CompositionDoc {
  ownerId: string;
  title: string;
  description?: string;
  status: CompositionStatus;
  thumbnailUrl?: string;
  fps: number;
  width: number;
  height: number;
  sequences: Sequence[];
  totalDurationInFrames: number;
  renderEngine?: RenderEngine;
  heygen?: CompositionHeygenMeta;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AssetDoc {
  ownerId: string;
  name: string;
  type: AssetType;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
  description?: string;
  sessionId?: string;
  compositionId?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  /**
   * Tras la subida PUT, /api/assets/[id]/finalize-upload fija este token en metadata GCS.
   * No se expone en AssetDTO.
   */
  pendingDownloadToken?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserDoc {
  email: string;
  displayName?: string;
  photoUrl?: string;
  plan: UserPlan;
  compositionsCount: number;
  storageUsedBytes: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculadora de duración total para TransitionSeries
// ─────────────────────────────────────────────────────────────────────────────

export { calcTotalDuration } from "@/utils/duration";

// ─────────────────────────────────────────────────────────────────────────────
// Serializadores: doc de Firestore → DTO
// ─────────────────────────────────────────────────────────────────────────────

export function compositionToDTO(id: string, doc: CompositionDoc): CompositionDTO {
  return {
    id,
    ownerId: doc.ownerId,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    thumbnailUrl: doc.thumbnailUrl,
    fps: doc.fps,
    width: doc.width,
    height: doc.height,
    sequences: doc.sequences,
    totalDurationInFrames: doc.totalDurationInFrames,
    renderEngine: doc.renderEngine ?? "remotion",
    heygen: doc.heygen,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

export function assetToDTO(id: string, doc: AssetDoc): AssetDTO {
  return {
    id,
    ownerId: doc.ownerId,
    name: doc.name,
    type: doc.type,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    storagePath: doc.storagePath,
    downloadUrl: doc.downloadUrl,
    description: doc.description,
    sessionId: doc.sessionId,
    compositionId: doc.compositionId,
    width: doc.width,
    height: doc.height,
    durationSeconds: doc.durationSeconds,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Referencias a colecciones
// ─────────────────────────────────────────────────────────────────────────────

export const compositionsRef = (uid: string) =>
  db.collection(COLLECTIONS.compositions(uid));

export const compositionRef = (uid: string, compositionId: string) =>
  db.doc(COLLECTIONS.composition(uid, compositionId));

export const assetsRef = (uid: string) =>
  db.collection(COLLECTIONS.assets(uid));

export const assetRef = (uid: string, assetId: string) =>
  db.doc(COLLECTIONS.asset(uid, assetId));

export const userRef = (uid: string) => db.doc(COLLECTIONS.user(uid));

// ─────────────────────────────────────────────────────────────────────────────
// CRUD — Compositions
// ─────────────────────────────────────────────────────────────────────────────

export async function listCompositions(uid: string): Promise<CompositionDTO[]> {
  const snap = await compositionsRef(uid)
    .orderBy("updatedAt", "desc")
    .get();
  return snap.docs.map((doc) =>
    compositionToDTO(doc.id, doc.data() as CompositionDoc)
  );
}

export async function getComposition(
  uid: string,
  compositionId: string
): Promise<CompositionDTO | null> {
  const snap = await compositionRef(uid, compositionId).get();
  if (!snap.exists) return null;
  return compositionToDTO(snap.id, snap.data() as CompositionDoc);
}

export async function createComposition(
  uid: string,
  input: Omit<CompositionDoc, "ownerId" | "createdAt" | "updatedAt">,
  id?: string
): Promise<CompositionDTO> {
  const now = FieldValue.serverTimestamp();
  const docData = { ...input, ownerId: uid, createdAt: now, updatedAt: now };
  let ref: ReturnType<typeof compositionRef>;
  if (id) {
    ref = compositionRef(uid, id);
    await ref.set(docData);
  } else {
    const newRef = await compositionsRef(uid).add(docData);
    ref = compositionRef(uid, newRef.id);
  }
  const snap = await ref.get();
  return compositionToDTO(snap.id, snap.data() as CompositionDoc);
}

export async function updateComposition(
  uid: string,
  compositionId: string,
  patch: Partial<Omit<CompositionDoc, "ownerId" | "createdAt">>
): Promise<CompositionDTO | null> {
  const ref = compositionRef(uid, compositionId);
  if (!(await ref.get()).exists) return null;
  await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
  const updated = await ref.get();
  return compositionToDTO(updated.id, updated.data() as CompositionDoc);
}

export async function deleteComposition(
  uid: string,
  compositionId: string
): Promise<boolean> {
  const ref = compositionRef(uid, compositionId);
  if (!(await ref.get()).exists) return false;
  await ref.delete();
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD — Assets
// ─────────────────────────────────────────────────────────────────────────────

export async function listAssets(uid: string): Promise<AssetDTO[]> {
  const snap = await assetsRef(uid)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => assetToDTO(doc.id, doc.data() as AssetDoc));
}

export async function listAssetsBySession(uid: string, sessionId: string): Promise<AssetDTO[]> {
  const snap = await assetsRef(uid)
    .where("sessionId", "==", sessionId)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => assetToDTO(doc.id, doc.data() as AssetDoc));
}

/** Vincula todos los assets de una sesión a una composición recién creada */
export async function linkAssetsToComposition(
  uid: string,
  sessionId: string,
  compositionId: string
): Promise<void> {
  const snap = await assetsRef(uid).where("sessionId", "==", sessionId).get();
  if (snap.empty) return;
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { compositionId, updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
}

/** Firestore no acepta valores `undefined` en .add() / .set() sin ignoreUndefinedProperties. */
function dropUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

export async function createAsset(
  uid: string,
  input: Omit<AssetDoc, "ownerId" | "createdAt" | "updatedAt">
): Promise<AssetDTO> {
  const now = FieldValue.serverTimestamp();
  const docData = dropUndefined({
    ...input,
    ownerId: uid,
    createdAt: now,
    updatedAt: now,
  } as Record<string, unknown>) as DocumentData;
  const ref = await assetsRef(uid).add(docData);
  const snap = await ref.get();
  return assetToDTO(snap.id, snap.data() as AssetDoc);
}

export async function updateAsset(
  uid: string,
  assetId: string,
  patch: Partial<Pick<AssetDoc, "name" | "description">>
): Promise<AssetDTO | null> {
  const ref = assetRef(uid, assetId);
  if (!(await ref.get()).exists) return null;
  await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
  const updated = await ref.get();
  return assetToDTO(updated.id, updated.data() as AssetDoc);
}

export async function deleteAsset(uid: string, assetId: string): Promise<boolean> {
  const ref = assetRef(uid, assetId);
  if (!(await ref.get()).exists) return false;
  await ref.delete();
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// User profile
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertUserProfile(
  uid: string,
  data: { email: string; displayName?: string; photoUrl?: string }
): Promise<void> {
  const ref = userRef(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      ...data,
      plan: "free",
      compositionsCount: 0,
      storageUsedBytes: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
  }
}
