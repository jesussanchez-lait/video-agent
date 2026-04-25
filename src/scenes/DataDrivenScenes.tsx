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
    textSub:     "rgba(255,255,255,0.80)",
    textMuted:   "rgba(255,255,255,0.45)",
    card:        "rgba(77,77,95,0.18)",
    cardBorder:  (accent: string) => `${accent}55`,
    rowCard:     "rgba(77,77,95,0.18)",
    rowBorder:   "rgba(255,255,255,0.09)",
    gridLine:    "rgba(255,255,255,0.06)",
    blobPrimary: (c: string) => `${c}35`,
    blobSecondary: `${FUSCHIA}28`,
  },
  light: {
    bg:          WHITE,
    text:        DARK,
    textSub:     "rgba(16,23,29,0.70)",
    textMuted:   "rgba(16,23,29,0.42)",
    card:        "rgba(92,89,202,0.07)",
    cardBorder:  (accent: string) => `${accent}38`,
    rowCard:     "rgba(92,89,202,0.06)",
    rowBorder:   "rgba(92,89,202,0.16)",
    gridLine:    "rgba(16,23,29,0.07)",
    blobPrimary: (c: string) => `${c}22`,
    blobSecondary: `${FUSCHIA}18`,
  },
} as const satisfies Record<ThemeKey, object>;

function getTheme(sceneData: unknown): ThemeKey {
  const d = sceneData as Record<string, unknown>;
  return d?.theme === "light" ? "light" : "dark";
}

// ─── Layout — full-canvas 1080 × 1920 ────────────────────────────────────────
// Content occupies the central 82% of height. Top/bottom strips hold branding.

const PAD_X        = 56;
const ZONE_TOP     = "9%";   // 172px — room for top badge
const ZONE_HEIGHT  = "82%";  // 1574px — fills the reel
const STRIP_TOP    = 60;     // top badge y-position
const STRIP_BOTTOM = 56;     // bottom watermark y-position

// ─── Animation helpers ────────────────────────────────────────────────────────

