/**
 * HeyGen API client (v2 avatar video + v3 video status).
 * @see https://developers.heygen.com/docs/create-videos-with-avatars
 */

const HEYGEN_API_BASE = "https://api.heygen.com";

function getApiKey(): string {
  const key = process.env.HEYGEN_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "HEYGEN_API_KEY no configurada. Añádela en .env y reinicia el servidor."
    );
  }
  return key;
}

function headers(): HeadersInit {
  return {
    "X-Api-Key": getApiKey(),
    "Content-Type": "application/json",
  };
}

export interface HeygenAvatar {
  avatar_id: string;
  avatar_name?: string;
  gender?: string;
  preview_image_url?: string;
}

export interface HeygenVideoStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed" | string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  duration?: number | null;
  failure_code?: string | null;
  failure_message?: string | null;
}

/** List public avatars (v2). */
export async function listAvatars(): Promise<HeygenAvatar[]> {
  const res = await fetch(`${HEYGEN_API_BASE}/v2/avatars`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HeyGen listAvatars: ${res.status} ${err.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    data?: { avatars?: HeygenAvatar[] };
  };
  return json.data?.avatars ?? [];
}

export interface CreateAvatarVideoInput {
  avatarId?: string;
  talkingPhotoId?: string;
  audioUrl: string;
  width: number;
  height: number;
}

/**
 * Create avatar video with external audio (ElevenLabs URL) for lip-sync.
 */
export async function createAvatarVideo(
  input: CreateAvatarVideoInput
): Promise<string> {
  const avatarId =
    input.avatarId?.trim() ||
    process.env.HEYGEN_DEFAULT_AVATAR_ID?.trim();

  if (!avatarId && !input.talkingPhotoId) {
    throw new Error(
      "Se requiere avatarId, talkingPhotoId o HEYGEN_DEFAULT_AVATAR_ID"
    );
  }

  const character = input.talkingPhotoId
    ? {
        type: "talking_photo" as const,
        talking_photo_id: input.talkingPhotoId,
      }
    : {
        type: "avatar" as const,
        avatar_id: avatarId!,
        avatar_style: "normal",
      };

  const body = {
    video_inputs: [
      {
        character,
        voice: {
          type: "audio",
          audio_url: input.audioUrl,
        },
      },
    ],
    dimension: {
      width: input.width,
      height: input.height,
    },
  };

  const res = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HeyGen createAvatarVideo: ${res.status} ${err.slice(0, 300)}`);
  }

  const json = (await res.json()) as { data?: { video_id?: string } };
  const videoId = json.data?.video_id;
  if (!videoId) {
    throw new Error("HeyGen no devolvió video_id");
  }
  return videoId;
}

/** Poll v3 video status until completed or failed. */
export async function getVideoStatus(videoId: string): Promise<HeygenVideoStatus> {
  const res = await fetch(`${HEYGEN_API_BASE}/v3/videos/${videoId}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HeyGen getVideoStatus: ${res.status} ${err.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: HeygenVideoStatus };
  if (!json.data) {
    throw new Error("HeyGen respuesta sin data");
  }
  return json.data;
}

export async function pollVideoUntilDone(
  videoId: string,
  options?: { intervalMs?: number; maxAttempts?: number }
): Promise<HeygenVideoStatus> {
  const intervalMs = options?.intervalMs ?? 8000;
  const maxAttempts = options?.maxAttempts ?? 60;

  for (let i = 0; i < maxAttempts; i++) {
    const status = await getVideoStatus(videoId);
    if (status.status === "completed" || status.status === "failed") {
      return status;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`HeyGen video ${videoId}: timeout esperando completar`);
}

/** Pick avatar id from list using description heuristic (fallback: first or env default). */
export function pickAvatarId(
  avatars: HeygenAvatar[],
  description: string
): string | undefined {
  const envDefault = process.env.HEYGEN_DEFAULT_AVATAR_ID?.trim();
  if (envDefault) return envDefault;
  if (avatars.length === 0) return undefined;

  const q = description.toLowerCase();
  const scored = avatars.map((a) => {
    const name = (a.avatar_name ?? "").toLowerCase();
    let score = 0;
    if (q.includes("mujer") || q.includes("woman") || q.includes("female")) {
      if (a.gender === "female" || name.includes("female")) score += 3;
    }
    if (q.includes("hombre") || q.includes("man") || q.includes("male")) {
      if (a.gender === "male" || name.includes("male")) score += 3;
    }
    for (const word of q.split(/\s+/).filter((w) => w.length > 3)) {
      if (name.includes(word)) score += 1;
    }
    return { id: a.avatar_id, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id ?? avatars[0].avatar_id;
}
