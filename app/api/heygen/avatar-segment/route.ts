import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "../../_lib/session";
import {
  createAvatarVideo,
  pollVideoUntilDone,
  listAvatars,
  pickAvatarId,
} from "@/lib/heygen/client";

/**
 * POST /api/heygen/avatar-segment
 * Body: { audioUrl, segmentId, width, height, avatarId?, avatarDescription? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  let body: {
    audioUrl?: string;
    segmentId?: string;
    width?: number;
    height?: number;
    avatarId?: string;
    talkingPhotoId?: string;
    avatarDescription?: string;
    poll?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { audioUrl, segmentId, width = 1080, height = 1920 } = body;
  if (!audioUrl?.trim() || !segmentId) {
    return NextResponse.json(
      { error: "audioUrl y segmentId son obligatorios" },
      { status: 400 }
    );
  }

  try {
    let avatarId = body.avatarId?.trim();
    if (!avatarId && !body.talkingPhotoId) {
      const avatars = await listAvatars().catch(() => []);
      avatarId = pickAvatarId(avatars, body.avatarDescription ?? "");
    }

    const videoId = await createAvatarVideo({
      avatarId,
      talkingPhotoId: body.talkingPhotoId,
      audioUrl: audioUrl.trim(),
      width,
      height,
    });

    if (body.poll === false) {
      return NextResponse.json({
        segmentId,
        videoId,
        status: "processing",
      });
    }

    const result = await pollVideoUntilDone(videoId, {
      intervalMs: 6000,
      maxAttempts: 45,
    });

    if (result.status === "failed") {
      return NextResponse.json(
        {
          error: result.failure_message ?? "HeyGen falló al generar avatar",
          segmentId,
          videoId,
          status: "failed",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      segmentId,
      videoId,
      status: result.status,
      videoUrl: result.video_url ?? undefined,
    });
  } catch (err) {
    console.error("[heygen/avatar-segment]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error HeyGen avatar" },
      { status: 500 }
    );
  }
}
