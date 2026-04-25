import React, { useMemo } from "react";
import { AbsoluteFill, Sequence as RemotionSequence, useVideoConfig } from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import {
  ScIntroScene,
  ScOutroScene,
  StatHeroScene,
  StatGridScene,
  BarChartScene,
  LineChartScene,
  DonutChartScene,
  ComparisonScene,
  LeaderboardScene,
  InsightScene,
} from "./scenes/DataDrivenScenes";
import { MediaScene } from "./scenes/MediaScene";
import type {
  CompositionInputProps,
  SceneTransition,
  Sequence as SequenceType,
} from "./types";

// ─── Transition helpers ───────────────────────────────────────────────────────

function getPresentation(
  t: SceneTransition,
  width: number,
  height: number
): ReturnType<typeof fade> {
  switch (t.type) {
    case "slide":
      return slide({ direction: t.direction ?? "from-right" }) as unknown as ReturnType<typeof fade>;
    case "wipe":
      return wipe({ direction: t.direction ?? "from-left" }) as unknown as ReturnType<typeof fade>;
    case "flip":
      return flip() as unknown as ReturnType<typeof fade>;
    case "clock-wipe":
      return clockWipe({ width, height }) as unknown as ReturnType<typeof fade>;
    case "none":
    case "fade":
    default:
      return fade();
  }
}

function getTiming(t: SceneTransition) {
  return t.timing === "spring"
    ? springTiming({
        config: {
          damping: t.springConfig?.damping ?? 200,
          stiffness: t.springConfig?.stiffness ?? 100,
        },
        durationInFrames: t.durationInFrames,
      })
    : linearTiming({ durationInFrames: t.durationInFrames });
}

// ─── Scene registry ───────────────────────────────────────────────────────────

function SceneRenderer({ sequence }: { sequence: SequenceType }) {
  switch (sequence.sceneType) {
    case "sc-intro":
      return <ScIntroScene sequence={sequence} />;
    case "sc-outro":
      return <ScOutroScene sequence={sequence} />;
    case "stat-hero":
      return <StatHeroScene sequence={sequence} />;
    case "stat-grid":
      return <StatGridScene sequence={sequence} />;
    case "bar-chart":
      return <BarChartScene sequence={sequence} />;
    case "line-chart":
      return <LineChartScene sequence={sequence} />;
    case "donut-chart":
      return <DonutChartScene sequence={sequence} />;
    case "comparison":
      return <ComparisonScene sequence={sequence} />;
    case "leaderboard":
      return <LeaderboardScene sequence={sequence} />;
    case "insight":
      return <InsightScene sequence={sequence} />;
    case "image":
    case "video":
    case "lottie":
      return <MediaScene sequence={sequence} />;
    case "captions":
    case "audio":
      return null;
    default:
      return null;
  }
}

// ─── Audio layout computation ─────────────────────────────────────────────────
//
// Root cause of the cut/overlap bug:
//
//   The old approach used `prevEnd` to sequence non-loop tracks: each voice
//   started at max(anchorFrame, prevEnd). The +60-frame safety buffer added to
//   each voice's durationInFrames cascaded through prevEnd, pushing every
//   subsequent voice further and further from its visual anchor. With 6 voices
//   each with +60f, the last voice started 300+ frames after its scene — past
//   the composition end — so it never played at all.
//
// Fix:
//   1. Each non-loop track starts exactly at its visual anchor (no prevEnd delay).
//   2. Its effective durationInFrames = space until the next track starts
//      (capped at compositionDuration). This is always >= the scene duration,
//      so voices have room to breathe, and Remotion's hard-cut happens at the
//      cleanest point: the scene boundary where the next voice begins.
//   3. Loop tracks (background music) are unaffected.

interface AudioLayoutItem {
  seq: SequenceType;
  from: number;
  effectiveDur: number;
}

