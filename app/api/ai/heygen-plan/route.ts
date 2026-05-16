import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "../../_lib/session";
import Anthropic from "@anthropic-ai/sdk";
import { HEYGEN_PLAN_API_JSON_CONTRACT } from "./heygenPlanApiContract";
import { extractCompositionJson } from "../composition/compositionParse";
import type { HeygenVideoPlan, HeygenSegment, HeygenAudioTrack } from "@/types/heygen";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_COMPOSITION_MODEL ?? "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Eres un director creativo de reels virales para redes sociales.
Generas planes de video HeyGen + HyperFrames: avatar hablante + motion graphics dinámicos.
Sincroniza siempre con narración ElevenLabs (audio primero).
${HEYGEN_PLAN_API_JSON_CONTRACT}`;

function assistantText(
  content: Anthropic.Messages.ContentBlock[]
): string {
  return content
    .filter((b) => b.type === "text" && "text" in b)
    .map((b) => (b as { text: string }).text)
    .join("\n")
    .trim();
}

const LAYOUT_MODES = new Set([
  "avatar_full",
  "avatar_pip",
  "graphics_only",
  "avatar_with_overlays",
  "news_ticker",
  "split_screen",
]);

function normalizePlan(raw: Record<string, unknown>): HeygenVideoPlan {
  const segments = (Array.isArray(raw.segments) ? raw.segments : []).map(
    (seg: unknown, i: number) => {
      const s = seg as Record<string, unknown>;
      const mode = String(s.layoutMode ?? "graphics_only");
      return {
        id: String(s.id ?? `seg-${i}`),
        startMs: Number(s.startMs) || 0,
        endMs: Number(s.endMs) || 1000,
        layoutMode: (LAYOUT_MODES.has(mode) ? mode : "graphics_only") as HeygenSegment["layoutMode"],
        avatar:
          s.avatar && typeof s.avatar === "object"
            ? (s.avatar as HeygenSegment["avatar"])
            : undefined,
        layers: Array.isArray(s.layers) ? (s.layers as HeygenSegment["layers"]) : [],
      };
    }
  );

  const audioTracks = (Array.isArray(raw.audioTracks) ? raw.audioTracks : []).map(
    (t: unknown, i: number) => {
      const tr = t as Record<string, unknown>;
      const el = tr._elevenlabs as Record<string, unknown> | undefined;
      return {
        id: String(tr.id ?? `track-${i}`),
        type: (tr.type === "music" || tr.type === "sfx" ? tr.type : "voice") as HeygenAudioTrack["type"],
        volume: Number(tr.volume) || 0.9,
        loop: Boolean(tr.loop),
        startMs: tr.startMs != null ? Number(tr.startMs) : undefined,
        _elevenlabs: {
          type: (el?.type === "music" || el?.type === "sfx" ? el.type : "voice") as HeygenAudioTrack["_elevenlabs"]["type"],
          text: el?.text != null ? String(el.text) : undefined,
          prompt: el?.prompt != null ? String(el.prompt) : undefined,
          durationMs: el?.durationMs != null ? Number(el.durationMs) : undefined,
          durationSeconds:
            el?.durationSeconds != null ? Number(el.durationSeconds) : undefined,
        },
      };
    }
  );

  return {
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : "Video HeyGen",
    fps: typeof raw.fps === "number" ? raw.fps : 30,
    width: typeof raw.width === "number" ? raw.width : 1080,
    height: typeof raw.height === "number" ? raw.height : 1920,
    durationMs: Number(raw.durationMs) || 45000,
    avatarStyle: raw.avatarStyle != null ? String(raw.avatarStyle) : undefined,
    suggestedAvatarId:
      raw.suggestedAvatarId != null ? String(raw.suggestedAvatarId) : undefined,
    audioTracks,
    segments,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const apiKey = ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada." },
      { status: 503 }
    );
  }

  let body: {
    messages?: Array<{ role: string; content: string }>;
    avatarDescription?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => m.role && m.content)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content),
    }));

  if (!messages.some((m) => m.role === "user")) {
    return NextResponse.json(
      { error: "Se necesita al menos un mensaje de usuario" },
      { status: 400 }
    );
  }

  const avatarBlock = body.avatarDescription?.trim()
    ? `\n\nDescripción del avatar (obligatoria):\n${body.avatarDescription.trim()}`
    : "";

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      temperature: 1,
      system: SYSTEM_PROMPT + avatarBlock,
      messages,
    });

    const content = assistantText(response.content);
    const jsonStr = extractCompositionJson(content);
    if (!jsonStr) {
      return NextResponse.json(
        { error: "La respuesta no contiene JSON de plan HeyGen válido.", message: content },
        { status: 422 }
      );
    }

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const plan = normalizePlan(parsed);

    return NextResponse.json({ message: content, plan });
  } catch (err) {
    console.error("[ai/heygen-plan]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al generar plan" },
      { status: 500 }
    );
  }
}
