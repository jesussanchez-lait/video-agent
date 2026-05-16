import { adminStorage } from "@/firebase-admin";
import { STORAGE_BUCKET, firebaseStorageUrl } from "@/lib/storage-paths";
import { randomUUID } from "crypto";
import type { HyperframesProject } from "./compilePlan";

export async function uploadHyperframesProject(
  uid: string,
  compositionId: string,
  project: HyperframesProject
): Promise<{ storagePath: string; indexUrl: string }> {
  const bucket = adminStorage.bucket(STORAGE_BUCKET);
  const prefix = `users/${uid}/compositions/${compositionId}/hyperframes`;
  const token = randomUUID();

  for (const [name, content] of Object.entries(project.files)) {
    const path = `${prefix}/${name}`;
    const file = bucket.file(path);
    await file.save(content, {
      contentType: "text/html; charset=utf-8",
      metadata: {
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
  }

  const indexPath = `${prefix}/index.html`;
  return {
    storagePath: prefix,
    indexUrl: firebaseStorageUrl(STORAGE_BUCKET, indexPath, token),
  };
}

export async function getHyperframesSignedUrl(
  storagePath: string
): Promise<string> {
  const bucket = adminStorage.bucket(STORAGE_BUCKET);
  const file = bucket.file(`${storagePath}/index.html`);
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 60 * 60 * 1000,
  });
  return url;
}
