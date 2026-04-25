import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "../../_lib/session";
import { adminStorage } from "@/firebase-admin";
import { createAsset } from "@/lib/db";
import {
  STORAGE_BUCKET,
  STORAGE_PATHS,
  firebaseStorageUrl,
  mimeToAssetType,
} from "@/lib/storage-paths";
import { randomUUID } from "crypto";
import path from "path";

function resolveAssetType(mimeType: string, filename: string): "image" | "video" | "audio" | "font" {
  try {
    return mimeToAssetType(mimeType);
  } catch {
    const ext = path.extname(filename).toLowerCase();
    if ([".woff2", ".woff", ".ttf", ".otf"].includes(ext)) return "font";
    throw new Error(`Tipo MIME no soportado: ${mimeType || "(vacío)"}`);
  }
}

/**
 * POST /api/assets/upload-direct
 *
 * Subida directa por backend con Firebase Admin (sin URL firmada).
 * multipart/form-data:
 *   - file: File (requerido)
 *   - description: string (opcional)
 *   - sessionId: string (opcional)
 */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta archivo (campo `file`)" }, { status: 400 });
    }

    const filename = file.name || `asset-${Date.now()}`;
    const mimeType = file.type || "application/octet-stream";
    const sizeBytes = file.size;
    const description = String(form.get("description") ?? "").trim() || undefined;
    const sessionId = String(form.get("sessionId") ?? "").trim() || undefined;

    if (sizeBytes <= 0) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
    }

    let assetType: ReturnType<typeof resolveAssetType>;
    try {
      assetType = resolveAssetType(mimeType, filename);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Tipo de archivo no soportado" },
        { status: 400 }
      );
    }

    const ext = path.extname(filename);
    const uniqueName = `${randomUUID()}${ext}`;
    const storagePath = sessionId
      ? STORAGE_PATHS.sessionAsset(auth.uid, sessionId, assetType, uniqueName)
      : STORAGE_PATHS.userAsset(auth.uid, assetType, uniqueName);

    const token = randomUUID();
    const downloadUrl = firebaseStorageUrl(STORAGE_BUCKET, storagePath, token);
    const buffer = Buffer.from(await file.arrayBuffer());

    const gcsFile = adminStorage.bucket(STORAGE_BUCKET).file(storagePath);
    await gcsFile.save(buffer, {
      resumable: false,
      metadata: { contentType: mimeType },
    });
    // Igual que en /api/ai/audio: setMetadata separado para asegurar token persistido.
    await gcsFile.setMetadata({
      contentType: mimeType,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    });

    const asset = await createAsset(auth.uid, {
      name: filename,
      type: assetType,
      mimeType,
      sizeBytes,
      storagePath,
      downloadUrl,
      description,
      sessionId,
    });

    return NextResponse.json({ ok: true, asset }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/assets/upload-direct]", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "No se pudo subir el asset con Firebase Admin",
        details: process.env.NODE_ENV !== "production" ? details.slice(0, 500) : undefined,
      },
      { status: 500 }
    );
  }
}
