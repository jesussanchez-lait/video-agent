import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { Icon } from "@iconify/react";
import "../utils/iconRegistry"; // register sc: icon collection
import type { Sequence } from "../types";
import type {
  ScIntroData,
  StatHeroData,
  StatGridData,
  BarChartData,
  LineChartData,
  DonutChartData,
  ComparisonData,
  LeaderboardData,
  InsightData,
  ScOutroData,
} from "../types";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

// ─── Brand tokens ─────────────────────────────────────────────────────────────

const PURPLE  = "#5c59ca";
const FUSCHIA = "#dc1960";
const DARK    = "#10171d";
const WHITE   = "#ffffff";

// ─── Theme system ─────────────────────────────────────────────────────────────

type ThemeKey = "dark" | "light";

const THEMES = {
  dark: {
    bg:          DARK,
    text:        WHITE,
    textSub:     "rgba(255,255,255,0.72)",
    textMuted:   "rgba(255,255,255,0.38)",
    card:        "rgba(77,77,95,0.14)",
    cardBorder:  (accent: string) => `${accent}44`,
    rowCard:     "rgba(77,77,95,0.14)",
    rowBorder:   "rgba(255,255,255,0.07)",
    gridLine:    "rgba(255,255,255,0.04)",
    blobPrimary: (c: string) => `${c}28`,
    blobSecondary: `${FUSCHIA}1e`,
  },
  light: {
    bg:          WHITE,
    text:        DARK,
    textSub:     "rgba(16,23,29,0.62)",
    textMuted:   "rgba(16,23,29,0.36)",
    card:        "rgba(92,89,202,0.06)",
    cardBorder:  (accent: string) => `${accent}30`,
    rowCard:     "rgba(92,89,202,0.05)",
    rowBorder:   "rgba(92,89,202,0.14)",
    gridLine:    "rgba(16,23,29,0.055)",
    blobPrimary: (c: string) => `${c}1a`,
    blobSecondary: `${FUSCHIA}14`,
  },
} as const satisfies Record<ThemeKey, object>;

function getTheme(sceneData: unknown): ThemeKey {
  const d = sceneData as Record<string, unknown>;
  return d?.theme === "light" ? "light" : "dark";
}

// ─── Layout constants ─────────────────────────────────────────────────────────
// Canvas 1080 × 1920. Content lives in the central 60% of height.

const PAD_X         = 60;
const ZONE_TOP_PCT  = "20%"; // 20% top → 60% height → 20% bottom
const ZONE_HEIGHT   = "60%";

// ─── Animation helpers ────────────────────────────────────────────────────────

const spr = (frame: number, delay = 0, cfg: { damping?: number; stiffness?: number } = {}) =>
  spring({ frame: frame - delay, fps: 30, config: { damping: 14, stiffness: 100, ...cfg } });

const fadeIn = (f: number, start: number, dur = 20) =>
  interpolate(f, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const slideUp = (f: number, start: number, distance = 50) =>
  interpolate(f, [start, start + 25], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const easeOut = (f: number, start: number, end: number, from: number, to: number) =>
  interpolate(f, [start, end], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

// ─── Shared background ────────────────────────────────────────────────────────

function SceneBg({ accentColor = PURPLE, theme = "dark" as ThemeKey }) {
  const t = THEMES[theme];
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: t.bg }} />
      {/* Accent blob — top-left */}
      <div
        style={{
          position: "absolute",
          top: -160,
          left: -120,
          width: 680,
          height: 680,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${t.blobPrimary(accentColor)} 0%, transparent 70%)`,
        }}
      />
      {/* Fuschia blob — bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: -160,
          right: -120,
          width: 580,
          height: 580,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${t.blobSecondary} 0%, transparent 70%)`,
        }}
      />
    </>
  );
}

// ─── ContentZone ─────────────────────────────────────────────────────────────

