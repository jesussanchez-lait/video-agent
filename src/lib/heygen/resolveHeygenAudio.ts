import type { HeygenVideoPlan, HeygenAudioTrack } from "@/types/heygen";

export type AudioResolveProgress = (msg: string) => void;

/**
 * Resolve _elevenlabs markers on heygen audio tracks via /api/ai/audio.
 */
export async function resolveHeygenAudioTracks(
  plan: HeygenVideoPlan,
  apiUrl: string,
  compositionId: string,
  onProgress?: AudioResolveProgress
): Promise<HeygenVideoPlan> {
  const tracks: HeygenAudioTrack[] = [];

  for (const track of plan.audioTracks) {
    const marker = track._elevenlabs;
    if (!marker) {
      tracks.push(track);
      continue;
    }

    const label =
      marker.type === "voice"
        ? `voz: "${(marker.text ?? "").slice(0, 40)}…"`
        : `${marker.type}: "${(marker.prompt ?? "").slice(0, 40)}…"`;
    onProgress?.(`Generando ${label}`);

    try {
      const res = await fetch(`${apiUrl}/api/ai/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: marker.type,
          text: marker.text,
          prompt: marker.prompt,
          durationMs: marker.durationMs,
          durationSeconds: marker.durationSeconds,
          compositionId,
        }),
      });
      const data = (await res.json()) as { downloadUrl?: string; error?: string };
      tracks.push({
        ...track,
        src: data.downloadUrl ?? track.src,
      });
    } catch {
      tracks.push(track);
    }
  }

  return { ...plan, audioTracks: tracks };
}
