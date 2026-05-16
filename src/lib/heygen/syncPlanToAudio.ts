import type { HeygenVideoPlan } from "@/types/heygen";

/**
 * Re-scale segment timings to match actual voice duration (audio-first sync).
 */
export function syncPlanSegmentsToVoiceDuration(
  plan: HeygenVideoPlan,
  voiceDurationMs: number
): HeygenVideoPlan {
  const plannedDuration = plan.durationMs || voiceDurationMs;
  if (plannedDuration <= 0 || plan.segments.length === 0) {
    return { ...plan, durationMs: voiceDurationMs };
  }

  const ratio = voiceDurationMs / plannedDuration;
  const segments = plan.segments.map((seg, i) => {
    const startMs = Math.round(seg.startMs * ratio);
    const endMs =
      i === plan.segments.length - 1
        ? voiceDurationMs
        : Math.round(seg.endMs * ratio);
    return { ...seg, startMs, endMs: Math.max(startMs + 200, endMs) };
  });

  return {
    ...plan,
    durationMs: voiceDurationMs,
    segments,
  };
}

export function getVoiceTrackUrl(plan: HeygenVideoPlan): string | undefined {
  return plan.audioTracks.find((t) => t.type === "voice" && t.src)?.src;
}