function ContentZone({
  children,
  center = false,
  style,
}: {
  children: React.ReactNode;
  center?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: ZONE_TOP_PCT,
        left: PAD_X,
        right: PAD_X,
        height: ZONE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        ...(center ? { alignItems: "center", justifyContent: "center", textAlign: "center" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── GlassCard ───────────────────────────────────────────────────────────────

function GlassCard({
  children,
  style,
  accentColor = PURPLE,
  theme = "dark" as ThemeKey,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accentColor?: string;
  theme?: ThemeKey;
}) {
  const t = THEMES[theme];
  return (
    <div
      style={{
        background: t.card,
        border: `1.5px solid ${t.cardBorder(accentColor)}`,
        borderRadius: 24,
        padding: "32px 36px",
        backdropFilter: theme === "dark" ? "blur(12px)" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── ScIcon ───────────────────────────────────────────────────────────────────

function ScIcon({ icon, size = 36, color }: { icon: string; size?: number; color: string }) {
  if (!icon) return null;
  return <Icon icon={icon} style={{ width: size, height: size, color, display: "block" }} />;
}

// ─── SceneTitle ───────────────────────────────────────────────────────────────

function SceneTitle({
  title,
  subtitle,
  op = 1,
  ty = 0,
  center = false,
  theme = "dark" as ThemeKey,
}: {
  title?: string;
  subtitle?: string;
  op?: number;
  ty?: number;
  center?: boolean;
  theme?: ThemeKey;
}) {
  if (!title && !subtitle) return null;
  const t = THEMES[theme];
  return (
    <div style={{ opacity: op, transform: `translateY(${ty}px)`, textAlign: center ? "center" : "left", marginBottom: 8 }}>
      {title && (
        <div style={{ fontSize: 52, fontWeight: 800, color: t.text, lineHeight: 1.1, letterSpacing: -1, marginBottom: subtitle ? 10 : 0 }}>
          {title}
        </div>
      )}
      {subtitle && (
        <div style={{ fontSize: 26, fontWeight: 500, color: t.textSub, lineHeight: 1.3 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ─── ChangeBadge ─────────────────────────────────────────────────────────────

function ChangeBadge({ change, positive = true }: { change: string; positive?: boolean }) {
  const color = positive ? "#22c55e" : "#ef4444";
  const arrow = positive ? "sc:arrow-up" : "sc:arrow-down";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: `${color}18`,
        border: `1.5px solid ${color}44`,
        borderRadius: 50,
        padding: "6px 18px",
      }}
    >
      <Icon icon={arrow} style={{ width: 18, height: 18, color }} />
      <span style={{ color, fontSize: 20, fontWeight: 700 }}>{change}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScIntroScene
// ─────────────────────────────────────────────────────────────────────────────

function getScIntroData(s: Sequence): ScIntroData {
  const d = s.sceneData as Record<string, unknown>;
  return {
    title:       typeof d.title === "string" ? d.title : "Resultados",
    subtitle:    typeof d.subtitle === "string" ? d.subtitle : undefined,
    period:      typeof d.period === "string" ? d.period : undefined,
    accentColor: typeof d.accentColor === "string" ? d.accentColor : PURPLE,
  };
}

export function ScIntroScene({ sequence }: { sequence: Sequence }) {
  const frame  = useCurrentFrame();
  const data   = getScIntroData(sequence);
  const theme  = getTheme(sequence.sceneData);
  const t      = THEMES[theme];
  const accent = data.accentColor ?? PURPLE;

  const logoS    = spr(frame, 0, { damping: 10, stiffness: 80 });
  const logoScale = interpolate(logoS, [0, 1], [0.5, 1]);
  const logoOp    = interpolate(logoS, [0, 1], [0, 1]);
  const titleOp   = fadeIn(frame, 18);
  const titleY    = slideUp(frame, 18);
  const subOp     = fadeIn(frame, 30);
  const periodOp  = fadeIn(frame, 8);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />

      {data.period && (
        <div
          style={{
            position: "absolute",
            top: 72,
            right: PAD_X,
            opacity: periodOp,
            background: `${accent}18`,
            border: `1px solid ${accent}44`,
            borderRadius: 50,
            padding: "10px 24px",
            fontSize: 20,
            fontWeight: 600,
            color: theme === "light" ? accent : WHITE,
            letterSpacing: 0.5,
          }}
        >
          {data.period}
        </div>
      )}

      <ContentZone center>
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, marginBottom: 28 }}>
          <Img src={staticFile("logo.webp")} style={{ width: 180, height: "auto", objectFit: "contain" }} />
        </div>

        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontSize: 58,
            fontWeight: 900,
            color: t.text,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            marginBottom: data.subtitle ? 20 : 0,
          }}
        >
          {data.title}
        </div>

        {data.subtitle && (
          <div style={{ opacity: subOp, fontSize: 30, fontWeight: 500, color: t.textSub, lineHeight: 1.4, marginBottom: 28 }}>
            {data.subtitle}
          </div>
        )}

        <div
          style={{
            width: easeOut(frame, 20, 50, 0, 160),
            height: 4,
            background: `linear-gradient(90deg, ${accent}, ${FUSCHIA})`,
            borderRadius: 2,
            marginTop: data.subtitle ? 0 : 24,
          }}
        />
      </ContentZone>

      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: fadeIn(frame, 40),
          fontSize: 18,
          fontWeight: 600,
          color: t.textMuted,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        socialcognitive.com
      </div>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatHeroScene
// ─────────────────────────────────────────────────────────────────────────────

function getStatHeroData(s: Sequence): StatHeroData {
  const d = s.sceneData as Record<string, unknown>;
  return {
    value:          typeof d.value === "string" ? d.value : String(d.value ?? "0"),
    label:          typeof d.label === "string" ? d.label : "",
    icon:           typeof d.icon === "string" ? d.icon : undefined,
    change:         typeof d.change === "string" ? d.change : undefined,
    changePositive: typeof d.changePositive === "boolean" ? d.changePositive : true,
    context:        typeof d.context === "string" ? d.context : undefined,
    accentColor:    typeof d.accentColor === "string" ? d.accentColor : PURPLE,
  };
}

export function StatHeroScene({ sequence }: { sequence: Sequence }) {
  const frame  = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const data   = getStatHeroData(sequence);
  const theme  = getTheme(sequence.sceneData);
  const t      = THEMES[theme];
  const accent = data.accentColor ?? PURPLE;

  const iconS      = spr(frame, 0, { damping: 12, stiffness: 90 });
  const iconScale  = interpolate(iconS, [0, 1], [0.3, 1]);
  const iconOp     = interpolate(iconS, [0, 1], [0, 1]);
  const valueOp    = fadeIn(frame, 10);
  const valueScale = interpolate(spr(frame, 10, { damping: 10 }), [0, 1], [0.7, 1]);
  const labelOp    = fadeIn(frame, 22);
  const labelY     = slideUp(frame, 22);
  const changeOp   = fadeIn(frame, 32);
  const contextOp  = fadeIn(frame, 40);
  const fadeOutOp  = interpolate(frame, [durationInFrames - 15, durationInFrames - 3], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />
      <ContentZone center style={{ gap: 24, opacity: fadeOutOp }}>
        {data.icon && (
          <div
            style={{
              opacity: iconOp,
              transform: `scale(${iconScale})`,
              background: `${accent}18`,
              border: `1.5px solid ${accent}44`,
              borderRadius: 32,
              padding: 28,
              boxShadow: `0 0 60px ${accent}33`,
            }}
          >
            <ScIcon icon={data.icon} size={80} color={accent} />
          </div>
        )}

        <div
          style={{
            opacity: valueOp,
            transform: `scale(${valueScale})`,
            fontSize: 144,
            fontWeight: 900,
            color: theme === "light" ? accent : WHITE,
            lineHeight: 1,
            letterSpacing: -4,
            textShadow: `0 0 80px ${accent}33`,
          }}
        >
          {data.value}
        </div>

        <div style={{ opacity: labelOp, transform: `translateY(${labelY}px)`, fontSize: 34, fontWeight: 600, color: t.textSub, letterSpacing: 0.3 }}>
          {data.label}
        </div>

        {data.change && (
          <div style={{ opacity: changeOp }}>
            <ChangeBadge change={data.change} positive={data.changePositive !== false} />
          </div>
        )}

        {data.context && (
          <div style={{ opacity: contextOp, fontSize: 22, color: t.textMuted, fontWeight: 500 }}>
            {data.context}
          </div>
        )}
      </ContentZone>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatGridScene
// ─────────────────────────────────────────────────────────────────────────────

function getStatGridData(s: Sequence): StatGridData {
  const d = s.sceneData as Record<string, unknown>;
  return {
    title:  typeof d.title === "string" ? d.title : undefined,
    period: typeof d.period === "string" ? d.period : undefined,
    items:  Array.isArray(d.items) ? d.items : [],
  };
}

export function StatGridScene({ sequence }: { sequence: Sequence }) {
  const frame  = useCurrentFrame();
  const data   = getStatGridData(sequence);
  const theme  = getTheme(sequence.sceneData);
  const t      = THEMES[theme];
  const items  = (data.items ?? []).slice(0, 4);
  const cols   = items.length <= 2 ? items.length : 2;

  const d        = sequence.sceneData as Record<string, unknown>;
  const subtitle = typeof d.subtitle === "string" ? d.subtitle : data.period;

  const titleOp = fadeIn(frame, 0);
  const titleY  = slideUp(frame, 0);
  const COLORS  = [PURPLE, FUSCHIA, "#7c6fe8", "#e8398e"];

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg theme={theme} />
      <ContentZone style={{ gap: 28 }}>
        <SceneTitle title={data.title} subtitle={subtitle} op={titleOp} ty={titleY} theme={theme} />

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20, alignContent: "center" }}>
          {items.map((item: Record<string, unknown>, i: number) => {
            const cardS  = spr(frame, 10 + i * 8);
            const cardOp = interpolate(cardS, [0, 1], [0, 1]);
            const cardY  = interpolate(cardS, [0, 1], [40, 0]);
            const accent = typeof item.color === "string" ? item.color : COLORS[i % COLORS.length];

            return (
              <GlassCard
                key={i}
                accentColor={accent}
                theme={theme}
                style={{ opacity: cardOp, transform: `translateY(${cardY}px)`, display: "flex", flexDirection: "column", gap: 16, justifyContent: "center" }}
              >
                {typeof item.icon === "string" && (
                  <div style={{ background: `${accent}18`, border: `1px solid ${accent}33`, borderRadius: 16, padding: 14, width: "fit-content" }}>
                    <ScIcon icon={item.icon} size={36} color={accent} />
                  </div>
                )}
                <div style={{ fontSize: 64, fontWeight: 900, color: theme === "light" ? accent : WHITE, lineHeight: 1, letterSpacing: -2 }}>
                  {String(item.value ?? "")}
                </div>
                <div style={{ fontSize: 22, fontWeight: 500, color: t.textSub }}>
                  {String(item.label ?? "")}
                </div>
                {typeof item.change === "string" && (
                  <ChangeBadge change={item.change} positive={item.changePositive !== false} />
                )}
              </GlassCard>
            );
          })}
        </div>
      </ContentZone>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BarChartScene
// ─────────────────────────────────────────────────────────────────────────────

function getBarChartData(s: Sequence): BarChartData {
  const d = s.sceneData as Record<string, unknown>;
  return {
    title:    typeof d.title === "string" ? d.title : undefined,
    subtitle: typeof d.subtitle === "string" ? d.subtitle : undefined,
    bars:     Array.isArray(d.bars) ? d.bars : [],
    unit:     typeof d.unit === "string" ? d.unit : "",
    maxValue: typeof d.maxValue === "number" ? d.maxValue : undefined,
  };
}

export function BarChartScene({ sequence }: { sequence: Sequence }) {
  const frame  = useCurrentFrame();
  const data   = getBarChartData(sequence);
  const theme  = getTheme(sequence.sceneData);
  const t      = THEMES[theme];
  const bars   = (data.bars ?? []).slice(0, 7);
  const maxVal = data.maxValue ?? Math.max(...bars.map((b: Record<string, unknown>) => Number(b.value ?? 0)), 1);
  const unit   = data.unit ?? "";

  const CHART_HEIGHT = 400;
  const COLORS = [PURPLE, FUSCHIA, "#7c6fe8", "#e8398e", "#9f9de8", "#f06090", PURPLE];

  const titleOp = fadeIn(frame, 0);
  const titleY  = slideUp(frame, 0);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg theme={theme} />
      <ContentZone style={{ gap: 28 }}>
        <SceneTitle title={data.title} subtitle={data.subtitle} op={titleOp} ty={titleY} theme={theme} />

        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 16, position: "relative" }}>
          {/* Grid lines */}
          <div style={{ position: "absolute", inset: 0, bottom: 52 }}>
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <div key={ratio} style={{ position: "absolute", bottom: `${ratio * 100}%`, left: 0, right: 0, height: 1, background: t.gridLine }} />
            ))}
          </div>

          {bars.map((bar: Record<string, unknown>, i: number) => {
            const val      = Number(bar.value ?? 0);
            const progress = easeOut(frame, 15 + i * 5, 50 + i * 5, 0, 1);
            const heightPx = (val / maxVal) * CHART_HEIGHT * progress;
            const color    = typeof bar.color === "string" ? bar.color : COLORS[i % COLORS.length];
            const labelOp  = fadeIn(frame, 35 + i * 5);

            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, height: CHART_HEIGHT + 60, justifyContent: "flex-end" }}>
                <div style={{ opacity: labelOp, fontSize: 20, fontWeight: 800, color: theme === "light" ? color : WHITE, marginBottom: 6 }}>
                  {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val}{unit}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: heightPx,
                    background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
                    borderRadius: "8px 8px 0 0",
                    boxShadow: `0 0 24px ${color}44`,
                    minHeight: progress > 0 ? 2 : 0,
                  }}
                />
                <div style={{ fontSize: 18, fontWeight: 600, color: t.textSub, textAlign: "center", opacity: labelOp, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {String(bar.label ?? "")}
                </div>
              </div>
            );
          })}
        </div>
      </ContentZone>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LineChartScene
// ─────────────────────────────────────────────────────────────────────────────

function getLineChartData(s: Sequence): LineChartData {
  const d = s.sceneData as Record<string, unknown>;
  return {
    title:    typeof d.title === "string" ? d.title : undefined,
    subtitle: typeof d.subtitle === "string" ? d.subtitle : undefined,
    points:   Array.isArray(d.points) ? d.points : [],
    unit:     typeof d.unit === "string" ? d.unit : "",
    color:    typeof d.color === "string" ? d.color : PURPLE,
  };
}

export function LineChartScene({ sequence }: { sequence: Sequence }) {
  const frame  = useCurrentFrame();
  const data   = getLineChartData(sequence);
  const theme  = getTheme(sequence.sceneData);
  const t      = THEMES[theme];
  const pts    = (data.points ?? []).slice(0, 12);
  const color  = data.color ?? PURPLE;
  const unit   = data.unit ?? "";

  const W = 960, H = 420, PL = 24, PR = 24, PT = 28, PB = 52;

  const maxVal = Math.max(...pts.map((p: Record<string, unknown>) => Number(p.value ?? 0)), 1);
  const minVal = Math.min(...pts.map((p: Record<string, unknown>) => Number(p.value ?? 0)), 0);
  const range  = maxVal - minVal || 1;

  const toX = (i: number) => PL + (i / Math.max(pts.length - 1, 1)) * (W - PL - PR);
  const toY = (v: number) => PT + (1 - (v - minVal) / range) * (H - PT - PB);

  const svgPoints = pts.map((p: Record<string, unknown>, i: number) => `${toX(i)},${toY(Number(p.value ?? 0))}`).join(" ");

  const totalLength = pts.reduce((acc: number, p: Record<string, unknown>, i: number) => {
    if (i === 0) return 0;
    const prev = pts[i - 1] as Record<string, unknown>;
    const dx = toX(i) - toX(i - 1);
    const dy = toY(Number(p.value ?? 0)) - toY(Number(prev.value ?? 0));
    return acc + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  const drawProgress = easeOut(frame, 15, 65, 0, 1);
  const dashOffset   = totalLength * (1 - drawProgress);
  const titleOp      = fadeIn(frame, 0);
  const titleY       = slideUp(frame, 0);

  // Area fill color for light theme uses a darker tint
  const areaColor = theme === "light" ? color : color;

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={color} theme={theme} />
      <ContentZone style={{ gap: 28 }}>
        <SceneTitle title={data.title} subtitle={data.subtitle} op={titleOp} ty={titleY} theme={theme} />

        <div style={{ flex: 1 }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
              <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={areaColor} stopOpacity={theme === "light" ? "0.18" : "0.35"} />
                <stop offset="100%" stopColor={areaColor} stopOpacity="0.01" />
              </linearGradient>
              <clipPath id="lineClip">
                <rect x="0" y="0" width={W * drawProgress} height={H} />
              </clipPath>
            </defs>

            {[0.25, 0.5, 0.75].map((r) => (
              <line key={r} x1={PL} y1={PT + r * (H - PT - PB)} x2={W - PR} y2={PT + r * (H - PT - PB)} stroke={t.gridLine} strokeWidth={1} />
            ))}

            {pts.length > 1 && (
              <polygon
                points={`${svgPoints} ${toX(pts.length - 1)},${H - PB} ${toX(0)},${H - PB}`}
                fill="url(#lineArea)"
                clipPath="url(#lineClip)"
              />
            )}
            {pts.length > 1 && (
              <polyline points={svgPoints} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={totalLength} strokeDashoffset={dashOffset} />
            )}

            {pts.map((p: Record<string, unknown>, i: number) => {
              const px  = toX(i);
              const py  = toY(Number(p.value ?? 0));
              const pOp = easeOut(frame, 15 + (i / pts.length) * 45, 30 + (i / pts.length) * 45, 0, 1);
              return (
                <g key={i}>
                  <circle cx={px} cy={py} r={9} fill={color} opacity={pOp} />
                  <circle cx={px} cy={py} r={4} fill={theme === "light" ? WHITE : WHITE} opacity={pOp} />
                  <text x={px} y={H - 12} textAnchor="middle" fill={t.textSub} fontSize={16} fontWeight={500} fillOpacity={0.8}>
                    {String(p.label ?? "")}
                  </text>
                  {i === pts.length - 1 && (
                    <text x={px} y={py - 18} textAnchor="middle" fill={color} fontSize={18} fontWeight={800} opacity={pOp}>
                      {Number(p.value ?? 0) >= 1000 ? `${(Number(p.value ?? 0) / 1000).toFixed(1)}K` : String(p.value ?? "")}{unit}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </ContentZone>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DonutChartScene
// ─────────────────────────────────────────────────────────────────────────────

function getDonutChartData(s: Sequence): DonutChartData {
  const d = s.sceneData as Record<string, unknown>;
  return {
    title:       typeof d.title === "string" ? d.title : undefined,
    segments:    Array.isArray(d.segments) ? d.segments : [],
    centerLabel: typeof d.centerLabel === "string" ? d.centerLabel : undefined,
    centerValue: typeof d.centerValue === "string" ? d.centerValue : undefined,
  };
}

export function DonutChartScene({ sequence }: { sequence: Sequence }) {
  const frame  = useCurrentFrame();
  const data   = getDonutChartData(sequence);
  const theme  = getTheme(sequence.sceneData);
  const t      = THEMES[theme];
  const segs   = (data.segments ?? []).slice(0, 6);

  const d        = sequence.sceneData as Record<string, unknown>;
  const subtitle = typeof d.subtitle === "string" ? d.subtitle : undefined;

  const DONUT_COLORS = [PURPLE, FUSCHIA, "#7c6fe8", "#e8398e", "#4ade80", "#facc15"];
  const R = 180, SW = 52, CX = 220, CY = 220;
  const circumference = 2 * Math.PI * R;
  const total = segs.reduce((acc: number, s: Record<string, unknown>) => acc + Number(s.value ?? 0), 0) || 1;

  const overallProgress = easeOut(frame, 10, 65, 0, 1);
  const titleOp = fadeIn(frame, 0);
  const titleY  = slideUp(frame, 0);

  let offset = 0;
  const segmentEls = segs.map((seg: Record<string, unknown>, i: number) => {
    const ratio     = Number(seg.value ?? 0) / total;
    const arcLen    = ratio * circumference * overallProgress;
    const color     = typeof seg.color === "string" ? seg.color : DONUT_COLORS[i % DONUT_COLORS.length];
    const dashArray = `${arcLen} ${circumference - arcLen}`;
    const rotate    = -90 + (offset / total) * 360;
    offset += Number(seg.value ?? 0);
    return { dashArray, rotate, color, ratio, seg };
  });

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg theme={theme} />
      <ContentZone style={{ gap: 28 }}>
        <SceneTitle title={data.title} subtitle={subtitle} op={titleOp} ty={titleY} theme={theme} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 52 }}>
          {/* Donut SVG */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <svg width={CX * 2} height={CY * 2} style={{ overflow: "visible" }}>
              {segmentEls.map(({ dashArray, rotate, color }, i) => (
                <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={SW}
                  strokeDasharray={dashArray} strokeDashoffset={0} strokeLinecap="butt"
                  transform={`rotate(${rotate} ${CX} ${CY})`}
                  style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}
                />
              ))}
              <circle cx={CX} cy={CY} r={R - SW / 2 - 10} fill={t.bg} />
            </svg>

            {/* Center text */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", opacity: overallProgress }}>
              {data.centerValue && (
                <div style={{ fontSize: 44, fontWeight: 900, color: t.text, lineHeight: 1 }}>{data.centerValue}</div>
              )}
              {data.centerLabel && (
                <div style={{ fontSize: 18, fontWeight: 500, color: t.textMuted, marginTop: 6 }}>{data.centerLabel}</div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            {segmentEls.map(({ seg, color, ratio }, i) => {
              const legOp = fadeIn(frame, 20 + i * 7);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, opacity: legOp }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 10px ${color}88` }} />
                  <div style={{ flex: 1, fontSize: 22, fontWeight: 600, color: t.text }}>{String(seg.label ?? "")}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{Math.round(ratio * 100)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </ContentZone>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ComparisonScene
// ─────────────────────────────────────────────────────────────────────────────

function getComparisonData(s: Sequence): ComparisonData {
  const d = s.sceneData as Record<string, unknown>;
  return {
    title:   typeof d.title === "string" ? d.title : undefined,
    period:  typeof d.period === "string" ? d.period : undefined,
    labelA:  typeof d.labelA === "string" ? d.labelA : "A",
    labelB:  typeof d.labelB === "string" ? d.labelB : "B",
    metrics: Array.isArray(d.metrics) ? d.metrics : [],
  };
}

export function ComparisonScene({ sequence }: { sequence: Sequence }) {
  const frame   = useCurrentFrame();
  const data    = getComparisonData(sequence);
  const theme   = getTheme(sequence.sceneData);
  const t       = THEMES[theme];
  const metrics = (data.metrics ?? []).slice(0, 5);

  const d        = sequence.sceneData as Record<string, unknown>;
  const subtitle = typeof d.subtitle === "string" ? d.subtitle : data.period;

  const titleOp  = fadeIn(frame, 0);
  const titleY   = slideUp(frame, 0);
  const headerOp = fadeIn(frame, 8);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg theme={theme} />
      <ContentZone style={{ gap: 24 }}>
        <SceneTitle title={data.title} subtitle={subtitle} op={titleOp} ty={titleY} theme={theme} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px 120px",
            gap: 16,
            opacity: headerOp,
            borderBottom: `1.5px solid ${theme === "light" ? PURPLE + "22" : "rgba(255,255,255,0.1)"}`,
            paddingBottom: 16,
          }}
        >
          <div style={{ fontSize: 20, color: t.textMuted, fontWeight: 600 }}>Métrica</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: PURPLE, textAlign: "center" }}>{data.labelA}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: FUSCHIA, textAlign: "center" }}>{data.labelB}</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {metrics.map((m: Record<string, unknown>, i: number) => {
            const rowOp = fadeIn(frame, 18 + i * 7);
            const rowY  = slideUp(frame, 18 + i * 7, 24);
            const aWins = m.aWins !== undefined ? Boolean(m.aWins) : Number(m.valueA ?? 0) >= Number(m.valueB ?? 0);
            const unit  = typeof m.unit === "string" ? m.unit : "";

            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 120px",
                  gap: 16,
                  opacity: rowOp,
                  transform: `translateY(${rowY}px)`,
                  background: t.rowCard,
                  border: `1.5px solid ${t.rowBorder}`,
                  borderRadius: 16,
                  padding: "20px 24px",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 500, color: t.textSub }}>{String(m.label ?? "")}</div>
                <div style={{ textAlign: "center", fontSize: 26, fontWeight: 900, color: aWins ? PURPLE : t.textMuted, ...(aWins ? { textShadow: `0 0 24px ${PURPLE}55` } : {}) }}>
                  {String(m.valueA ?? "")}{unit}
                </div>
                <div style={{ textAlign: "center", fontSize: 26, fontWeight: 900, color: !aWins ? FUSCHIA : t.textMuted, ...(!aWins ? { textShadow: `0 0 24px ${FUSCHIA}55` } : {}) }}>
                  {String(m.valueB ?? "")}{unit}
                </div>
              </div>
            );
          })}
        </div>
      </ContentZone>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LeaderboardScene
// ─────────────────────────────────────────────────────────────────────────────

function getLeaderboardData(s: Sequence): LeaderboardData {
  const d = s.sceneData as Record<string, unknown>;
  return {
    title:    typeof d.title === "string" ? d.title : undefined,
    subtitle: typeof d.subtitle === "string" ? d.subtitle : undefined,
    items:    Array.isArray(d.items) ? d.items : [],
    unit:     typeof d.unit === "string" ? d.unit : "",
  };
}

export function LeaderboardScene({ sequence }: { sequence: Sequence }) {
  const frame  = useCurrentFrame();
  const data   = getLeaderboardData(sequence);
  const theme  = getTheme(sequence.sceneData);
  const t      = THEMES[theme];
  const items  = (data.items ?? []).slice(0, 6);
  const unit   = data.unit ?? "";

  const maxNumVal = Math.max(...items.map((it: Record<string, unknown>) => Number(it.value ?? 0)), 1);
  const POSITION_COLORS = [PURPLE, FUSCHIA, "#7c6fe8", theme === "light" ? DARK : WHITE, theme === "light" ? DARK : WHITE, theme === "light" ? DARK : WHITE];

  const titleOp = fadeIn(frame, 0);
  const titleY  = slideUp(frame, 0);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg theme={theme} />
      <ContentZone style={{ gap: 24 }}>
        <SceneTitle title={data.title} subtitle={data.subtitle} op={titleOp} ty={titleY} theme={theme} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item: Record<string, unknown>, i: number) => {
            const rowS    = spr(frame, 10 + i * 8);
            const rowOp   = interpolate(rowS, [0, 1], [0, 1]);
            const rowX    = interpolate(rowS, [0, 1], [80, 0]);
            const color   = POSITION_COLORS[i] ?? (theme === "light" ? DARK : WHITE);
            const numVal  = Number(item.value ?? 0);
            const barProg = easeOut(frame, 20 + i * 7, 55 + i * 7, 0, 1);
            const barWidth = `${(numVal / maxNumVal) * 100 * barProg}%`;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  opacity: rowOp,
                  transform: `translateX(${rowX}px)`,
                  background: i < 3 ? `${color}0e` : t.rowCard,
                  border: `1.5px solid ${i < 3 ? color + "30" : t.rowBorder}`,
                  borderRadius: 18,
                  padding: "18px 24px",
                }}
              >
                <div style={{ width: 36, fontSize: 24, fontWeight: 900, color, textAlign: "center", flexShrink: 0, ...(i < 3 ? { textShadow: `0 0 20px ${color}88` } : {}) }}>
                  {i + 1}
                </div>
                {typeof item.icon === "string" && (
                  <ScIcon icon={item.icon} size={26} color={i < 3 ? color : t.textMuted} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: i < 3 ? (theme === "light" ? DARK : WHITE) : t.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {String(item.label ?? "")}
                  </div>
                  {typeof item.sublabel === "string" && (
                    <div style={{ fontSize: 16, color: t.textMuted, marginTop: 3 }}>{item.sublabel}</div>
                  )}
                </div>
                <div style={{ width: 100, height: 6, background: `${color}20`, borderRadius: 3, flexShrink: 0, overflow: "hidden" }}>
                  <div style={{ width: barWidth, height: "100%", background: color, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: i < 3 ? color : t.textSub, flexShrink: 0, minWidth: 80, textAlign: "right" }}>
                  {numVal >= 1000000 ? `${(numVal / 1000000).toFixed(1)}M` : numVal >= 1000 ? `${(numVal / 1000).toFixed(1)}K` : String(item.value ?? "")}{unit}
                </div>
              </div>
            );
          })}
        </div>
      </ContentZone>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InsightScene
// ─────────────────────────────────────────────────────────────────────────────

function getInsightData(s: Sequence): InsightData {
  const d = s.sceneData as Record<string, unknown>;
  return {
    insight:     typeof d.insight === "string" ? d.insight : "",
    stat:        typeof d.stat === "string" ? d.stat : undefined,
    statLabel:   typeof d.statLabel === "string" ? d.statLabel : undefined,
    icon:        typeof d.icon === "string" ? d.icon : undefined,
    source:      typeof d.source === "string" ? d.source : undefined,
    accentColor: typeof d.accentColor === "string" ? d.accentColor : PURPLE,
  };
}

export function InsightScene({ sequence }: { sequence: Sequence }) {
  const frame  = useCurrentFrame();
  const data   = getInsightData(sequence);
  const theme  = getTheme(sequence.sceneData);
  const t      = THEMES[theme];
  const accent = data.accentColor ?? PURPLE;

  const d        = sequence.sceneData as Record<string, unknown>;
  const subtitle = typeof d.subtitle === "string" ? d.subtitle : undefined;

  const iconOp    = fadeIn(frame, 0, 15);
  const iconScale = interpolate(spr(frame, 0, { damping: 12 }), [0, 1], [0.5, 1]);
  const textOp    = fadeIn(frame, 14);
  const textY     = slideUp(frame, 14, 36);
  const statOp    = fadeIn(frame, 28);
  const sourceOp  = fadeIn(frame, 38);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />

      <ContentZone center style={{ gap: 28 }}>
        {subtitle && (
          <div style={{ opacity: textOp, fontSize: 22, fontWeight: 600, color: t.textMuted, letterSpacing: 1.5, textTransform: "uppercase" }}>
            {subtitle}
          </div>
        )}

        {data.icon && (
          <div style={{ opacity: iconOp, transform: `scale(${iconScale})`, background: `${accent}18`, border: `1.5px solid ${accent}44`, borderRadius: 28, padding: 24, boxShadow: `0 0 60px ${accent}33` }}>
            <ScIcon icon={data.icon} size={64} color={accent} />
          </div>
        )}

        {data.stat && (
          <div style={{ opacity: statOp }}>
            <div style={{ fontSize: 96, fontWeight: 900, color: accent, lineHeight: 1, textShadow: `0 0 60px ${accent}44` }}>
              {data.stat}
            </div>
            {data.statLabel && (
              <div style={{ fontSize: 24, color: t.textSub, marginTop: 8, fontWeight: 500 }}>{data.statLabel}</div>
            )}
          </div>
        )}

        <div style={{ opacity: textOp, transform: `translateY(${textY}px)`, fontSize: 38, fontWeight: 700, color: t.text, lineHeight: 1.4 }}>
          {data.insight}
        </div>
      </ContentZone>

      {data.source && (
        <div style={{ position: "absolute", bottom: 72, left: 0, right: 0, textAlign: "center", opacity: sourceOp, fontSize: 18, fontWeight: 500, color: t.textMuted, letterSpacing: 0.5 }}>
          {data.source}
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScOutroScene
// ─────────────────────────────────────────────────────────────────────────────

function getScOutroData(s: Sequence): ScOutroData {
  const d = s.sceneData as Record<string, unknown>;
  return {
    tagline:     typeof d.tagline === "string" ? d.tagline : "Inteligencia que convierte",
    website:     typeof d.website === "string" ? d.website : "socialcognitive.com",
    handle:      typeof d.handle === "string" ? d.handle : "@socialcognitive",
    ctaText:     typeof d.ctaText === "string" ? d.ctaText : "Agenda tu consulta gratis",
    accentColor: typeof d.accentColor === "string" ? d.accentColor : PURPLE,
  };
}

export function ScOutroScene({ sequence }: { sequence: Sequence }) {
  const frame  = useCurrentFrame();
  const data   = getScOutroData(sequence);
  const theme  = getTheme(sequence.sceneData);
  const t      = THEMES[theme];
  const accent = data.accentColor ?? PURPLE;

  const logoS     = spr(frame, 0, { damping: 10, stiffness: 80 });
  const logoScale = interpolate(logoS, [0, 1], [0.5, 1]);
  const logoOp    = interpolate(logoS, [0, 1], [0, 1]);
  const tagOp     = fadeIn(frame, 18);
  const tagY      = slideUp(frame, 18);
  const handleOp  = fadeIn(frame, 30);
  const ctaS      = spr(frame, 40, { damping: 12 });
  const ctaScale  = interpolate(ctaS, [0, 1], [0.85, 1]);
  const ctaOp     = interpolate(ctaS, [0, 1], [0, 1]);
  const pulse     = interpolate(Math.sin(frame * 0.12), [-1, 1], [0.4, 1]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />

      <ContentZone center style={{ gap: 24 }}>
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})` }}>
          <Img src={staticFile("logo.webp")} style={{ width: 200, height: "auto", objectFit: "contain" }} />
        </div>

        <div style={{ opacity: tagOp, transform: `translateY(${tagY}px)`, fontSize: 34, fontWeight: 600, color: t.textSub, lineHeight: 1.3 }}>
          {data.tagline}
        </div>

        <div style={{ width: easeOut(frame, 15, 45, 0, 160), height: 3, background: `linear-gradient(90deg, ${accent}, ${FUSCHIA})`, borderRadius: 2 }} />

        {data.website && (
          <div style={{ opacity: handleOp, fontSize: 28, fontWeight: 700, color: t.text }}>{data.website}</div>
        )}
        {data.handle && (
          <div style={{ opacity: handleOp, fontSize: 26, fontWeight: 600, color: FUSCHIA }}>{data.handle}</div>
        )}

        {data.ctaText && (
          <div
            style={{
              opacity: ctaOp,
              transform: `scale(${ctaScale})`,
              marginTop: 12,
              background: `linear-gradient(135deg, ${accent}, ${FUSCHIA})`,
              borderRadius: 70,
              padding: "22px 52px",
              fontSize: 24,
              fontWeight: 800,
              color: WHITE,
              letterSpacing: 0.3,
              boxShadow: `0 0 ${50 * pulse}px ${accent}66, 0 0 ${24 * pulse}px ${FUSCHIA}44`,
            }}
          >
            {data.ctaText}
          </div>
        )}
      </ContentZone>
    </AbsoluteFill>
  );
}
