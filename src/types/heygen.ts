// ─────────────────────────────────────────────────────────────────────────────
// HeyGen + HyperFrames composition types
// ─────────────────────────────────────────────────────────────────────────────

export type RenderEngine = "remotion" | "heygen";

export type HeygenRenderStatus =
  | "draft"
  | "preview_ready"
  | "rendering"
  | "completed"
  | "failed";

export type HeygenLayoutMode =
  | "avatar_full"
  | "avatar_pip"
  | "graphics_only"
  | "avatar_with_overlays"
  | "news_ticker"
  | "split_screen";

export type HeygenLayerType =
  | "image"
  | "video"
  | "chart"
  | "infographic"
  | "text_bubble"
  | "lower_third"
  | "news_frame"
  | "caption_karaoke"
  | "shader_transition"
  | "social_card";

export interface HeygenLayer {
  type: HeygenLayerType;
  /** Offset within segment (ms). Defaults to 0. */
  startMs?: number;
  endMs?: number;
  src?: string;
  text?: string;
  title?: string;
  subtitle?: string;
  headline?: string;
  chartData?: {
    labels?: string[];
    values?: number[];
    title?: string;
  };
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "full";
  accentColor?: string;
}

export interface HeygenSegmentAvatar {
  script?: string;
  heygenVideoUrl?: string;
  heygenVideoId?: string;
  crop?: "circle" | "rounded" | "freeform";
  position?: "center" | "left" | "right" | "pip-bottom-right" | "pip-top-left";
}

export interface HeygenSegment {
  id: string;
  startMs: number;
  endMs: number;
  layoutMode: HeygenLayoutMode;
  avatar?: HeygenSegmentAvatar;
  layers: HeygenLayer[];
}

export interface ElevenLabsAudioMarker {
  type: "voice" | "music" | "sfx";
  text?: string;
  prompt?: string;
  durationMs?: number;
  durationSeconds?: number;
}

export interface HeygenAudioTrack {
  id: string;
  type: "voice" | "music" | "sfx";
  volume: number;
  loop?: boolean;
  startMs?: number;
  _elevenlabs: ElevenLabsAudioMarker;
  src?: string;
}

export interface HeygenVideoPlan {
  title: string;
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  avatarStyle?: string;
  suggestedAvatarId?: string;
  /** Full-length avatar take (ElevenLabs voice audio → HeyGen). */
  fullAvatarVideoUrl?: string;
  audioTracks: HeygenAudioTrack[];
  segments: HeygenSegment[];
}

export interface HeygenJobRecord {
  segmentId: string;
  videoId: string;
  status: string;
  videoUrl?: string;
}

export interface CompositionHeygenMeta {
  avatarDescription?: string;
  avatarId?: string;
  talkingPhotoId?: string;
  hyperframesStoragePath?: string;
  plan?: HeygenVideoPlan;
  heygenJobs?: HeygenJobRecord[];
  renderStatus?: HeygenRenderStatus;
  outputVideoUrl?: string;
  previewHtmlUrl?: string;
}
