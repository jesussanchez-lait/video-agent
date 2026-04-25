import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "../../_lib/session";
import { adminStorage } from "@/firebase-admin";
import { createAsset } from "@/lib/db";
import { STORAGE_BUCKET, STORAGE_PATHS, firebaseStorageUrl } from "@/lib/storage-paths";
import { randomUUID } from "crypto";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID =
  process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

type AudioType = "voice" | "music" | "sfx";

/**
 * POST /api/ai/audio
 *
 * Genera audio con ElevenLabs, lo sube a Firebase Storage y devuelve la URL.
 *
 * Body:
 *   - type: "voice" | "music" | "sfx"
 *   - text?:       texto a narrar (voice)
 *   - prompt?:     descripción del sonido/música (music | sfx)
 *   - durationMs?: duración en ms para música (default: 10000)
 *   - durationSeconds?: duración en segundos para sfx (default: auto)
 *   - voiceId?:    ID de voz ElevenLabs (voice, opcional)
 *   - volume?:     volumen sugerido 0-1 (solo metadato, no afecta la generación)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const apiKey = ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ELEVENLABS_API_KEY no configurada. Añádela en .env y reinicia el servidor.",
      },
      { status: 503 }
    );
  }

  let body: {
    type?: AudioType;
    text?: string;
    prompt?: string;
    durationMs?: number;
    durationSeconds?: number;
    voiceId?: string;
    compositionId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { type, text, prompt, durationMs, durationSeconds, voiceId, compositionId } = body;

  if (!type || !["voice", "music", "sfx"].includes(type)) {
    return NextResponse.json(
      { error: 'type debe ser "voice", "music" o "sfx"' },
      { status: 400 }
    );
  }

  try {
    let audioBuffer: Buffer;
    let filename: string;

    // ── 1. Llamar a ElevenLabs según el tipo ────────────────────────────────
    if (type === "voice") {
      if (!text?.trim()) {
        return NextResponse.json(
          { error: "Se requiere text para type=voice" },
          { status: 400 }
        );
      }

      const vid = voiceId ?? DEFAULT_VOICE_ID;
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${vid}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: text.trim(),
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.62,
              similarity_boost: 0.82,
              style: 0.35,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("[ai/audio] ElevenLabs TTS error:", res.status, err);
        return NextResponse.json(
          { error: `ElevenLabs TTS error ${res.status}: ${err.slice(0, 200)}` },
          { status: 502 }
        );
      }

      audioBuffer = Buffer.from(await res.arrayBuffer());
      filename = `voice-${randomUUID()}.mp3`;
    } else if (type === "music") {
      if (!prompt?.trim()) {
        return NextResponse.json(
          { error: "Se requiere prompt para type=music" },
          { status: 400 }
        );
      }

      const musicLengthMs = durationMs ?? 10000;
      // Always enforce instrumental — triple constraint so ElevenLabs never adds vocals.
      const instrumentalPrompt = `${prompt.trim()}, purely instrumental, absolutely no vocals, no singing, no voice, no lyrics, background music only`;
      const res = await fetch(
        "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: instrumentalPrompt,
            music_length_ms: Math.min(Math.max(musicLengthMs, 3000), 300000),
            model_id: "music_v1",
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("[ai/audio] ElevenLabs Music error:", res.status, err);
        return NextResponse.json(
          {
            error: `ElevenLabs Music error ${res.status}: ${err.slice(0, 200)}`,
          },
          { status: 502 }
        );
      }

      audioBuffer = Buffer.from(await res.arrayBuffer());
      filename = `music-${randomUUID()}.mp3`;
    } else {
      // sfx
      if (!prompt?.trim()) {
        return NextResponse.json(
          { error: "Se requiere prompt para type=sfx" },
          { status: 400 }
        );
      }

      const sfxBody: Record<string, unknown> = {
        text: prompt.trim(),
        model_id: "eleven_text_to_sound_v2",
        prompt_influence: 0.3,
      };
      if (durationSeconds) {
        sfxBody.duration_seconds = Math.min(Math.max(durationSeconds, 0.5), 30);
      }

      const res = await fetch(
        "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sfxBody),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("[ai/audio] ElevenLabs SFX error:", res.status, err);
        return NextResponse.json(
          { error: `ElevenLabs SFX error ${res.status}: ${err.slice(0, 200)}` },
          { status: 502 }
        );
      }

      audioBuffer = Buffer.from(await res.arrayBuffer());
      filename = `sfx-${randomUUID()}.mp3`;
    }

    // ── 2. Subir a Firebase Storage ─────────────────────────────────────────
    const storagePath = compositionId
      ? STORAGE_PATHS.compositionAudio(auth.uid, compositionId, filename)
      : STORAGE_PATHS.userAudio(auth.uid, filename);
    const bucket = adminStorage.bucket(STORAGE_BUCKET);
    const file = bucket.file(storagePath);

    // El download token se guarda como metadata custom → URL permanente
    const downloadToken = randomUUID();
    console.log(`[ai/audio] Saving ${type} (${audioBuffer.length} bytes) to gs://${STORAGE_BUCKET}/${storagePath}`);
    try {
      await file.save(audioBuffer, {
        metadata: { contentType: "audio/mpeg" },
      });
      // setMetadata must be called separately — file.save() does not reliably
      // persist nested custom metadata (firebaseStorageDownloadTokens) in GCS.
      await file.setMetadata({
        contentType: "audio/mpeg",
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      });
      console.log(`[ai/audio] Save OK → ${storagePath}`);
    } catch (saveErr) {
      console.error("[ai/audio] file.save() FAILED:", saveErr);
      throw saveErr;
    }

    const downloadUrl = firebaseStorageUrl(STORAGE_BUCKET, storagePath, downloadToken);

    // ── 3. Registrar en Firestore ────────────────────────────────────────────
    const label =
      type === "voice" ? text!.slice(0, 60) : prompt!.slice(0, 60);
    const asset = await createAsset(auth.uid, {
      name: `[${type}] ${label}`,
      type: "audio",
      mimeType: "audio/mpeg",
      sizeBytes: audioBuffer.length,
      storagePath,
      downloadUrl,
    });

    return NextResponse.json({ downloadUrl, asset }, { status: 201 });
  } catch (err) {
    console.error("[ai/audio]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Error al generar audio",
      },
      { status: 500 }
    );
  }
}