function computeAudioLayout(
  audioSeqs: SequenceType[],
  visualSeqs: SequenceType[],
  visualFromMap: Map<string, number>,
  compositionDuration: number
): AudioLayoutItem[] {
  const result: AudioLayoutItem[] = [];

  const isLoop = (s: SequenceType) =>
    (s.sceneData as Record<string, unknown>)?.loop === true;

  const anchorFrame = (audio: SequenceType): number => {
    const anchor = visualSeqs.find((v) => v.order >= audio.order);
    return anchor ? (visualFromMap.get(anchor.id) ?? 0) : 0;
  };

  // ── Loop tracks (background music) ──────────────────────────────────────
  // Start at their visual anchor, fill the rest of the composition.
  for (const seq of audioSeqs.filter(isLoop)) {
    const from = anchorFrame(seq);
    result.push({
      seq,
      from,
      effectiveDur: Math.max(1, compositionDuration - from),
    });
  }

  // ── Non-loop tracks (voice / SFX) ────────────────────────────────────────
  // Sort by anchor frame so we can compute the "space until next track".
  const nonLoop = audioSeqs
    .filter((s) => !isLoop(s))
    .map((seq) => ({ seq, from: anchorFrame(seq) }))
    .sort((a, b) => a.from - b.from || a.seq.order - b.seq.order);

  for (let i = 0; i < nonLoop.length; i++) {
    const { seq, from } = nonLoop[i];

    // The next track's anchor is the natural cut-point for the current track.
    const nextFrom =
      i < nonLoop.length - 1 ? nonLoop[i + 1].from : compositionDuration;

    // Give this track all the space available until the next one starts.
    // - If the audio file is shorter than this window, it ends naturally (silence gap).
    // - If the audio file is longer, Remotion cuts it at the scene boundary —
    //   which is the cleanest possible cutoff point.
    // - If two tracks share the same anchor (rare), fall back to the specified dur.
    const available = Math.min(nextFrom - from, compositionDuration - from);
    const effectiveDur = available > 0 ? available : seq.durationInFrames;

    result.push({ seq, from, effectiveDur: Math.max(1, effectiveDur) });
  }

  return result;
}

// ─── DynamicComposition ───────────────────────────────────────────────────────

export const DynamicComposition: React.FC<Partial<CompositionInputProps>> = ({
  sequences = [],
}) => {
  const { width, height, durationInFrames: compositionDuration } = useVideoConfig();

  const sorted = useMemo(
    () => [...sequences].sort((a, b) => a.order - b.order),
    [sequences]
  );

  const { visualSeqs, audioSeqs } = useMemo(() => ({
    visualSeqs: sorted.filter((s) => s.sceneType !== "audio"),
    audioSeqs:  sorted.filter((s) => s.sceneType === "audio"),
  }), [sorted]);

  // Frame at which each visual scene starts in the TransitionSeries timeline.
  const visualFromMap = useMemo(() => {
    const map = new Map<string, number>();
    let acc = 0;
    for (let i = 0; i < visualSeqs.length; i++) {
      const seq = visualSeqs[i];
      map.set(seq.id, acc);
      const overlap =
        i < visualSeqs.length - 1 && seq.transition
          ? seq.transition.durationInFrames
          : 0;
      acc += seq.durationInFrames - overlap;
    }
    return map;
  }, [visualSeqs]);

  // Audio layout: from-frame + effectiveDur for every audio track.
  const audioLayout = useMemo(
    () => computeAudioLayout(audioSeqs, visualSeqs, visualFromMap, compositionDuration),
    [audioSeqs, visualSeqs, visualFromMap, compositionDuration]
  );

  if (sorted.length === 0) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#10171d",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.3)",
          fontSize: 14,
        }}
      >
        Sin secuencias — carga datos desde Firestore
      </AbsoluteFill>
    );
  }

  const MUSIC_MAX_VOLUME  = 0.12;
  const VOICE_DEFAULT_VOL = 0.9;

  return (
    <AbsoluteFill style={{ backgroundColor: "#10171d" }}>
      {/* ── Visual layer ── */}
      <TransitionSeries>
        {visualSeqs.map((seq, index) => (
          <React.Fragment key={seq.id}>
            <TransitionSeries.Sequence durationInFrames={seq.durationInFrames}>
              <SceneRenderer sequence={seq} />
            </TransitionSeries.Sequence>

            {seq.transition &&
              seq.transition.type !== "none" &&
              index < visualSeqs.length - 1 && (
                <TransitionSeries.Transition
                  presentation={getPresentation(seq.transition, width, height)}
                  timing={getTiming(seq.transition)}
                />
              )}
          </React.Fragment>
        ))}
      </TransitionSeries>

      {/* ── Audio layer ── */}
      {audioLayout.map(({ seq, from, effectiveDur }) => {
        const data = seq.sceneData as Record<string, unknown>;
        if (!data?.src) return null; // No URL yet — skip silently

        const isLoop = data?.loop === true;
        const agentVolume = typeof data?.volume === "number" ? data.volume : undefined;

        // Music is always capped at MUSIC_MAX_VOLUME so the voice-over stays clear.
        const enforcedVolume = isLoop
          ? Math.min(agentVolume ?? MUSIC_MAX_VOLUME, MUSIC_MAX_VOLUME)
          : (agentVolume ?? VOICE_DEFAULT_VOL);

        const seqWithVolume: typeof seq = {
          ...seq,
          sceneData: { ...data, volume: enforcedVolume } as typeof seq.sceneData,
        };

        return (
          <RemotionSequence
            key={seq.id}
            from={from}
            durationInFrames={effectiveDur}
            layout="none"
          >
            <MediaScene sequence={seqWithVolume} />
          </RemotionSequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const MyComposition: React.FC = () => (
  <DynamicComposition sequences={[]} />
);
