import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "../../_lib/session";
import { getComposition, updateComposition } from "@/lib/db";

export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/**
 * Fase 2: render MP4 vía worker HyperFrames.
 * Si HYPERFRAMES_RENDER_WORKER_URL no está configurado, devuelve 503 con instrucciones.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const composition = await getComposition(auth.uid, id);
  if (!composition) {
    return NextResponse.json({ error: "Composición no encontrada" }, { status: 404 });
  }

  if (composition.renderEngine !== "heygen") {
    return NextResponse.json(
      { error: "Solo composiciones HeyGen pueden usar este render" },
      { status: 400 }
    );
  }

  const workerUrl = process.env.HYPERFRAMES_RENDER_WORKER_URL?.trim();
  if (!workerUrl) {
    return NextResponse.json(
      {
        error:
          "Render en cloud no configurado. Define HYPERFRAMES_RENDER_WORKER_URL o usa preview en navegador (Fase 1).",
        renderStatus: composition.heygen?.renderStatus,
      },
      { status: 503 }
    );
  }

  try {
    await updateComposition(auth.uid, id, {
      heygen: {
        ...composition.heygen,
        renderStatus: "rendering",
      },
    });

    const res = await fetch(`${workerUrl.replace(/\/$/, "")}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: auth.uid,
        compositionId: id,
        storagePath: composition.heygen?.hyperframesStoragePath,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await updateComposition(auth.uid, id, {
        heygen: {
          ...composition.heygen,
          renderStatus: "failed",
        },
      });
      return NextResponse.json(
        { error: data.error ?? "Worker de render falló" },
        { status: 502 }
      );
    }

    const updated = await updateComposition(auth.uid, id, {
      heygen: {
        ...composition.heygen,
        renderStatus: "completed",
        outputVideoUrl: data.outputVideoUrl,
      },
    });

    return NextResponse.json({ composition: updated, outputVideoUrl: data.outputVideoUrl });
  } catch (err) {
    console.error("[render-heygen]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al renderizar" },
      { status: 500 }
    );
  }
}
