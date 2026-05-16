import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "../../../_lib/session";
import { getComposition } from "@/lib/db";
import { getHyperframesSignedUrl } from "@/lib/hyperframes/uploadProject";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const composition = await getComposition(auth.uid, id);
  if (!composition) {
    return NextResponse.json({ error: "Composición no encontrada" }, { status: 404 });
  }

  if (composition.renderEngine !== "heygen") {
    return NextResponse.json(
      { error: "Esta composición no usa motor HeyGen" },
      { status: 400 }
    );
  }

  const storagePath = composition.heygen?.hyperframesStoragePath;
  if (!storagePath) {
    return NextResponse.json(
      { error: "Proyecto HyperFrames no compilado" },
      { status: 404 }
    );
  }

  try {
    const previewUrl =
      composition.heygen?.previewHtmlUrl ??
      (await getHyperframesSignedUrl(storagePath));

    return NextResponse.json({
      compositionId: id,
      previewUrl,
      plan: composition.heygen?.plan,
      renderStatus: composition.heygen?.renderStatus,
    });
  } catch (err) {
    console.error("[heygen/preview]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener preview" },
      { status: 500 }
    );
  }
}
