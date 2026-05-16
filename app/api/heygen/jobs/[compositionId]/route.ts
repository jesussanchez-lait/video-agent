import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "../../../_lib/session";
import { getComposition } from "@/lib/db";
import { getVideoStatus } from "@/lib/heygen/client";

type Params = { params: Promise<{ compositionId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { compositionId } = await params;
  const composition = await getComposition(auth.uid, compositionId);
  if (!composition) {
    return NextResponse.json({ error: "Composición no encontrada" }, { status: 404 });
  }

  const jobs = composition.heygen?.heygenJobs ?? [];
  const refreshed = await Promise.all(
    jobs.map(async (job) => {
      if (job.status === "completed" && job.videoUrl) return job;
      try {
        const status = await getVideoStatus(job.videoId);
        return {
          ...job,
          status: status.status,
          videoUrl: status.video_url ?? job.videoUrl,
        };
      } catch {
        return job;
      }
    })
  );

  return NextResponse.json({
    compositionId,
    renderStatus: composition.heygen?.renderStatus,
    jobs: refreshed,
    previewHtmlUrl: composition.heygen?.previewHtmlUrl,
    outputVideoUrl: composition.heygen?.outputVideoUrl,
  });
}
