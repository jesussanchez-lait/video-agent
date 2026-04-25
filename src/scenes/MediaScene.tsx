import React, { useState, useEffect } from "react";
import { Img, AnimatedImage, delayRender, cancelRender, continueRender } from "remotion";
import { Video, Audio } from "@remotion/media";
import { Gif } from "@remotion/gif";
import { Lottie, LottieAnimationData } from "@remotion/lottie";
import { AbsoluteFill } from "remotion";
import type { Sequence } from "../types";
import type {
  ImageData,
  VideoData,
  AudioData,
  LottieData,
} from "../types";

// Local types for legacy layers (not used in active scene routing)
type GifData = { src: string; width?: number; height?: number };
type AnimatedImageData = { src: string; width?: number; height?: number; fit?: "fill" | "contain" | "cover"; playbackRate?: number; loopBehavior?: "loop" | "pause-after-finish" | "clear-after-finish" };
type TextData = { text: string; fontFamily?: string; fontSize?: number; color?: string; align?: "left" | "center" | "right"; fontWeight?: string };
import { AnimatedLayer } from "../components/AnimatedLayer";

// ─────────────────────────────────────────────────────────────────────────────
// Image
// ─────────────────────────────────────────────────────────────────────────────

function ImageLayer({ data, sequence }: { data: ImageData; sequence: Sequence }) {
  if (!data.src) return null;
  const content = (
    <Img
      src={data.src}
      style={{
        width: "100%",
        height: "100%",
        objectFit: data.fit ?? "contain",
        objectPosition: data.objectPosition,
      }}
    />
  );

  return (
    <AnimatedLayer
      config={sequence.animationConfig}
      durationInFrames={sequence.durationInFrames}
      fullFill={!sequence.animationConfig?.layout}
    >
      {sequence.animationConfig?.layout ? (
        <div style={{ width: "100%", height: "100%" }}>{content}</div>
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: "100%", maxHeight: "100%" }}>{content}</div>
        </AbsoluteFill>
      )}
    </AnimatedLayer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Video
// ─────────────────────────────────────────────────────────────────────────────

function VideoLayer({ data, sequence }: { data: VideoData; sequence: Sequence }) {
  if (!data.src) return null;
  const content = (
    <Video
      src={data.src}
      volume={data.volume ?? 1}
      playbackRate={data.playbackRate ?? 1}
      loop={data.loop ?? false}
      trimBefore={data.trimBefore}
      trimAfter={data.trimAfter}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );

  return (
    <AnimatedLayer
      config={sequence.animationConfig}
      durationInFrames={sequence.durationInFrames}
      fullFill={!sequence.animationConfig?.layout}
    >
      {sequence.animationConfig?.layout ? (
        <div style={{ width: "100%", height: "100%" }}>{content}</div>
      ) : (
        <AbsoluteFill>{content}</AbsoluteFill>
      )}
    </AnimatedLayer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio (no visual; just plays)
// ─────────────────────────────────────────────────────────────────────────────

function AudioLayer({ data }: { data: AudioData }) {
  if (!data.src) return null;
  return (
    <Audio
      src={data.src}
      volume={data.volume ?? 1}
      loop={data.loop ?? false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GIF
// ─────────────────────────────────────────────────────────────────────────────

function GifLayer({ data, sequence }: { data: GifData; sequence: Sequence }) {
  const w = data.width ?? 400;
  const h = data.height ?? 400;
  const content = <Gif src={data.src} width={w} height={h} />;

  return (
    <AnimatedLayer
      config={sequence.animationConfig}
      durationInFrames={sequence.durationInFrames}
      fullFill={!sequence.animationConfig?.layout}
    >
      {sequence.animationConfig?.layout ? (
        <div style={{ width: "100%", height: "100%" }}>{content}</div>
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {content}
        </AbsoluteFill>
      )}
    </AnimatedLayer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedImage (GIF/APNG/WebP via ImageDecoder)
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedImageLayer({
  data,
  sequence,
}: {
  data: AnimatedImageData;
  sequence: Sequence;
}) {
  const w = data.width ?? 400;
  const h = data.height ?? 400;
  const content = (
    <AnimatedImage
      src={data.src}
      width={w}
      height={h}
      fit={data.fit ?? "contain"}
      playbackRate={data.playbackRate ?? 1}
      loopBehavior={data.loopBehavior ?? "loop"}
    />
  );

  return (
    <AnimatedLayer
      config={sequence.animationConfig}
      durationInFrames={sequence.durationInFrames}
      fullFill={!sequence.animationConfig?.layout}
    >
      {sequence.animationConfig?.layout ? (
        <div style={{ width: "100%", height: "100%" }}>{content}</div>
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {content}
        </AbsoluteFill>
      )}
    </AnimatedLayer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lottie
// ─────────────────────────────────────────────────────────────────────────────

function LottieLayer({ data, sequence }: { data: LottieData; sequence: Sequence }) {
  if (!data.src) return null;
  const [handle] = useState(() => delayRender("Loading Lottie"));
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    fetch(data.src)
      .then((r) => r.json())
      .then((json) => {
        setAnimationData(json);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [data.src, handle]);

  if (!animationData) return null;

  const content = (
    <Lottie
      animationData={animationData}
      loop={data.loop ?? true}
      style={{ width: 400, height: 400 }}
    />
  );

  return (
    <AnimatedLayer
      config={sequence.animationConfig}
      durationInFrames={sequence.durationInFrames}
      fullFill={!sequence.animationConfig?.layout}
    >
      {sequence.animationConfig?.layout ? (
        <div style={{ width: "100%", height: "100%" }}>{content}</div>
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {content}
        </AbsoluteFill>
      )}
    </AnimatedLayer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Text
// ─────────────────────────────────────────────────────────────────────────────

function TextLayer({ data, sequence }: { data: TextData; sequence: Sequence }) {
  const content = (
    <div
      style={{
        fontFamily: data.fontFamily ?? "Inter, sans-serif",
        fontSize: data.fontSize ?? 48,
        color: data.color ?? "#ffffff",
        textAlign: data.align ?? "center",
        fontWeight: data.fontWeight ?? "400",
        padding: 24,
      }}
    >
      {data.text || "Texto"}
    </div>
  );

  return (
    <AnimatedLayer
      config={sequence.animationConfig}
      durationInFrames={sequence.durationInFrames}
      fullFill={!sequence.animationConfig?.layout}
    >
      {sequence.animationConfig?.layout ? (
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          {content}
        </div>
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {content}
        </AbsoluteFill>
      )}
    </AnimatedLayer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MediaScene — dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export function MediaScene({ sequence }: { sequence: Sequence }) {
  const data = sequence.sceneData;
  const type = sequence.sceneType;

  switch (type) {
    case "image":
      return <ImageLayer data={data as ImageData} sequence={sequence} />;
    case "video":
      return <VideoLayer data={data as VideoData} sequence={sequence} />;
    case "audio":
      return <AudioLayer data={data as AudioData} />;
    case "lottie":
      return <LottieLayer data={data as LottieData} sequence={sequence} />;
    default:
      return null;
  }
}
