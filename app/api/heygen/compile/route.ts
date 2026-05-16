import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "../../_lib/session";
import { getComposition, updateComposition } from "@/lib/db";
import { compileHeygenPlanToHyperframes } from "@/lib/hyperframes/compilePlan";
import { uploadHyperframesProject } from "@/lib/hyperframes/uploadProject";
import type { HeygenVideoPlan } from "@/types/heygen";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  let body: { compositionId?: string; plan?: HeygenVideoPlan };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { compositionId, plan } = body;
  if (!compositionId || !plan) {
    return NextResponse.json(
      { error: "compositionId y plan son obligatorios" },
      { status: 400 }
    );
  }

  const existing = await getComposition(auth.uid, compositionId);
  if (!existing) {
    return NextResponse.json({ error: "Composición no encontrada" }, { status: 404 });
  }

  try {
    const project = compileHeygenPlanToHyperframes(plan);
    const { storagePath, indexUrl } = await uploadHyperframesProject(
      auth.uid,
      compositionId,
      project
    );

    const heygen = {
      ...existing.heygen,
      plan,
      hyperframesStoragePath: storagePath,
      previewHtmlUrl: indexUrl,
      renderStatus: "preview_ready" as const,
    };

    const composition = await updateComposition(auth.uid, compositionId, {
      heygen,
      totalDurationInFrames: Math.ceil((plan.durationMs / 1000) * plan.fps),
    });

    return NextResponse.json({
      composition,
      previewHtmlUrl: indexUrl,
      storagePath,
    });
  } catch (err) {
    console.error("[heygen/compile]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al compilar HyperFrames" },
      { status: 500 }
    );
  }
}