const spr = (frame: number, delay = 0, cfg: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({ frame: frame - delay, fps: 30, config: { damping: 14, stiffness: 110, ...cfg } });

const sprSmooth = (frame: number, delay = 0) =>
  spring({ frame: frame - delay, fps: 30, config: { damping: 200 } });

const fadeIn = (f: number, start: number, dur = 18) =>
  interpolate(f, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const slideUp = (f: number, start: number, distance = 60) =>
  interpolate(f, [start, start + 22], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const slideIn = (f: number, start: number, distance = 80) =>
  interpolate(f, [start, start + 22], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

const easeOut = (f: number, start: number, end: number, from: number, to: number) =>
  interpolate(f, [start, end], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const scaleIn = (frame: number, delay = 0) => {
  const s = spr(frame, delay, { damping: 12, stiffness: 100 });
  return interpolate(s, [0, 1], [0.55, 1]);
};

// ─── Shared background ────────────────────────────────────────────────────────

function SceneBg({ accentColor = PURPLE, theme = "dark" as ThemeKey }) {
  const t = THEMES[theme];
  const frame = useCurrentFrame();
  // Subtle slow drift animation for the blobs
  const drift = interpolate(frame, [0, 300], [0, 12], { extrapolateRight: "clamp" });
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: t.bg }} />
      {/* Primary accent blob — top-left, large */}
      <div
        style={{
          position: "absolute",
          top: -200 + drift,
          left: -180,
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${t.blobPrimary(accentColor)} 0%, transparent 68%)`,
          pointerEvents: "none",
        }}
      />
      {/* Fuschia blob — bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: -200 - drift * 0.5,
          right: -160,
          width: 760,
          height: 760,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${t.blobSecondary} 0%, transparent 68%)`,
          pointerEvents: "none",
        }}
      />
      {/* Subtle center glow */}
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}0a 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// ─── ContentZone — fills 82% of height ───────────────────────────────────────

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
        top: ZONE_TOP,
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
  glow = false,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accentColor?: string;
  theme?: ThemeKey;
  glow?: boolean;
}) {
  const t = THEMES[theme];
  return (
    <div
      style={{
        background: t.card,
        border: `2px solid ${t.cardBorder(accentColor)}`,
        borderRadius: 28,
        padding: "36px 40px",
        backdropFilter: theme === "dark" ? "blur(16px)" : undefined,
        boxShadow: glow ? `0 0 48px ${accentColor}22, 0 8px 32px rgba(0,0,0,0.18)` : "0 4px 24px rgba(0,0,0,0.10)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── ScIcon ───────────────────────────────────────────────────────────────────

function ScIcon({ icon, size = 40, color }: { icon: string; size?: number; color: string }) {
  if (!icon) return null;
  return <Icon icon={icon} style={{ width: size, height: size, color, display: "block" }} />;
}

// ─── AccentLine ──────────────────────────────────────────────────────────────

function AccentLine({ frame, delay = 0, accent = PURPLE, width = 200 }: {
  frame: number; delay?: number; accent?: string; width?: number;
}) {
  const w = easeOut(frame, delay, delay + 30, 0, width);
  return (
    <div style={{
      width: w,
      height: 5,
      background: `linear-gradient(90deg, ${accent}, ${FUSCHIA})`,
      borderRadius: 3,
    }} />
  );
}

// ─── SceneTitle ───────────────────────────────────────────────────────────────

function SceneTitle({
  title,
  subtitle,
  op = 1,
  ty = 0,
  center = false,
  theme = "dark" as ThemeKey,
  accentColor = PURPLE,
  frame = 0,
}: {
  title?: string;
  subtitle?: string;
  op?: number;
  ty?: number;
  center?: boolean;
  theme?: ThemeKey;
  accentColor?: string;
  frame?: number;
}) {
  if (!title && !subtitle) return null;
  const t = THEMES[theme];
  return (
    <div style={{ opacity: op, transform: `translateY(${ty}px)`, textAlign: center ? "center" : "left", marginBottom: 12 }}>
      {title && (
        <div style={{ fontSize: 68, fontWeight: 900, color: t.text, lineHeight: 1.05, letterSpacing: -2, marginBottom: subtitle ? 14 : 0 }}>
          {title}
        </div>
      )}
      {subtitle && (
        <div style={{ fontSize: 34, fontWeight: 500, color: t.textSub, lineHeight: 1.3, marginBottom: 6 }}>
          {subtitle}
        </div>
      )}
      <AccentLine frame={frame} delay={8} accent={accentColor} width={center ? 180 : 220} />
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
        gap: 8,
        background: `${color}1c`,
        border: `2px solid ${color}55`,
        borderRadius: 50,
        padding: "10px 24px",
        boxShadow: `0 0 20px ${color}22`,
      }}
    >
      <Icon icon={arrow} style={{ width: 22, height: 22, color }} />
      <span style={{ color, fontSize: 26, fontWeight: 800, letterSpacing: 0.3 }}>{change}</span>
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

  const logoS      = spr(frame, 0, { damping: 11, stiffness: 85 });
  const logoScale  = interpolate(logoS, [0, 1], [0.4, 1]);
  const logoOp     = interpolate(logoS, [0, 1], [0, 1]);
  const titleOp    = fadeIn(frame, 16);
  const titleY     = slideUp(frame, 16, 70);
  const subOp      = fadeIn(frame, 28, 20);
  const periodOp   = fadeIn(frame, 6, 15);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />

      {data.period && (
        <div
          style={{
            position: "absolute",
            top: STRIP_TOP,
            right: PAD_X,
            opacity: periodOp,
            background: theme === "dark" ? `${accent}22` : `${accent}15`,
            border: `2px solid ${accent}55`,
            borderRadius: 50,
            padding: "12px 30px",
            fontSize: 24,
            fontWeight: 700,
            color: theme === "light" ? accent : WHITE,
            letterSpacing: 0.5,
          }}
        >
          {data.period}
        </div>
      )}

      <ContentZone center>
        {/* Logo */}
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, marginBottom: 40 }}>
          <Img src={staticFile("logo.webp")} style={{ width: 220, height: "auto", objectFit: "contain" }} />
        </div>

        {/* Title */}
        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontSize: 76,
            fontWeight: 900,
            color: t.text,
            lineHeight: 1.0,
            letterSpacing: -2.5,
            marginBottom: data.subtitle ? 24 : 36,
          }}
        >
          {data.title}
        </div>

        {data.subtitle && (
          <div style={{
            opacity: subOp,
            fontSize: 38,
            fontWeight: 500,
            color: t.textSub,
            lineHeight: 1.4,
            marginBottom: 36,
          }}>
            {data.subtitle}
          </div>
        )}

        {/* Animated accent bar */}
        <AccentLine frame={frame} delay={22} accent={accent} width={220} />
      </ContentZone>

      <div
        style={{
          position: "absolute",
          bottom: STRIP_BOTTOM,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: fadeIn(frame, 36),
          fontSize: 22,
          fontWeight: 700,
          color: t.textMuted,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        socialcognitive.com
      </div>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatHeroScene  — el número más grande, impactante, en pantalla completa
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

  const iconS      = spr(frame, 0, { damping: 11, stiffness: 90 });
  const iconScale  = interpolate(iconS, [0, 1], [0.25, 1]);
  const iconOp     = interpolate(iconS, [0, 1], [0, 1]);

  const valueS     = spr(frame, 8, { damping: 12, stiffness: 95 });
  const valueScale = interpolate(valueS, [0, 1], [0.6, 1]);
  const valueOp    = interpolate(valueS, [0, 1], [0, 1]);

  const labelOp    = fadeIn(frame, 20);
  const labelY     = slideUp(frame, 20, 50);
  const changeOp   = fadeIn(frame, 30);
  const contextOp  = fadeIn(frame, 38);

  const fadeOutOp  = interpolate(frame, [durationInFrames - 18, durationInFrames - 4], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />
      <ContentZone center style={{ gap: 28, opacity: fadeOutOp }}>
        {data.icon && (
          <div
            style={{
              opacity: iconOp,
              transform: `scale(${iconScale})`,
              background: theme === "dark" ? `${accent}1e` : `${accent}18`,
              border: `2px solid ${accent}55`,
              borderRadius: 40,
              padding: 36,
              boxShadow: `0 0 80px ${accent}44`,
            }}
          >
            <ScIcon icon={data.icon} size={100} color={accent} />
          </div>
        )}

        {/* HUGE number — the hero moment */}
        <div
          style={{
            opacity: valueOp,
            transform: `scale(${valueScale})`,
            fontSize: 200,
            fontWeight: 900,
            color: theme === "light" ? accent : WHITE,
            lineHeight: 0.9,
            letterSpacing: -8,
            textShadow: `0 0 120px ${accent}44`,
          }}
        >
          {data.value}
        </div>

        <div style={{
          opacity: labelOp,
          transform: `translateY(${labelY}px)`,
          fontSize: 44,
          fontWeight: 700,
          color: t.textSub,
          letterSpacing: 0.2,
          textAlign: "center",
        }}>
          {data.label}
        </div>

        {data.change && (
          <div style={{ opacity: changeOp }}>
            <ChangeBadge change={data.change} positive={data.changePositive !== false} />
          </div>
        )}

        {data.context && (
          <div style={{ opacity: contextOp, fontSize: 28, color: t.textMuted, fontWeight: 500 }}>
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
  const accent   = typeof d.accentColor === "string" ? d.accentColor : PURPLE;

  const titleOp = fadeIn(frame, 0);
  const titleY  = slideUp(frame, 0);
  const COLORS  = [PURPLE, FUSCHIA, "#7c6fe8", "#e8398e"];

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />
      <ContentZone style={{ gap: 32 }}>
        <SceneTitle title={data.title} subtitle={subtitle} op={titleOp} ty={titleY} theme={theme} accentColor={accent} frame={frame} />

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24, alignContent: "center" }}>
          {items.map((item: Record<string, unknown>, i: number) => {
            const cardS  = spr(frame, 12 + i * 9, { damping: 12, stiffness: 95 });
            const cardOp = interpolate(cardS, [0, 1], [0, 1]);
            const cardY  = interpolate(cardS, [0, 1], [60, 0]);
            const itemAccent = typeof item.color === "string" ? item.color : COLORS[i % COLORS.length];

            return (
              <GlassCard
                key={i}
                accentColor={itemAccent}
                theme={theme}
                glow
                style={{
                  opacity: cardOp,
                  transform: `translateY(${cardY}px)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  justifyContent: "center",
                  flex: 1,
                }}
              >
                {typeof item.icon === "string" && (
                  <div style={{
                    background: `${itemAccent}1e`,
                    border: `1.5px solid ${itemAccent}44`,
                    borderRadius: 20,
                    padding: 18,
                    width: "fit-content",
                    boxShadow: `0 0 28px ${itemAccent}22`,
                  }}>
                    <ScIcon icon={item.icon} size={44} color={itemAccent} />
                  </div>
                )}
                <div style={{ fontSize: 88, fontWeight: 900, color: theme === "light" ? itemAccent : WHITE, lineHeight: 0.9, letterSpacing: -3 }}>
                  {String(item.value ?? "")}
                </div>
                <div style={{ fontSize: 28, fontWeight: 600, color: t.textSub, lineHeight: 1.2 }}>
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

  const d = sequence.sceneData as Record<string, unknown>;
  const accent = typeof d.accentColor === "string" ? d.accentColor : PURPLE;

  const CHART_HEIGHT = 560;
  const COLORS = [PURPLE, FUSCHIA, "#7c6fe8", "#e8398e", "#9f9de8", "#f06090", PURPLE];

  const titleOp = fadeIn(frame, 0);
  const titleY  = slideUp(frame, 0);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />
      <ContentZone style={{ gap: 32 }}>
        <SceneTitle title={data.title} subtitle={data.subtitle} op={titleOp} ty={titleY} theme={theme} accentColor={accent} frame={frame} />

        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 14, position: "relative" }}>
          {/* Grid lines */}
          <div style={{ position: "absolute", inset: 0, bottom: 60 }}>
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <div key={ratio} style={{ position: "absolute", bottom: `${ratio * 100}%`, left: 0, right: 0, height: 1, background: t.gridLine }} />
            ))}
          </div>

          {bars.map((bar: Record<string, unknown>, i: number) => {
            const val      = Number(bar.value ?? 0);
            const barSpring = spr(frame, 10 + i * 5, { damping: 18, stiffness: 90 });
            const heightPx = (val / maxVal) * CHART_HEIGHT * barSpring;
            const color    = typeof bar.color === "string" ? bar.color : COLORS[i % COLORS.length];
            const labelOp  = fadeIn(frame, 28 + i * 5);
            const isTop    = val === maxVal;

            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, height: CHART_HEIGHT + 72, justifyContent: "flex-end" }}>
                <div style={{ opacity: labelOp, fontSize: 26, fontWeight: 900, color: theme === "light" ? color : WHITE, marginBottom: 8 }}>
                  {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val}{unit}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: heightPx,
                    background: isTop
                      ? `linear-gradient(180deg, ${color} 0%, ${color}bb 100%)`
                      : `linear-gradient(180deg, ${color}dd 0%, ${color}88 100%)`,
                    borderRadius: "10px 10px 0 0",
                    boxShadow: isTop ? `0 0 40px ${color}66, 0 -4px 20px ${color}44` : `0 0 20px ${color}33`,
                    minHeight: barSpring > 0.01 ? 3 : 0,
                  }}
                />
                <div style={{ fontSize: 22, fontWeight: 700, color: t.textSub, textAlign: "center", opacity: labelOp, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

  const W = 968, H = 520, PL = 28, PR = 28, PT = 32, PB = 68;

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

  const drawProgress = easeOut(frame, 12, 60, 0, 1);
  const dashOffset   = totalLength * (1 - drawProgress);
  const titleOp      = fadeIn(frame, 0);
  const titleY       = slideUp(frame, 0);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={color} theme={theme} />
      <ContentZone style={{ gap: 32 }}>
        <SceneTitle title={data.title} subtitle={data.subtitle} op={titleOp} ty={titleY} theme={theme} accentColor={color} frame={frame} />

        <div style={{ flex: 1 }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
              <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={theme === "light" ? "0.22" : "0.42"} />
                <stop offset="100%" stopColor={color} stopOpacity="0.01" />
              </linearGradient>
              <clipPath id="lineClip">
                <rect x="0" y="0" width={W * drawProgress} height={H} />
              </clipPath>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {[0.25, 0.5, 0.75].map((r) => (
              <line key={r} x1={PL} y1={PT + r * (H - PT - PB)} x2={W - PR} y2={PT + r * (H - PT - PB)} stroke={t.gridLine} strokeWidth={1.5} />
            ))}

            {pts.length > 1 && (
              <polygon
                points={`${svgPoints} ${toX(pts.length - 1)},${H - PB} ${toX(0)},${H - PB}`}
                fill="url(#lineArea)"
                clipPath="url(#lineClip)"
              />
            )}
            {pts.length > 1 && (
              <polyline points={svgPoints} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={totalLength} strokeDashoffset={dashOffset} filter="url(#glow)" />
            )}

            {pts.map((p: Record<string, unknown>, i: number) => {
              const px  = toX(i);
              const py  = toY(Number(p.value ?? 0));
              const pOp = easeOut(frame, 12 + (i / pts.length) * 48, 28 + (i / pts.length) * 48, 0, 1);
              const isLast = i === pts.length - 1;
              return (
                <g key={i}>
                  <circle cx={px} cy={py} r={isLast ? 14 : 10} fill={color} opacity={pOp} style={{ filter: isLast ? `drop-shadow(0 0 12px ${color})` : undefined }} />
                  <circle cx={px} cy={py} r={isLast ? 6 : 4} fill={WHITE} opacity={pOp} />
                  <text x={px} y={H - 18} textAnchor="middle" fill={t.textSub} fontSize={20} fontWeight={600} fillOpacity={0.9}>
                    {String(p.label ?? "")}
                  </text>
                  {isLast && (
                    <text x={px} y={py - 24} textAnchor="middle" fill={color} fontSize={24} fontWeight={900} opacity={pOp}>
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
  const accent   = typeof d.accentColor === "string" ? d.accentColor : PURPLE;

  const DONUT_COLORS = [PURPLE, FUSCHIA, "#7c6fe8", "#e8398e", "#4ade80", "#facc15"];
  const R = 210, SW = 64, CX = 250, CY = 250;
  const circumference = 2 * Math.PI * R;
  const total = segs.reduce((acc: number, s: Record<string, unknown>) => acc + Number(s.value ?? 0), 0) || 1;

  const overallProgress = easeOut(frame, 8, 60, 0, 1);
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
      <SceneBg accentColor={accent} theme={theme} />
      <ContentZone style={{ gap: 32 }}>
        <SceneTitle title={data.title} subtitle={subtitle} op={titleOp} ty={titleY} theme={theme} accentColor={accent} frame={frame} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 60 }}>
          {/* Donut SVG — larger */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <svg width={CX * 2} height={CY * 2} style={{ overflow: "visible" }}>
              {segmentEls.map(({ dashArray, rotate, color }, i) => (
                <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={SW}
                  strokeDasharray={dashArray} strokeDashoffset={0} strokeLinecap="butt"
                  transform={`rotate(${rotate} ${CX} ${CY})`}
                  style={{ filter: `drop-shadow(0 0 14px ${color}77)` }}
                />
              ))}
              <circle cx={CX} cy={CY} r={R - SW / 2 - 12} fill={t.bg} />
            </svg>

            {/* Center text */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", opacity: overallProgress }}>
              {data.centerValue && (
                <div style={{ fontSize: 56, fontWeight: 900, color: t.text, lineHeight: 1 }}>{data.centerValue}</div>
              )}
              {data.centerLabel && (
                <div style={{ fontSize: 22, fontWeight: 600, color: t.textMuted, marginTop: 8 }}>{data.centerLabel}</div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            {segmentEls.map(({ seg, color, ratio }, i) => {
              const legOp = fadeIn(frame, 18 + i * 8);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, opacity: legOp }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 14px ${color}99` }} />
                  <div style={{ flex: 1, fontSize: 28, fontWeight: 600, color: t.text }}>{String(seg.label ?? "")}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color }}>{Math.round(ratio * 100)}%</div>
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
  const accent   = typeof d.accentColor === "string" ? d.accentColor : PURPLE;

  const titleOp  = fadeIn(frame, 0);
  const titleY   = slideUp(frame, 0);
  const headerOp = fadeIn(frame, 10);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />
      <ContentZone style={{ gap: 28 }}>
        <SceneTitle title={data.title} subtitle={subtitle} op={titleOp} ty={titleY} theme={theme} accentColor={accent} frame={frame} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px 140px",
            gap: 16,
            opacity: headerOp,
            borderBottom: `2px solid ${theme === "light" ? PURPLE + "28" : "rgba(255,255,255,0.12)"}`,
            paddingBottom: 18,
          }}
        >
          <div style={{ fontSize: 24, color: t.textMuted, fontWeight: 700 }}>Métrica</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: PURPLE, textAlign: "center" }}>{data.labelA}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: FUSCHIA, textAlign: "center" }}>{data.labelB}</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {metrics.map((m: Record<string, unknown>, i: number) => {
            const rowS  = spr(frame, 16 + i * 8, { damping: 14, stiffness: 100 });
            const rowOp = interpolate(rowS, [0, 1], [0, 1]);
            const rowX  = interpolate(rowS, [0, 1], [60, 0]);
            const aWins = m.aWins !== undefined ? Boolean(m.aWins) : Number(m.valueA ?? 0) >= Number(m.valueB ?? 0);
            const unit  = typeof m.unit === "string" ? m.unit : "";

            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 140px 140px",
                  gap: 16,
                  opacity: rowOp,
                  transform: `translateX(${rowX}px)`,
                  background: t.rowCard,
                  border: `2px solid ${t.rowBorder}`,
                  borderRadius: 20,
                  padding: "24px 28px",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 600, color: t.textSub }}>{String(m.label ?? "")}</div>
                <div style={{ textAlign: "center", fontSize: 32, fontWeight: 900, color: aWins ? PURPLE : t.textMuted, ...(aWins ? { textShadow: `0 0 28px ${PURPLE}66` } : {}) }}>
                  {String(m.valueA ?? "")}{unit}
                </div>
                <div style={{ textAlign: "center", fontSize: 32, fontWeight: 900, color: !aWins ? FUSCHIA : t.textMuted, ...(!aWins ? { textShadow: `0 0 28px ${FUSCHIA}66` } : {}) }}>
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

  const d = sequence.sceneData as Record<string, unknown>;
  const accent = typeof d.accentColor === "string" ? d.accentColor : PURPLE;

  const maxNumVal = Math.max(...items.map((it: Record<string, unknown>) => Number(it.value ?? 0)), 1);
  const POSITION_COLORS = [PURPLE, FUSCHIA, "#7c6fe8", theme === "light" ? DARK : WHITE, theme === "light" ? DARK : WHITE, theme === "light" ? DARK : WHITE];

  const titleOp = fadeIn(frame, 0);
  const titleY  = slideUp(frame, 0);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />
      <ContentZone style={{ gap: 28 }}>
        <SceneTitle title={data.title} subtitle={data.subtitle} op={titleOp} ty={titleY} theme={theme} accentColor={accent} frame={frame} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((item: Record<string, unknown>, i: number) => {
            const rowS    = spr(frame, 8 + i * 9, { damping: 13, stiffness: 100 });
            const rowOp   = interpolate(rowS, [0, 1], [0, 1]);
            const rowX    = interpolate(rowS, [0, 1], [100, 0]);
            const color   = POSITION_COLORS[i] ?? (theme === "light" ? DARK : WHITE);
            const numVal  = Number(item.value ?? 0);
            const barSpring = spr(frame, 18 + i * 8, { damping: 200 });
            const barWidth = `${(numVal / maxNumVal) * 100 * barSpring}%`;
            const isPodium = i < 3;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  opacity: rowOp,
                  transform: `translateX(${rowX}px)`,
                  background: isPodium ? `${color}12` : t.rowCard,
                  border: `2px solid ${isPodium ? color + "40" : t.rowBorder}`,
                  borderRadius: 22,
                  padding: "20px 28px",
                  boxShadow: isPodium ? `0 0 32px ${color}18` : undefined,
                }}
              >
                <div style={{ width: 42, fontSize: isPodium ? 32 : 26, fontWeight: 900, color, textAlign: "center", flexShrink: 0, ...(isPodium ? { textShadow: `0 0 24px ${color}aa` } : {}) }}>
                  {i + 1}
                </div>
                {typeof item.icon === "string" && (
                  <ScIcon icon={item.icon} size={30} color={isPodium ? color : t.textMuted} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: isPodium ? (theme === "light" ? DARK : WHITE) : t.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {String(item.label ?? "")}
                  </div>
                  {typeof item.sublabel === "string" && (
                    <div style={{ fontSize: 20, color: t.textMuted, marginTop: 4 }}>{item.sublabel}</div>
                  )}
                </div>
                <div style={{ width: 120, height: 8, background: `${color}22`, borderRadius: 4, flexShrink: 0, overflow: "hidden" }}>
                  <div style={{ width: barWidth, height: "100%", background: color, borderRadius: 4, boxShadow: isPodium ? `0 0 8px ${color}99` : undefined }} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: isPodium ? color : t.textSub, flexShrink: 0, minWidth: 100, textAlign: "right" }}>
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
// InsightScene  — texto impactante, centra toda la pantalla
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

  const iconS      = spr(frame, 0, { damping: 11, stiffness: 90 });
  const iconOp     = interpolate(iconS, [0, 1], [0, 1]);
  const iconScale  = interpolate(iconS, [0, 1], [0.4, 1]);

  const statS      = spr(frame, 12, { damping: 12, stiffness: 95 });
  const statScale  = interpolate(statS, [0, 1], [0.7, 1]);
  const statOp     = interpolate(statS, [0, 1], [0, 1]);

  const textOp     = fadeIn(frame, 22, 20);
  const textY      = slideUp(frame, 22, 50);
  const sourceOp   = fadeIn(frame, 36);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneBg accentColor={accent} theme={theme} />

      <ContentZone center style={{ gap: 32 }}>
        {subtitle && (
          <div style={{ opacity: fadeIn(frame, 4), fontSize: 26, fontWeight: 700, color: t.textMuted, letterSpacing: 2.5, textTransform: "uppercase" }}>
            {subtitle}
          </div>
        )}

        {data.icon && (
          <div style={{
            opacity: iconOp,
            transform: `scale(${iconScale})`,
            background: `${accent}1e`,
            border: `2px solid ${accent}55`,
            borderRadius: 36,
            padding: 32,
            boxShadow: `0 0 80px ${accent}44`,
          }}>
            <ScIcon icon={data.icon} size={88} color={accent} />
          </div>
        )}

        {data.stat && (
          <div style={{ opacity: statOp, transform: `scale(${statScale})`, textAlign: "center" }}>
            <div style={{ fontSize: 160, fontWeight: 900, color: accent, lineHeight: 0.9, textShadow: `0 0 100px ${accent}55, 0 0 40px ${accent}33` }}>
              {data.stat}
            </div>
            {data.statLabel && (
              <div style={{ fontSize: 36, color: t.textSub, marginTop: 16, fontWeight: 600 }}>{data.statLabel}</div>
            )}
          </div>
        )}

        <div style={{
          opacity: textOp,
          transform: `translateY(${textY}px)`,
          fontSize: 50,
          fontWeight: 800,
          color: t.text,
          lineHeight: 1.3,
          textAlign: "center",
          maxWidth: 920,
        }}>
          {data.insight}
        </div>
      </ContentZone>

      {data.source && (
        <div style={{ position: "absolute", bottom: STRIP_BOTTOM, left: 0, right: 0, textAlign: "center", opacity: sourceOp, fontSize: 22, fontWeight: 600, color: t.textMuted, letterSpacing: 0.5 }}>
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

  const { durationInFrames } = useVideoConfig();

  const logoS      = spr(frame, 0, { damping: 10, stiffness: 80 });
  const logoScale  = interpolate(logoS, [0, 1], [0.4, 1]);
  const logoOp     = interpolate(logoS, [0, 1], [0, 1]);
  const tagOp      = fadeIn(frame, 16, 18);
  const tagY       = slideUp(frame, 16, 60);
  const handleOp   = fadeIn(frame, 28, 18);
  const ctaS       = spr(frame, 40, { damping: 11, stiffness: 90 });
  const ctaScale   = interpolate(ctaS, [0, 1], [0.8, 1]);
  const ctaOp      = interpolate(ctaS, [0, 1], [0, 1]);

  // Pulsating glow on CTA button
  const pulse = interpolate(
    Math.sin(frame * 0.10),
    [-1, 1],
    [0.35, 1]
  );

  // Fade out near end
  const fadeOutOp = interpolate(frame, [durationInFrames - 20, durationInFrames - 4], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily, opacity: fadeOutOp }}>
      <SceneBg accentColor={accent} theme={theme} />

      <ContentZone center style={{ gap: 28 }}>
        {/* Logo */}
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, marginBottom: 8 }}>
          <Img src={staticFile("logo.webp")} style={{ width: 240, height: "auto", objectFit: "contain" }} />
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagOp, transform: `translateY(${tagY}px)`, fontSize: 44, fontWeight: 700, color: t.textSub, lineHeight: 1.3, textAlign: "center" }}>
          {data.tagline}
        </div>

        {/* Accent divider */}
        <AccentLine frame={frame} delay={14} accent={accent} width={200} />

        {data.website && (
          <div style={{ opacity: handleOp, fontSize: 36, fontWeight: 800, color: t.text }}>{data.website}</div>
        )}
        {data.handle && (
          <div style={{ opacity: handleOp, fontSize: 34, fontWeight: 700, color: FUSCHIA }}>{data.handle}</div>
        )}

        {/* CTA Button */}
        {data.ctaText && (
          <div
            style={{
              opacity: ctaOp,
              transform: `scale(${ctaScale})`,
              marginTop: 16,
              background: `linear-gradient(135deg, ${accent}, ${FUSCHIA})`,
              borderRadius: 80,
              padding: "30px 64px",
              fontSize: 32,
              fontWeight: 900,
              color: WHITE,
              letterSpacing: 0.3,
              textAlign: "center",
              boxShadow: `0 0 ${60 * pulse}px ${accent}77, 0 0 ${30 * pulse}px ${FUSCHIA}55, 0 8px 32px rgba(0,0,0,0.25)`,
            }}
          >
            {data.ctaText}
          </div>
        )}
      </ContentZone>
    </AbsoluteFill>
  );
}
