import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "../_lib/session";
import {
  listCompositions,
  createComposition,
  calcTotalDuration,
  linkAssetsToComposition,
} from "@/lib/db";
import type { Sequence, CompositionStatus, CompositionHeygenMeta, RenderEngine } from "@/types";

const STUDIO_ORIGIN =
  process.env.NEXT_PUBLIC_STUDIO_URL ?? "http://localhost:3001";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", STUDIO_ORIGIN);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

// OPTIONS — CORS preflight para Remotion Studio
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return withCors(res);
}

// GET /api/compositions — Lista las composiciones del usuario autenticado
export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return withCors(auth.error);

  try {
    const compositions = await listCompositions(auth.uid);
    return withCors(NextResponse.json({ compositions }));
  } catch (err) {
    console.error("[GET /api/compositions]", err);
    return withCors(
      NextResponse.json(
        { error: "Error al obtener composiciones" },
        { status: 500 }
      )
    );
  }
}

// POST /api/compositions — Crea una nueva composición
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  let body: {
    title?: string;
    description?: string;
    fps?: number;
    width?: number;
    height?: number;
    sequences?: Sequence[];
    status?: CompositionStatus;
    thumbnailUrl?: string;
    sessionId?: string;
    compositionId?: string;
    renderEngine?: RenderEngine;
    heygen?: CompositionHeygenMeta;
    totalDurationInFrames?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { title, sequences = [], fps = 30, width = 1920, height = 1080, compositionId } = body;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json(
      { error: "El campo 'title' es obligatorio" },
      { status: 400 }
    );
  }

  try {
    const data: Parameters<typeof createComposition>[1] = {
      title: title.trim(),
      status: body.status ?? "draft",
      fps,
      width,
      height,
      sequences,
      totalDurationInFrames:
        body.totalDurationInFrames ??
        (body.heygen?.plan?.durationMs
          ? Math.ceil((body.heygen.plan.durationMs / 1000) * fps)
          : calcTotalDuration(sequences)),
    };
    if (body.description != null) data.description = body.description;
    if (body.thumbnailUrl != null) data.thumbnailUrl = body.thumbnailUrl;
    if (body.renderEngine != null) data.renderEngine = body.renderEngine;
    if (body.heygen != null) data.heygen = body.heygen;

    const composition = await createComposition(auth.uid, data, compositionId);

    // Vincular assets de sesión a la composición recién creada
    if (body.sessionId) {
      await linkAssetsToComposition(auth.uid, body.sessionId, composition.id).catch((err) => {
        console.warn("[POST /api/compositions] Error vinculando assets:", err);
      });
    }

    return NextResponse.json({ composition }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/compositions]", err);
    return NextResponse.json(
      { error: "Error al crear composición" },
      { status: 500 }
    );
  }
}
