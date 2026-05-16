"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Sequence, AssetDTO, AssetType, RenderEngine } from "../../../src/types";
import type { HeygenVideoPlan } from "../../../src/types/heygen";
import { resolveHeygenAudioTracks } from "../../../src/lib/heygen/resolveHeygenAudio";
import {
  syncPlanSegmentsToVoiceDuration,
  getVoiceTrackUrl,
} from "../../../src/lib/heygen/syncPlanToAudio";

const API_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) || "";

// ─── types ────────────────────────────────────────────────────────────────────

export interface GeneratedComposition {
  title: string;
  sequences: Sequence[];
  fps: number;
  width: number;
  height: number;
}

export interface CompositionChatProps {
  open: boolean;
  onClose: () => void;
  onCreated: (compositionId: string) => void;
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  composition?: GeneratedComposition | null;
};

type ElevenLabsMarker = {
  type: "voice" | "music" | "sfx";
  text?: string;
  prompt?: string;
  durationMs?: number;
  durationSeconds?: number;
};

type UploadItem = {
  id: string;
  filename: string;
  progress: number;
  error?: string;
  done: boolean;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_ICON: Record<AssetType, string> = {
  image: "🖼️",
  video: "🎬",
  audio: "🎵",
  font: "𝐀",
};

const TYPE_COLOR: Record<AssetType, string> = {
  image: "#64b4ff",
  video: "#ff9632",
  audio: "#9DFF20",
  font: "#c864ff",
};

// ─── Plantilla de prompt ideal ────────────────────────────────────────────────

const IDEAL_PROMPT = `Crea un reel de 45 segundos para [Nombre del cliente].

Periodo: [Ej: Q1 2025 — Enero a Marzo]
Plataformas: [Instagram, TikTok, LinkedIn, Meta Ads…]

Métricas principales:
- Impresiones: [Ej: 3.2M] ([Ej: +24%] vs periodo anterior)
- Me gusta: [Ej: 148K] ([Ej: +18%])
- Nuevos seguidores: [Ej: 42K]
- Tasa de engagement: [Ej: 4.6%]
- CTR: [Ej: 4.7%]
- Costo por clic: [Ej: $0.32]

Top contenidos:
1. [Título del contenido 1] — [Ej: 420K impresiones] ([Plataforma])
2. [Título del contenido 2] — [Ej: 310K] ([Plataforma])
3. [Título del contenido 3] — [Ej: 195K] ([Plataforma])

Insight clave: [Ej: el video genera 3× más engagement que los carruseles]

Incluye música instrumental animada y narración en español.`;

const IDEAL_PROMPT_HEYGEN = `Crea un reel viral de 40 segundos en vertical (9:16).

Hook impactante en los primeros 3 segundos. Alterna: avatar hablante, gráficos de datos, burbujas de texto y frame tipo noticias.
Métricas clave con animación (usa mis assets si los subí).
Tono energético, CTA final claro. Música instrumental + narración en español.`;

function segmentNeedsAvatar(mode: string): boolean {
  return (
    mode === "avatar_full" ||
    mode === "avatar_pip" ||
    mode === "avatar_with_overlays" ||
    mode === "news_ticker" ||
    mode === "split_screen"
  );
}

/** Genera el bloque de contexto de assets para el prompt de IA */
function buildAssetContext(assets: AssetDTO[]): string {
  if (assets.length === 0) return "";
  const lines = assets.map((a, idx) => {
    const typeLabel = a.type === "image" ? "imagen" : a.type === "video" ? "video" : a.type === "audio" ? "audio" : "fuente";
    const usage = a.description?.trim() || "Sin instruccion explicita: usalo donde aporte valor narrativo.";
    return `  ${idx + 1}. [${typeLabel}] ${a.name}\n     URL: ${a.downloadUrl}\n     INSTRUCCION_DE_USO: ${usage}`;
  });
  return `\n\nAssets disponibles para esta composición:
- Debes contemplarlos al generar escenas.
- Si INSTRUCCION_DE_USO existe, priorizala como requisito de uso.
- Usa las URL exactas en src cuando aplique.
${lines.join("\n")}`;
}

/** Resuelve marcadores _elevenlabs generando audio real */
async function resolveAudio(
  sequences: Sequence[],
  apiUrl: string,
  onProgress: (msg: string) => void,
  compositionId: string
): Promise<Sequence[]> {
  const result: Sequence[] = [];
  for (const seq of sequences) {
    const data = seq.sceneData as Record<string, unknown>;
    const marker = data?._elevenlabs as ElevenLabsMarker | undefined;
    if (!marker) { result.push(seq); continue; }

    const label = marker.type === "voice"
      ? `voz: "${(marker.text ?? "").slice(0, 40)}"`
      : `${marker.type}: "${(marker.prompt ?? "").slice(0, 40)}"`;
    onProgress(`Generando ${label}…`);

    try {
      const res = await fetch(`${apiUrl}/api/ai/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: marker.type, text: marker.text, prompt: marker.prompt, durationMs: marker.durationMs, durationSeconds: marker.durationSeconds, compositionId }),
      });
      const audioData = await res.json() as { downloadUrl?: string };
      const { _elevenlabs: _rm, ...clean } = data;
      void _rm;
      result.push({
        ...seq,
        sceneData: { ...clean, ...(audioData.downloadUrl ? { src: audioData.downloadUrl } : {}) } as Sequence["sceneData"],
      });
    } catch {
      const { _elevenlabs: _rm2, ...clean2 } = data;
      void _rm2;
      result.push({ ...seq, sceneData: clean2 as Sequence["sceneData"] });
    }
  }
  return result;
}

// ─── Step 1 — Asset uploader ──────────────────────────────────────────────────

function AssetStep({
  assets,
  uploads,
  onFilesSelected,
  onDeleteAsset,
  onUpdateAsset,
  onNext,
  uploadIntent,
  onUploadIntentChange,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  assets: AssetDTO[];
  uploads: UploadItem[];
  onFilesSelected: (files: FileList, uploadInstruction?: string) => void;
  onDeleteAsset: (id: string) => void;
  onUpdateAsset: (id: string, patch: { name?: string; description?: string }) => void;
  onNext: () => void;
  uploadIntent: string;
  onUploadIntentChange: (value: string) => void;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingDesc, setEditingDesc] = useState<string | null>(null);
  const [descValue, setDescValue] = useState("");

  const startEditDesc = (asset: AssetDTO) => {
    setEditingDesc(asset.id);
    setDescValue(asset.description ?? "");
  };

  const saveDesc = (asset: AssetDTO) => {
    if (descValue !== (asset.description ?? "")) {
      onUpdateAsset(asset.id, { description: descValue });
    }
    setEditingDesc(null);
  };

  const grouped = {
    image: assets.filter((a) => a.type === "image"),
    video: assets.filter((a) => a.type === "video"),
    audio: assets.filter((a) => a.type === "audio"),
    font: assets.filter((a) => a.type === "font"),
  };

  const activeUploads = uploads.filter((u) => !u.done || u.error);
  const hasAssets = assets.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, overflow: "auto", padding: "0 20px 16px" }}>

      {/* Upload zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "rgba(157,255,32,0.8)" : "rgba(157,255,32,0.25)"}`,
          borderRadius: 10,
          padding: "20px 16px",
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: dragging ? "rgba(157,255,32,0.06)" : "rgba(255,255,255,0.02)",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 6 }}>⬆️</div>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
          <strong style={{ color: "#9DFF20" }}>Arrastra o haz clic</strong> para subir assets
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
          Imágenes · Videos · Audio · Fuentes
        </p>
        <textarea
          value={uploadIntent}
          onChange={(e) => onUploadIntentChange(e.target.value)}
          placeholder="Opcional: explica qué quieres que la IA haga con estos assets."
          rows={2}
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 8,
            width: "100%",
            maxWidth: 480,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(157,255,32,0.25)",
            borderRadius: 7,
            color: "rgba(255,255,255,0.8)",
            fontSize: 10,
            padding: "7px 9px",
            fontFamily: "inherit",
            resize: "vertical",
            lineHeight: 1.4,
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.woff2,.woff,.ttf,.otf"
          style={{ display: "none" }}
          onChange={(e) => e.target.files && onFilesSelected(e.target.files, uploadIntent.trim() || undefined)}
        />
      </div>

      {/* Active uploads */}
      {activeUploads.map((u) => (
        <div
          key={u.id}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: u.error ? "rgba(255,80,80,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${u.error ? "rgba(255,80,80,0.3)" : "rgba(255,255,255,0.1)"}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {u.filename}
          </span>
          {u.error
            ? <span style={{ fontSize: 10, color: "#ff6b6b", flexShrink: 0 }}>{u.error}</span>
            : <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 60, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${u.progress}%`, background: "#9DFF20", transition: "width 0.2s", borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{u.progress}%</span>
              </div>
          }
        </div>
      ))}

      {/* Uploaded assets by type */}
      {hasAssets && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(["image", "video", "audio", "font"] as AssetType[]).map((type) => {
            const group = grouped[type];
            if (group.length === 0) return null;
            const labels: Record<AssetType, string> = { image: "Imágenes", video: "Videos", audio: "Audio", font: "Fuentes" };
            return (
              <div key={type}>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: TYPE_COLOR[type], fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                  {TYPE_ICON[type]} {labels[type]}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.map((asset) => (
                    <div
                      key={asset.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        alignItems: "flex-start",
                      }}
                    >
                      {/* Preview */}
                      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 6, overflow: "hidden", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {type === "image"
                          ? <img src={asset.downloadUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 18 }}>{TYPE_ICON[type]}</span>
                        }
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, color: "#fff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {asset.name}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                          {formatBytes(asset.sizeBytes)}
                        </p>
                        {/* Description */}
                        {editingDesc === asset.id
                          ? (
                            <textarea
                              autoFocus
                              value={descValue}
                              onChange={(e) => setDescValue(e.target.value)}
                              onBlur={() => saveDesc(asset)}
                              onKeyDown={(e) => { if (e.key === "Escape") setEditingDesc(null); }}
                              placeholder="Para qué usar este asset..."
                              rows={2}
                              style={{
                                marginTop: 6,
                                width: "100%",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(157,255,32,0.3)",
                                borderRadius: 4,
                                color: "rgba(255,255,255,0.8)",
                                fontSize: 10,
                                padding: "4px 6px",
                                fontFamily: "inherit",
                                resize: "none",
                                lineHeight: 1.4,
                              }}
                            />
                          )
                          : (
                            <p
                              onClick={() => startEditDesc(asset)}
                              title="Clic para añadir descripción de uso"
                              style={{
                                margin: "4px 0 0",
                                fontSize: 10,
                                color: asset.description ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
                                cursor: "text",
                                fontStyle: asset.description ? "normal" : "italic",
                                lineHeight: 1.3,
                              }}
                            >
                              {asset.description || "Añadir descripción de uso…"}
                            </p>
                          )
                        }
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteAsset(asset.id)}
                        title="Eliminar"
                        style={{
                          flexShrink: 0,
                          background: "none",
                          border: "none",
                          color: "rgba(255,100,100,0.5)",
                          fontSize: 14,
                          cursor: "pointer",
                          padding: "0 2px",
                          lineHeight: 1,
                          alignSelf: "flex-start",
                          marginTop: 2,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasAssets && uploads.filter((u) => u.done && !u.error).length === 0 && (
        <p style={{ margin: "8px 0", fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
          Los assets son opcionales. Si no subes ninguno, la IA genera la composición con contenido de ejemplo.
        </p>
      )}

      {/* Next button */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "auto", flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.2)", alignSelf: "center" }}>
          {assets.length > 0 ? `${assets.length} asset${assets.length > 1 ? "s" : ""} listo${assets.length > 1 ? "s" : ""}` : "Sin assets"}
        </p>
        <button
          type="button"
          onClick={onNext}
          style={{
            padding: "9px 20px",
            borderRadius: 8,
            border: "1px solid rgba(157,255,32,0.5)",
            background: "rgba(157,255,32,0.15)",
            color: "#9DFF20",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: 0.5,
          }}
        >
          Describir video →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 — AI Chat ─────────────────────────────────────────────────────────

function ChatStep({
  assets,
  messages,
  input,
  setInput,
  loading,
  creating,
  statusMsg,
  error,
  lastComposition,
  messagesEndRef,
  inputRef,
  onSend,
  onConcretar,
  onBack,
  onUseTemplate,
  renderEngine,
  onRenderEngineChange,
  avatarDescription,
  onAvatarDescriptionChange,
}: {
  assets: AssetDTO[];
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  creating: boolean;
  statusMsg: string | null;
  error: string | null;
  lastComposition: GeneratedComposition | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSend: () => void;
  onConcretar: () => void;
  onBack: () => void;
  onUseTemplate: () => void;
  renderEngine: RenderEngine;
  onRenderEngineChange: (e: RenderEngine) => void;
  avatarDescription: string;
  onAvatarDescriptionChange: (v: string) => void;
}) {
  const isBusy = loading || creating;
  const engineBadge =
    renderEngine === "heygen"
      ? "Claude · ElevenLabs · HeyGen · HyperFrames"
      : "Claude · ElevenLabs · Remotion";

  return (
    <>
      {/* Motor de render */}
      <div style={{ margin: "8px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: 1, textTransform: "uppercase" }}>
          Motor de video
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {(
            [
              { id: "remotion" as const, label: "Remotion", desc: "Escenas analytics + editor" },
              { id: "heygen" as const, label: "HeyGen", desc: "Avatar + HyperFrames viral" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={isBusy}
              onClick={() => onRenderEngineChange(opt.id)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${renderEngine === opt.id ? "rgba(157,255,32,0.6)" : "rgba(255,255,255,0.12)"}`,
                background: renderEngine === opt.id ? "rgba(157,255,32,0.12)" : "rgba(255,255,255,0.03)",
                color: renderEngine === opt.id ? "#9DFF20" : "rgba(255,255,255,0.65)",
                cursor: isBusy ? "not-allowed" : "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700 }}>{opt.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
        {renderEngine === "heygen" && (
          <textarea
            value={avatarDescription}
            onChange={(e) => onAvatarDescriptionChange(e.target.value)}
            placeholder="Describe el avatar: género, edad, estilo, vestimenta, fondo, tono…"
            rows={3}
            disabled={isBusy}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 9,
              border: "1px solid rgba(100,180,255,0.35)",
              background: "rgba(100,160,255,0.08)",
              color: "#fff",
              fontSize: 11,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        )}
      </div>

      {/* Asset summary bar */}
      {assets.length > 0 && (
        <div
          style={{
            margin: "0 20px 4px",
            padding: "7px 12px",
            borderRadius: 8,
            background: "rgba(157,255,32,0.06)",
            border: "1px solid rgba(157,255,32,0.15)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 10, color: "rgba(157,255,32,0.7)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            Assets
          </span>
          {assets.map((a) => (
            <span
              key={a.id}
              title={a.description || a.name}
              style={{
                fontSize: 10,
                color: TYPE_COLOR[a.type],
                background: "rgba(255,255,255,0.05)",
                borderRadius: 4,
                padding: "2px 6px",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              {TYPE_ICON[a.type]} {a.name.length > 18 ? a.name.slice(0, 16) + "…" : a.name}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 20px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              {assets.length > 0
                ? `Describe el video. La IA usará los ${assets.length} asset${assets.length > 1 ? "s" : ""} que subiste.`
                : "Describe el video que quieres generar."}
            </p>
            <button
              type="button"
              onClick={onUseTemplate}
              style={{
                alignSelf: "flex-start",
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid rgba(92,89,202,0.5)",
                background: "rgba(92,89,202,0.12)",
                color: "#a09ee8",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: 0.3,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 13 }}>📋</span> Usar plantilla de brief
            </button>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
              padding: "9px 13px",
              borderRadius: 10,
              backgroundColor: m.role === "user" ? "rgba(157,255,32,0.12)" : "rgba(255,255,255,0.06)",
              border: m.role === "user" ? "1px solid rgba(157,255,32,0.25)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.9)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {m.content}
            </p>
            {m.composition && (
              <p style={{ margin: "6px 0 0", fontSize: 10, color: "rgba(157,255,32,0.8)" }}>
                → {m.composition.sequences.filter((s) => s.sceneType !== "audio").length} escenas visuales · {m.composition.title}
              </p>
            )}
          </div>
        ))}
        {isBusy && statusMsg && (
          <div style={{
            alignSelf: "flex-start",
            padding: "9px 13px",
            borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(157,255,32,0.15)",
            fontSize: 11,
            color: "rgba(157,255,32,0.7)",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}>
            <span>⟳</span>{statusMsg}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div style={{ margin: "0 20px 4px", padding: "7px 11px", borderRadius: 7, backgroundColor: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.3)", color: "#ff6b6b", fontSize: 11 }}>
          {error}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(157,255,32,0.12)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Describe tu video…"
            rows={6}
            disabled={isBusy}
            style={{
              flex: 1,
              padding: "9px 13px",
              borderRadius: 9,
              border: "1px solid rgba(255,255,255,0.18)",
              backgroundColor: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: 12,
              resize: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={isBusy || !input.trim()}
            style={{
              padding: "9px 16px",
              borderRadius: 9,
              border: "1px solid rgba(157,255,32,0.5)",
              background: "rgba(157,255,32,0.15)",
              color: "#9DFF20",
              fontSize: 12,
              fontWeight: 600,
              cursor: isBusy || !input.trim() ? "not-allowed" : "pointer",
              alignSelf: "flex-end",
              opacity: isBusy || !input.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "Generando…" : creating ? "Procesando…" : "Generar"}
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={onBack}
            disabled={isBusy}
            style={{
              background: "none",
              border: "none",
              color: isBusy ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.4)",
              fontSize: 11,
              cursor: isBusy ? "not-allowed" : "pointer",
              padding: 0,
            }}
          >
            ← Assets
          </button>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
              {engineBadge}
            </span>
            {lastComposition && (
              <button
                type="button"
                onClick={onConcretar}
                disabled={isBusy}
                style={{
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: "1px solid rgba(157,255,32,0.4)",
                  background: "rgba(157,255,32,0.12)",
                  color: "#9DFF20",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: isBusy ? "not-allowed" : "pointer",
                  opacity: isBusy ? 0.5 : 1,
                }}
              >
                {creating ? "Creando…" : "Crear y abrir editor"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main CompositionChat ─────────────────────────────────────────────────────

export function CompositionChat({ open, onClose, onCreated }: CompositionChatProps) {
  const [step, setStep] = useState<"assets" | "chat">("assets");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [assets, setAssets] = useState<AssetDTO[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploadIntent, setUploadIntent] = useState("");
  const [dragging, setDragging] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastComposition, setLastComposition] = useState<GeneratedComposition | null>(null);
  const [renderEngine, setRenderEngine] = useState<RenderEngine>("remotion");
  const [avatarDescription, setAvatarDescription] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setStep("assets");
      setAssets([]);
      setUploads([]);
      setUploadIntent("");
      setMessages([]);
      setInput("");
      setLastComposition(null);
      setRenderEngine("remotion");
      setAvatarDescription("");
      setError(null);
      setStatusMsg(null);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (step === "chat") setTimeout(() => inputRef.current?.focus(), 80);
  }, [step]);

  // ── asset upload ─────────────────────────────────────────────────────────
  const uploadFile = useCallback(async (file: File, uploadInstruction?: string) => {
    const uid = `${Date.now()}-${file.name}`;
    const item: UploadItem = { id: uid, filename: file.name, progress: 0, done: false };
    setUploads((prev) => [...prev, item]);
    const update = (p: Partial<UploadItem>) =>
      setUploads((prev) => prev.map((u) => (u.id === uid ? { ...u, ...p } : u)));

    try {
      const uploadedAsset = await new Promise<AssetDTO>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file, file.name);
        formData.append("sessionId", sessionId);
        if (uploadInstruction?.trim()) {
          formData.append("description", uploadInstruction.trim());
        }

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) update({ progress: 5 + Math.round((e.loaded / e.total) * 90) });
        };
        xhr.onload = () => {
          let payload: { error?: string; asset?: AssetDTO } = {};
          try {
            payload = JSON.parse(xhr.responseText) as { error?: string; asset?: AssetDTO };
          } catch {
            // ignore JSON parse errors and fallback to generic message
          }
          if (xhr.status >= 200 && xhr.status < 300 && payload.asset) {
            resolve(payload.asset);
            return;
          }
          reject(new Error(payload.error ?? `Error al subir asset (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Error de red al subir asset"));
        xhr.open("POST", `${API_URL}/api/assets/upload-direct`);
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      update({ progress: 100, done: true });
      setAssets((prev) => [...prev, uploadedAsset]);
      setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== uid)), 2000);
    } catch (err) {
      update({ error: err instanceof Error ? err.message : "Error", done: true });
    }
  }, [sessionId]);

  const handleFiles = useCallback((files: FileList | File[], uploadInstruction?: string) => {
    Array.from(files).forEach((file) => uploadFile(file, uploadInstruction));
  }, [uploadFile]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files, uploadIntent.trim() || undefined);
  };

  const handleDeleteAsset = async (id: string) => {
    await fetch(`${API_URL}/api/assets/${id}`, { method: "DELETE", credentials: "include" });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateAsset = async (id: string, patch: { name?: string; description?: string }) => {
    const res = await fetch(`${API_URL}/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json() as { asset: AssetDTO };
      setAssets((prev) => prev.map((a) => (a.id === id ? data.asset : a)));
    }
  };

  const runHeygenPipeline = async (
    text: string,
    conversation: Array<{ role: string; content: string }>
  ) => {
    if (!avatarDescription.trim()) {
      throw new Error("Describe el avatar para videos HeyGen.");
    }

    const compositionId = crypto.randomUUID();

    setStatusMsg("Planificando video viral (HeyGen + HyperFrames)…");
    const planRes = await fetch(`${API_URL}/api/ai/heygen-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        messages: conversation,
        avatarDescription: avatarDescription.trim(),
      }),
    });
    const planData = await planRes.json();
    if (!planRes.ok) throw new Error(planData.error ?? "Error al generar plan");

    let plan = planData.plan as HeygenVideoPlan;

    const audioCount = plan.audioTracks.filter((t) => t._elevenlabs).length;
    if (audioCount > 0) {
      setStatusMsg(`Generando ${audioCount} pista(s) con ElevenLabs…`);
      plan = await resolveHeygenAudioTracks(plan, API_URL, compositionId, setStatusMsg);
    }

    const voiceUrl = getVoiceTrackUrl(plan);
    if (voiceUrl) {
      setStatusMsg("Sincronizando segmentos con duración de voz…");
      const durRes = await fetch(
        `${API_URL}/api/ai/audio/duration?url=${encodeURIComponent(voiceUrl)}`,
        { credentials: "include" }
      );
      const durData = await durRes.json();
      if (durRes.ok && durData.durationMs) {
        plan = syncPlanSegmentsToVoiceDuration(plan, durData.durationMs);
      }
    }

    const needsAvatar = plan.segments.some((s) => segmentNeedsAvatar(s.layoutMode));
    if (needsAvatar && voiceUrl) {
      setStatusMsg("Generando avatar HeyGen (lip-sync con ElevenLabs)…");
      try {
        const avRes = await fetch(`${API_URL}/api/heygen/avatar-segment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            audioUrl: voiceUrl,
            segmentId: "full",
            width: plan.width,
            height: plan.height,
            avatarDescription: avatarDescription.trim(),
            avatarId: plan.suggestedAvatarId,
            poll: true,
          }),
        });
        const avData = await avRes.json();
        if (avRes.ok && avData.videoUrl) {
          plan = {
            ...plan,
            fullAvatarVideoUrl: avData.videoUrl,
            segments: plan.segments.map((s) =>
              segmentNeedsAvatar(s.layoutMode)
                ? {
                    ...s,
                    avatar: {
                      ...s.avatar,
                      heygenVideoUrl: avData.videoUrl,
                      heygenVideoId: avData.videoId,
                    },
                  }
                : s
            ),
          };
        } else if (!avRes.ok) {
          console.warn("[heygen] avatar:", avData.error);
          setStatusMsg("Avatar omitido (API HeyGen). Compilando solo gráficos…");
        }
      } catch (e) {
        console.warn("[heygen] avatar error", e);
        setStatusMsg("Avatar no disponible. Compilando gráficos…");
      }
    }

    setStatusMsg("Guardando composición…");
    const totalFrames = Math.ceil((plan.durationMs / 1000) * plan.fps);
    const createRes = await fetch(`${API_URL}/api/compositions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: plan.title,
        sequences: [],
        fps: plan.fps,
        width: plan.width,
        height: plan.height,
        sessionId,
        compositionId,
        renderEngine: "heygen",
        totalDurationInFrames: totalFrames,
        heygen: {
          avatarDescription: avatarDescription.trim(),
          plan,
          renderStatus: "draft",
        },
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(createData.error ?? "Error al crear");

    setStatusMsg("Compilando proyecto HyperFrames…");
    const compileRes = await fetch(`${API_URL}/api/heygen/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ compositionId, plan }),
    });
    const compileData = await compileRes.json();
    if (!compileRes.ok) throw new Error(compileData.error ?? "Error al compilar");

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `Video HeyGen "${plan.title}": ${plan.segments.length} segmentos dinámicos. Preview listo.`,
      },
    ]);

    onCreated(createData.composition.id);
    onClose();
  };

  // ── AI generation ────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || creating) return;

    if (renderEngine === "heygen" && !avatarDescription.trim()) {
      setError("Describe el avatar antes de generar con HeyGen.");
      return;
    }

    setInput("");
    const assetContext = buildAssetContext(assets);
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);
    setStatusMsg(
      renderEngine === "heygen"
        ? "Generando plan HeyGen…"
        : "Generando composición con IA…"
    );

    const conversation = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.role === "user" && assetContext
        ? `${m.content}${assetContext}`
        : m.content,
    }));

    try {
      if (renderEngine === "heygen") {
        setLoading(false);
        setCreating(true);
        await runHeygenPipeline(text, conversation);
        return;
      }

      const res = await fetch(`${API_URL}/api/ai/composition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: conversation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al generar");

      const comp = data.composition as GeneratedComposition;
      setLastComposition(comp);
      setLoading(false);
      setCreating(true);

      const audioSeqCount = comp.sequences.filter(
        (s) => (s.sceneData as Record<string, unknown>)?._elevenlabs
      ).length;

      const compositionId = crypto.randomUUID();
      let resolvedSequences = comp.sequences;
      if (audioSeqCount > 0) {
        setStatusMsg(`Generando ${audioSeqCount} pista(s) de audio con ElevenLabs…`);
        resolvedSequences = await resolveAudio(comp.sequences, API_URL, (msg) => setStatusMsg(msg), compositionId);
      }

      const audioCount = resolvedSequences.filter(
        (s) => s.sceneType === "audio" && (s.sceneData as Record<string, unknown>)?.src
      ).length;

      setMessages((prev) => [...prev, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `Composición "${comp.title}" generada: ${comp.sequences.filter((s) => s.sceneType !== "audio").length} escenas visuales${audioCount > 0 ? ` + ${audioCount} pista(s) de audio` : ""}. Abriendo editor…`,
        composition: comp,
      }]);

      setStatusMsg("Guardando composición…");
      const createRes = await fetch(`${API_URL}/api/compositions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: comp.title, sequences: resolvedSequences, fps: comp.fps, width: comp.width, height: comp.height, sessionId, compositionId }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? "Error al crear");

      onCreated(createData.composition.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
      setCreating(false);
      setStatusMsg(null);
    }
  };

  const handleConcretar = async () => {
    if (!lastComposition || creating) return;
    setCreating(true);
    setError(null);
    setStatusMsg("Guardando composición…");
    try {
      const audioSeqCount = lastComposition.sequences.filter(
        (s) => (s.sceneData as Record<string, unknown>)?._elevenlabs
      ).length;
      const compositionId = crypto.randomUUID();
      let resolvedSequences = lastComposition.sequences;
      if (audioSeqCount > 0) {
        setStatusMsg(`Generando ${audioSeqCount} pista(s) de audio con ElevenLabs…`);
        resolvedSequences = await resolveAudio(lastComposition.sequences, API_URL, (msg) => setStatusMsg(msg), compositionId);
      }
      const res = await fetch(`${API_URL}/api/compositions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: lastComposition.title, sequences: resolvedSequences, fps: lastComposition.fps, width: lastComposition.width, height: lastComposition.height, sessionId, compositionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      onCreated(data.composition.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
      setCreating(false);
      setStatusMsg(null);
    }
  };

  if (!open) return null;

  const isBusy = loading || creating;
  const STEP_LABELS = { assets: "1. Assets", chat: "2. Descripción" };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && !isBusy && onClose()}
    >
      <div
        style={{ width: "100%", maxWidth: 560, height: "min(94vh, 860px)", backgroundColor: "#0a0a0c", borderRadius: 16, border: "1px solid rgba(157,255,32,0.2)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(157,255,32,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#9DFF20", letterSpacing: 2, textTransform: "uppercase" }}>
              Nueva composición
            </h2>
            {/* Step pills */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["assets", "chat"] as const).map((s) => (
                <span
                  key={s}
                  style={{
                    padding: "3px 9px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: step === s ? 700 : 400,
                    color: step === s ? "#9DFF20" : "rgba(255,255,255,0.25)",
                    background: step === s ? "rgba(157,255,32,0.12)" : "transparent",
                    border: `1px solid ${step === s ? "rgba(157,255,32,0.3)" : "transparent"}`,
                    letterSpacing: 0.5,
                  }}
                >
                  {STEP_LABELS[s]}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            style={{ background: "none", border: "none", color: isBusy ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)", fontSize: 20, cursor: isBusy ? "not-allowed" : "pointer", padding: "0 4px", lineHeight: 1 }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Step content */}
        {step === "assets" && (
          <AssetStep
            assets={assets}
            uploads={uploads}
            onFilesSelected={handleFiles}
            onDeleteAsset={handleDeleteAsset}
            onUpdateAsset={handleUpdateAsset}
            onNext={() => setStep("chat")}
            uploadIntent={uploadIntent}
            onUploadIntentChange={setUploadIntent}
            dragging={dragging}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          />
        )}

        {step === "chat" && (
          <ChatStep
            assets={assets}
            messages={messages}
            input={input}
            setInput={setInput}
            loading={loading}
            creating={creating}
            statusMsg={statusMsg}
            error={error}
            lastComposition={lastComposition}
            messagesEndRef={messagesEndRef}
            inputRef={inputRef}
            onSend={sendMessage}
            onConcretar={handleConcretar}
            onBack={() => !isBusy && setStep("assets")}
            onUseTemplate={() => {
              setInput(renderEngine === "heygen" ? IDEAL_PROMPT_HEYGEN : IDEAL_PROMPT);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            renderEngine={renderEngine}
            onRenderEngineChange={setRenderEngine}
            avatarDescription={avatarDescription}
            onAvatarDescriptionChange={setAvatarDescription}
          />
        )}
      </div>
    </div>
  );
}
