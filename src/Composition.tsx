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

// ─── DynamicComposition ───────────────────────────────────────────────────────
//
// Audio sequences are rendered as absolute RemotionSequence overlays so they
// don't affect the TransitionSeries visual timeline. Their `from` frame is
// computed by finding the first visual sequence whose order >= audio.order.
//

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
    audioSeqs: sorted.filter((s) => s.sceneType === "audio"),
  }), [sorted]);

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

  const audioFromMap = useMemo(() => {
    const map = new Map<string, number>();

    // Loop tracks (background music) anchor freely — they fill the whole composition.
    const loopAudio = audioSeqs.filter(
      (s) => (s.sceneData as Record<string, unknown>)?.loop === true
    );
    for (const audio of loopAudio) {
      const anchor = visualSeqs.find((v) => v.order >= audio.order);
      map.set(audio.id, anchor ? (visualFromMap.get(anchor.id) ?? 0) : 0);
    }

    // Non-loop tracks (voice / SFX) are sequenced strictly: each one starts
    // at max(its visual anchor, end of previous non-loop track) so they never overlap.
    const nonLoopAudio = audioSeqs
      .filter((s) => (s.sceneData as Record<string, unknown>)?.loop !== true)
      .map((audio) => {
        const anchor = visualSeqs.find((v) => v.order >= audio.order);
        return { audio, anchorFrame: anchor ? (visualFromMap.get(anchor.id) ?? 0) : 0 };
      })
      .sort((a, b) => a.anchorFrame - b.anchorFrame || a.audio.order - b.audio.order);

    let prevEnd = 0;
    for (const { audio, anchorFrame } of nonLoopAudio) {
      const from = Math.max(anchorFrame, prevEnd);
      map.set(audio.id, from);
      prevEnd = from + audio.durationInFrames;
    }

    return map;
  }, [audioSeqs, visualSeqs, visualFromMap]);

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
      {audioSeqs.map((seq) => {
        const from = audioFromMap.get(seq.id) ?? 0;
        const data = seq.sceneData as Record<string, unknown>;
        if (!data?.src) return null; // Skip audio sequences with no resolved src
        const isLoop = data?.loop === true;

        // Loop tracks = background music: fill composition + enforce low volume
        // so the voice-over is always intelligible regardless of agent output.
        const MUSIC_MAX_VOLUME = 0.12;
        const VOICE_DEFAULT_VOLUME = 0.9;

        const agentVolume = typeof data?.volume === "number" ? data.volume : undefined;
        const enforcedVolume = isLoop
          ? Math.min(agentVolume ?? MUSIC_MAX_VOLUME, MUSIC_MAX_VOLUME)
          : (agentVolume ?? VOICE_DEFAULT_VOLUME);

        const dur = isLoop ? compositionDuration - from : seq.durationInFrames;

        const seqWithVolume: typeof seq = {
          ...seq,
          sceneData: { ...data, volume: enforcedVolume } as typeof seq.sceneData,
        };

        return (
          <RemotionSequence
            key={seq.id}
            from={from}
            durationInFrames={Math.max(1, dur)}
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
