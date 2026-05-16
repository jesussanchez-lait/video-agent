"use client";

import { Player } from "@remotion/player";
import { DynamicComposition } from "../src/Composition";
import { HeygenPreview } from "./components/HeygenPreview";
import type { CompositionDTO } from "../src/types";

interface VideoPlayerProps {
  /** Composición cargada desde Firestore. Solo se muestra si existe. */
  composition?: CompositionDTO;
}

export default function VideoPlayer({ composition }: VideoPlayerProps) {
  if (!composition) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          padding: 48,
          borderRadius: 12,
          border: "1px dashed rgba(157,255,32,0.3)",
          background: "rgba(157,255,32,0.04)",
          textAlign: "center",
          color: "rgba(255,255,255,0.5)",
          fontSize: 14,
        }}
      >
        Sin composiciones en la base de datos. Usa el botón flotante para
        inicializar la colección.
      </div>
    );
  }

  if (composition.renderEngine === "heygen") {
    return <HeygenPreview composition={composition} />;
  }

  const { fps, width, height, sequences, totalDurationInFrames } = composition;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 960,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px rgba(157,255,32,0.15), 0 24px 80px rgba(0,0,0,0.6)",
      }}
    >
      <Player
        component={DynamicComposition}
        inputProps={{ sequences }}
        durationInFrames={totalDurationInFrames}
        fps={fps}
        compositionWidth={width}
        compositionHeight={height}
        style={{ width: "100%" }}
        controls
        loop
        autoPlay={false}
        clickToPlay
        acknowledgeRemotionLicense
      />
    </div>
  );
}
