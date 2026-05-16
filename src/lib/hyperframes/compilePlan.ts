import type { HeygenVideoPlan, HeygenSegment, HeygenLayer } from "@/types/heygen";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sec(ms: number): number {
  return Math.round((ms / 1000) * 1000) / 1000;
}

function segmentNeedsAvatar(mode: string): boolean {
  return (
    mode === "avatar_full" ||
    mode === "avatar_pip" ||
    mode === "avatar_with_overlays" ||
    mode === "news_ticker" ||
    mode === "split_screen"
  );
}

function layerHtml(
  layer: HeygenLayer,
  seg: HeygenSegment,
  trackIndex: number,
  compId: string
): string {
  const segStart = sec(seg.startMs);
  const segDur = sec(seg.endMs - seg.startMs);
  const relStart = sec(layer.startMs ?? 0);
  const start = segStart + relStart;
  const endMs = layer.endMs ?? seg.endMs - seg.startMs;
  const dur = Math.max(0.2, sec(endMs - (layer.startMs ?? 0)));

  const pos = layer.position ?? "center";
  const posStyle: Record<string, string> = {
    center: "top:50%;left:50%;transform:translate(-50%,-50%);",
    "top-left": "top:8%;left:6%;",
    "top-right": "top:8%;right:6%;",
    "bottom-left": "bottom:12%;left:6%;",
    "bottom-right": "bottom:12%;right:6%;",
    full: "inset:0;width:100%;height:100%;object-fit:cover;",
  };

  const baseStyle = `position:absolute;${posStyle[pos] ?? posStyle.center}z-index:${10 + trackIndex};`;

  switch (layer.type) {
    case "image":
    case "video":
      if (!layer.src) return "";
      const tag = layer.type === "video" ? "video" : "img";
      const extra = layer.type === "video" ? ' muted playsinline' : "";
      return `
  <${tag} class="clip" id="${compId}-layer-${trackIndex}"
    data-start="${start}" data-duration="${dur}" data-track-index="${trackIndex}"
    src="${esc(layer.src)}"${extra}
    style="${baseStyle}max-width:42%;max-height:42%;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.45);" />`;

    case "text_bubble":
      return `
  <div class="clip" id="${compId}-bubble-${trackIndex}"
    data-start="${start}" data-duration="${dur}" data-track-index="${trackIndex}"
    style="${baseStyle}background:rgba(0,0,0,0.75);color:#fff;padding:16px 22px;border-radius:16px;font-size:28px;font-weight:700;max-width:70%;border:2px solid ${layer.accentColor ?? "#9DFF20"};">
    ${esc(layer.text ?? "")}
  </div>`;

    case "lower_third":
    case "news_frame":
      return `
  <div class="clip news-frame" id="${compId}-news-${trackIndex}"
    data-start="${start}" data-duration="${dur}" data-track-index="${trackIndex}"
    style="${baseStyle}bottom:0;left:0;right:0;padding:20px 28px;background:linear-gradient(transparent,rgba(0,0,0,0.92));">
    <div style="display:inline-block;background:#c41e3a;color:#fff;font-size:14px;font-weight:800;padding:4px 10px;letter-spacing:1px;margin-bottom:8px;">EN VIVO</div>
    <div style="color:#fff;font-size:32px;font-weight:800;">${esc(layer.headline ?? layer.title ?? "")}</div>
    <div style="color:rgba(255,255,255,0.85);font-size:18px;margin-top:6px;">${esc(layer.subtitle ?? layer.text ?? "")}</div>
  </div>`;

    case "chart":
    case "infographic": {
      const bars = layer.chartData?.values ?? [40, 70, 55, 90];
      const labels = layer.chartData?.labels ?? bars.map((_, i) => `${i + 1}`);
      const max = Math.max(...bars, 1);
      const barsHtml = bars
        .map((v, i) => {
          const h = Math.round((v / max) * 180);
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            <div style="width:48px;height:${h}px;background:linear-gradient(180deg,${layer.accentColor ?? "#5c59ca"},#9DFF20);border-radius:6px 6px 0 0;"></div>
            <span style="color:#fff;font-size:14px;">${esc(labels[i] ?? "")}</span>
          </div>`;
        })
        .join("");
      return `
  <div class="clip" id="${compId}-chart-${trackIndex}"
    data-start="${start}" data-duration="${dur}" data-track-index="${trackIndex}"
    style="${baseStyle}top:50%;left:50%;transform:translate(-50%,-50%);width:80%;">
    <h2 style="color:#fff;font-size:36px;margin:0 0 24px;text-align:center;">${esc(layer.title ?? layer.chartData?.title ?? "")}</h2>
    <div style="display:flex;align-items:flex-end;justify-content:center;gap:20px;height:200px;">${barsHtml}</div>
  </div>`;
    }

    case "social_card":
      return `
  <div class="clip" id="${compId}-social-${trackIndex}"
    data-start="${start}" data-duration="${dur}" data-track-index="${trackIndex}"
    style="${baseStyle}top:12%;right:6%;background:#111;border-radius:16px;padding:20px;border:1px solid rgba(255,255,255,0.15);min-width:280px;">
    <div style="color:#fff;font-weight:700;font-size:18px;">${esc(layer.title ?? "@marca")}</div>
    <div style="color:rgba(255,255,255,0.7);font-size:14px;margin-top:8px;">${esc(layer.text ?? "Síguenos")}</div>
    <div style="margin-top:12px;background:#9DFF20;color:#000;padding:8px 16px;border-radius:8px;font-weight:700;display:inline-block;">Seguir</div>
  </div>`;

    case "shader_transition":
      return `
  <div class="clip" id="${compId}-trans-${trackIndex}"
    data-start="${start}" data-duration="${Math.min(dur, 0.6)}" data-track-index="${trackIndex}"
    style="position:absolute;inset:0;background:#fff;opacity:0;z-index:50;pointer-events:none;"></div>`;

    default:
      if (layer.text) {
        return `
  <h2 class="clip" id="${compId}-txt-${trackIndex}"
    data-start="${start}" data-duration="${dur}" data-track-index="${trackIndex}"
    style="${baseStyle}color:#fff;font-size:42px;font-weight:800;text-shadow:0 4px 24px rgba(0,0,0,0.8);">
    ${esc(layer.text)}
  </h2>`;
      }
      return "";
  }
}

function segmentBlock(seg: HeygenSegment, plan: HeygenVideoPlan): string {
  const compId = `seg-${seg.id}`;
  const start = sec(seg.startMs);
  const dur = sec(seg.endMs - seg.startMs);
  const w = plan.width;
  const h = plan.height;
  const layers: string[] = [];
  let track = 0;

  const avatarUrl = seg.avatar?.heygenVideoUrl ?? plan.fullAvatarVideoUrl;
  if (segmentNeedsAvatar(seg.layoutMode) && avatarUrl) {
    const pip = seg.layoutMode === "avatar_pip";
    const style = pip
      ? "position:absolute;bottom:6%;right:5%;width:28%;height:auto;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,0.5);z-index:5;"
      : "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;";
    const crop =
      seg.avatar?.crop === "circle"
        ? "border-radius:50%;"
        : seg.avatar?.crop === "rounded"
          ? "border-radius:20px;"
          : "";
    layers.push(`
  <video class="clip" id="${compId}-avatar"
    data-start="${start}" data-duration="${dur}" data-track-index="${track}"
    src="${esc(avatarUrl)}" muted playsinline
    style="${style}${crop}" />`);
    track++;
  }

  if (seg.layoutMode === "graphics_only" || seg.layers.length > 0) {
    const bg =
      seg.layoutMode === "graphics_only"
        ? `background:linear-gradient(135deg,#0a0a12 0%,#1a1040 50%,#0d1f12 100%);`
        : "";
    if (bg) {
      layers.push(`
  <div class="clip" data-start="${start}" data-duration="${dur}" data-track-index="${track}"
    style="position:absolute;inset:0;${bg}z-index:0;"></div>`);
      track++;
    }
  }

  for (const layer of seg.layers) {
    const html = layerHtml(layer, seg, track, compId);
    if (html) {
      layers.push(html);
      track++;
    }
  }

  return layers.join("\n");
}

export interface HyperframesProject {
  indexHtml: string;
  files: Record<string, string>;
}

export function compileHeygenPlanToHyperframes(
  plan: HeygenVideoPlan
): HyperframesProject {
  const compId = "root";
  const durationSec = sec(plan.durationMs);
  const segmentsHtml = plan.segments.map((s) => segmentBlock(s, plan)).join("\n");

  const audioClips: string[] = [];
  let audioTrack = 20;
  for (const track of plan.audioTracks) {
    if (!track.src) continue;
    const vol = track.volume ?? (track.type === "music" ? 0.14 : 0.9);
    const loop = track.loop ? ' data-loop="true"' : "";
    const start = sec(track.startMs ?? 0);
    audioClips.push(`
  <audio class="clip" data-start="${start}" data-duration="${durationSec}" data-track-index="${audioTrack}"
    src="${esc(track.src)}" data-volume="${vol}"${loop}></audio>`);
    audioTrack++;
  }

  const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${esc(plan.title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #000; overflow: hidden; }
    [data-composition-id="${compId}"] { position: relative; width: ${plan.width}px; height: ${plan.height}px; background: #050508; overflow: hidden; }
    .vignette { pointer-events: none; position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%); z-index: 40; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="${compId}"
       data-start="0" data-width="${plan.width}" data-height="${plan.height}"
       data-duration="${durationSec}">
    ${segmentsHtml}
    <div class="vignette clip" data-start="0" data-duration="${durationSec}" data-track-index="39"></div>
    ${audioClips.join("\n")}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.from("#root .clip[id$='-bubble'], #root h2.clip", { opacity: 0, y: 30, duration: 0.5, stagger: 0.08 }, 0.2);
    tl.from("#root .news-frame", { opacity: 0, y: 40, duration: 0.6 }, 0.1);
    window.__timelines = window.__timelines || {};
    window.__timelines["${compId}"] = tl;
  </script>
</body>
</html>`;

  return {
    indexHtml,
    files: { "index.html": indexHtml },
  };
}

export function hyperframesStoragePrefix(uid: string, compositionId: string): string {
  return `users/${uid}/compositions/${compositionId}/hyperframes`;
}
