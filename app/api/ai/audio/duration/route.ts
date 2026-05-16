import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "../../../_lib/session";
import { probeAudioDurationMs } from "@/lib/audio/probeDuration";

/**
 * GET /api/ai/audio/duration?url=<encoded>
 * Returns { durationMs } for an audio file URL.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const url = request.nextUrl.searchParams.get("url");
  if (!url?.trim()) {
    return NextResponse.json({ error: "Parámetro url requerido" }, { status: 400 });
  }

  try {
    const durationMs = await probeAudioDurationMs(url.trim());
    return NextResponse.json({ durationMs });
  } catch (err) {
    console.error("[audio/duration]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al medir audio" },
      { status: 500 }
    );
  }
}
