// ─────────────────────────────────────────────────────────────────────────────
// Scene & Transition types — SocialCognitive Analytics Reels
// ─────────────────────────────────────────────────────────────────────────────

export type SceneType =
  // ── SocialCognitive branded scenes ──────────────────────────────────────
  | "sc-intro"       // Branded intro: logo, title, period label
  | "stat-hero"      // One giant animated metric
  | "stat-grid"      // 2–4 metrics in a card grid
  | "bar-chart"      // Animated vertical bar chart
  | "line-chart"     // Animated SVG line chart
  | "donut-chart"    // Donut / pie breakdown
  | "comparison"     // Side-by-side A vs B
  | "leaderboard"    // Ranked list with animated bars
  | "insight"        // Bold text insight / analysis
  | "sc-outro"       // Branded CTA closing scene
  // ── Media / infrastructure (keep) ───────────────────────────────────────
  | "image"
  | "video"
  | "audio"
  | "lottie"
  | "captions";

export type TransitionType = "fade" | "slide" | "wipe" | "flip" | "clock-wipe" | "none";

export type TransitionDirection =
  | "from-left"
  | "from-right"
  | "from-top"
  | "from-bottom";

export type TransitionTiming = "linear" | "spring";

export interface SceneTransition {
  type: TransitionType;
  durationInFrames: number;
  direction?: TransitionDirection;
  timing: TransitionTiming;
  springConfig?: { damping?: number; stiffness?: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation config (entrance/exit per component)
// ─────────────────────────────────────────────────────────────────────────────

export type EasingType =
  | "linear" | "quad" | "cubic" | "sin" | "exp"
  | "circle" | "elastic" | "bounce" | "back" | "bezier";

export type EasingVariant = "in" | "out" | "inOut";
export type EntranceExitType = "fade" | "slide" | "scale" | "spring";

export interface EntranceExitConfig {
  type: EntranceExitType;
  durationInFrames: number;
  delayInFrames?: number;
  easing?: EasingType;
  easingVariant?: EasingVariant;
  springConfig?: { damping?: number; stiffness?: number; mass?: number };
  bezierParams?: [number, number, number, number];
}

export type LayoutAnchor =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export interface LayoutConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  anchor?: LayoutAnchor;
}

export interface AnimationConfig {
  entrance?: EntranceExitConfig;
  exit?: EntranceExitConfig;
  layout?: LayoutConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene data interfaces — SocialCognitive Analytics
// ─────────────────────────────────────────────────────────────────────────────

/** sc-intro — Branded opening scene */
export interface ScIntroData {
  /** Main title e.g. "Resultados de Campaña" */
  title: string;
  /** Subtitle or client name */
  subtitle?: string;
  /** Time period label e.g. "Q1 2025 | Meta Ads" */
  period?: string;
  /** Override purple accent. Default: #5c59ca */
  accentColor?: string;
}

/** stat-hero — One large animated KPI */
export interface StatHeroData {
  /** Display value e.g. "3.2M", "92%", "$48,000" */
  value: string;
  /** What the stat means e.g. "Impresiones totales" */
  label: string;
  /** Icon name from sc: collection e.g. "sc:eye" */
  icon?: string;
  /** Change text e.g. "+24%" or "-5%" */
  change?: string;
  /** true = positive (green), false = negative (red). Default true */
  changePositive?: boolean;
  /** Brief context below the label e.g. "vs Q4 2024" */
  context?: string;
  /** Accent color override. Default: #5c59ca */
  accentColor?: string;
}

/** stat-grid — Grid of 2–4 KPI cards */
export interface StatGridData {
  /** Section title */
  title?: string;
  /** Period label e.g. "Enero – Marzo 2025" */
  period?: string;
  items: Array<{
    /** Icon name e.g. "sc:eye" */
    icon?: string;
    /** Display value e.g. "3.2M" */
    value: string;
    /** Metric name e.g. "Impresiones" */
    label: string;
    /** Change text e.g. "+12%" */
    change?: string;
    /** true = positive (shows green), false = negative (shows red) */
    changePositive?: boolean;
    /** Card accent color. Defaults to purple or fuschia alternating */
    color?: string;
  }>;
}

/** bar-chart — Animated vertical bar chart */
export interface BarChartData {
  /** Chart title */
  title?: string;
  /** Subtitle or source */
  subtitle?: string;
  bars: Array<{
    /** X-axis label */
    label: string;
    /** Numeric value */
    value: number;
    /** Bar color. Default: purple */
    color?: string;
  }>;
  /** Value unit e.g. "K", "%", "$" (appended to value labels) */
  unit?: string;
  /** Override max value for scaling. Default: max of bars */
  maxValue?: number;
}

/** line-chart — Animated SVG line chart */
export interface LineChartData {
  /** Chart title */
  title?: string;
  /** Subtitle or x-axis context */
  subtitle?: string;
  points: Array<{
    /** X-axis label */
    label: string;
    /** Numeric value */
    value: number;
  }>;
  /** Value unit e.g. "K", "%" */
  unit?: string;
  /** Line + area color. Default: #5c59ca */
  color?: string;
}

/** donut-chart — Animated donut/pie breakdown */
export interface DonutChartData {
  /** Chart title */
  title?: string;
  segments: Array<{
    /** Segment label */
    label: string;
    /** Numeric value (percentages or raw — will be normalized) */
    value: number;
    /** Segment color */
    color?: string;
  }>;
  /** Label shown in donut center e.g. "Total" */
  centerLabel?: string;
  /** Value shown in donut center e.g. "100%" or "3.2M" */
  centerValue?: string;
}

/** comparison — Side-by-side A vs B */
export interface ComparisonData {
  /** Section title */
  title?: string;
  /** Period or context label */
  period?: string;
  /** Left column label e.g. "Este mes" */
  labelA: string;
  /** Right column label e.g. "Mes anterior" */
  labelB: string;
  metrics: Array<{
    /** Metric name */
    label: string;
    /** Value for A */
    valueA: string | number;
    /** Value for B */
    valueB: string | number;
    /** Unit suffix e.g. "%" */
    unit?: string;
    /**
     * Is A the winner? true = A highlighted (purple),
     * false = B highlighted (fuschia). Default: compare numerically.
     */
    aWins?: boolean;
  }>;
}

/** leaderboard — Ranked list with animated bars */
export interface LeaderboardData {
  /** Section title */
  title?: string;
  /** Subtitle e.g. "Por impresiones" */
  subtitle?: string;
  items: Array<{
    /** Display name/label */
    label: string;
    /** Numeric or display value */
    value: string | number;
    /** Small sublabel e.g. platform name */
    sublabel?: string;
    /** Icon name e.g. "sc:instagram" */
    icon?: string;
    /** Item color. Defaults to position-based (purple/fuschia/white) */
    color?: string;
  }>;
  /** Unit appended to values e.g. "K", "%" */
  unit?: string;
}

/** insight — Bold analytics insight or takeaway */
export interface InsightData {
  /** Main insight text (1–2 sentences, bold) */
  insight: string;
  /** Supporting statistic e.g. "3.2M impresiones" */
  stat?: string;
  /** Stat description label */
  statLabel?: string;
  /** Icon name e.g. "sc:flame" */
  icon?: string;
  /** Source attribution e.g. "Meta Ads Manager · Q1 2025" */
  source?: string;
  /** Accent color override */
  accentColor?: string;
}

/** sc-outro — Branded closing CTA */
export interface ScOutroData {
  /** Tagline e.g. "Inteligencia que convierte" */
  tagline?: string;
  /** Website URL e.g. "socialcognitive.com" */
  website?: string;
  /** Social handle e.g. "@socialcognitive" */
  handle?: string;
  /** Call-to-action text e.g. "Agenda tu consulta gratis" */
  ctaText?: string;
  /** Accent color override. Default: #5c59ca */
  accentColor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Media / infrastructure data interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageData {
  src: string;
  fit?: "fill" | "contain" | "cover";
  objectPosition?: string;
}

export interface VideoData {
  src: string;
  volume?: number;
  playbackRate?: number;
  loop?: boolean;
  trimBefore?: number;
  trimAfter?: number;
}

export interface AudioData {
  src: string;
  volume?: number;
  loop?: boolean;
  /** ElevenLabs generation marker — stripped after audio is generated */
  _elevenlabs?: {
    type: "music" | "voice" | "sfx";
    prompt?: string;
    text?: string;
    durationMs?: number;
    durationSeconds?: number;
  };
}

export interface LottieData {
  src: string;
  loop?: boolean;
}

export interface CaptionsData {
  src: string;
}

export type SceneData =
  | ScIntroData
  | StatHeroData
  | StatGridData
  | BarChartData
  | LineChartData
  | DonutChartData
  | ComparisonData
  | LeaderboardData
  | InsightData
  | ScOutroData
  | ImageData
  | VideoData
  | AudioData
  | LottieData
  | CaptionsData;

// ─────────────────────────────────────────────────────────────────────────────
// Sequence — one scene in a composition
// ─────────────────────────────────────────────────────────────────────────────

export interface Sequence {
  id: string;
  order: number;
  from?: number;
  sceneType: SceneType;
  durationInFrames: number;
  sceneData: SceneData;
  transition?: SceneTransition;
  animationConfig?: AnimationConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composition DTO
// ─────────────────────────────────────────────────────────────────────────────

export type CompositionStatus = "draft" | "published" | "archived";

export type { RenderEngine, CompositionHeygenMeta } from "./heygen";

import type { RenderEngine, CompositionHeygenMeta } from "./heygen";

export interface CompositionDTO {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  status: CompositionStatus;
  thumbnailUrl?: string;
  fps: number;
  width: number;
  height: number;
  sequences: Sequence[];
  totalDurationInFrames: number;
  renderEngine?: RenderEngine;
  heygen?: CompositionHeygenMeta;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset DTO
// ─────────────────────────────────────────────────────────────────────────────

export type AssetType = "image" | "video" | "audio" | "font";

export interface AssetDTO {
  id: string;
  ownerId: string;
  name: string;
  type: AssetType;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
  description?: string;
  sessionId?: string;
  compositionId?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// User profile DTO
// ─────────────────────────────────────────────────────────────────────────────

export type UserPlan = "free" | "pro" | "enterprise";

export interface UserProfileDTO {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  plan: UserPlan;
  compositionsCount: number;
  storageUsedBytes: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Remotion Player input props
// ─────────────────────────────────────────────────────────────────────────────

export interface CompositionInputProps {
  sequences: Sequence[];
}
