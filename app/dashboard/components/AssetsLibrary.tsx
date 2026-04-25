"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { AssetDTO, AssetType } from "../../../src/types";

const API_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) || "";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeToType(mime: string): AssetType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "font";
}

const TYPE_LABELS: Record<AssetType, string> = {
  image: "Imagen",
  video: "Video",
  audio: "Audio",
  font: "Fuente",
};

const TYPE_ACCEPT: Record<AssetType | "all", string> = {
  all: "image/*,video/*,audio/*,.woff2,.woff,.ttf,.otf",
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
  font: ".woff2,.woff,.ttf,.otf",
};

type FilterTab = "all" | AssetType;

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "image", label: "Imágenes" },
  { key: "video", label: "Videos" },
  { key: "audio", label: "Audio" },
  { key: "font", label: "Fuentes" },
];

// ─── upload progress item ──────────────────────────────────────────────────────

type UploadItem = {
  id: string;
  filename: string;
  progress: number; // 0-100
  error?: string;
  done: boolean;
};

// ─── asset card ───────────────────────────────────────────────────────────────

function AssetPreview({ asset }: { asset: AssetDTO }) {
  if (asset.type === "image") {
    return (
      <img
        src={asset.downloadUrl}
        alt={asset.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "8px 8px 0 0",
          display: "block",
        }}
        loading="lazy"
      />
    );
  }
  const icons: Record<AssetType, string> = {
    image: "🖼️",
    video: "🎬",
    audio: "🎵",
    font: "𝐀",
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 36,
        borderRadius: "8px 8px 0 0",
        backgroundColor: "rgba(255,255,255,0.04)",
      }}
    >
      {icons[asset.type]}
    </div>
  );
}

function AssetCard({
  asset,
  onDelete,
  onUpdate,
}: {
  asset: AssetDTO;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: { name?: string; description?: string }) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(asset.name);
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState(asset.description ?? "");
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(asset.downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === asset.name) {
      setName(asset.name);
      setEditingName(false);
      return;
    }
    setSaving(true);
    onUpdate(asset.id, { name: trimmed });
    setEditingName(false);
    setSaving(false);
  };

  const saveDesc = async () => {
    if (description === (asset.description ?? "")) {
      setEditingDesc(false);
      return;
    }
    setSaving(true);
    onUpdate(asset.id, { description });
    setEditingDesc(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${asset.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    onDelete(asset.id);
  };

  const typeBadgeColor: Record<AssetType, string> = {
    image: "rgba(100,180,255,0.2)",
    video: "rgba(255,150,50,0.2)",
    audio: "rgba(157,255,32,0.2)",
    font: "rgba(200,100,255,0.2)",
  };
  const typeBadgeText: Record<AssetType, string> = {
    image: "#64b4ff",
    video: "#ff9632",
    audio: "#9DFF20",
    font: "#c864ff",
  };

  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.03)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(157,255,32,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.1)";
      }}
    >
      {/* Preview */}
      <div style={{ height: 120, position: "relative", flexShrink: 0 }}>
        <AssetPreview asset={asset} />
        <span
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            backgroundColor: typeBadgeColor[asset.type],
            color: typeBadgeText[asset.type],
            backdropFilter: "blur(4px)",
          }}
        >
          {TYPE_LABELS[asset.type]}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {/* Name */}
        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") { setName(asset.name); setEditingName(false); }
            }}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(157,255,32,0.4)",
              borderRadius: 4,
              color: "#fff",
              fontSize: 12,
              padding: "4px 6px",
              width: "100%",
              fontFamily: "inherit",
            }}
          />
        ) : (
          <div
            title="Clic para editar nombre"
            onClick={() => setEditingName(true)}
            style={{
              fontSize: 12,
              color: "#fff",
              fontWeight: 500,
              cursor: "text",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              padding: "2px 0",
            }}
          >
            {name}
          </div>
        )}

        {/* Size */}
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
          {formatBytes(asset.sizeBytes)}
          {asset.durationSeconds ? ` · ${asset.durationSeconds.toFixed(1)}s` : ""}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
        </div>

        {/* Description */}
        {editingDesc ? (
          <textarea
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDesc}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setDescription(asset.description ?? ""); setEditingDesc(false); }
            }}
            placeholder="Para qué y cómo usar este asset..."
            rows={3}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(157,255,32,0.3)",
              borderRadius: 4,
              color: "rgba(255,255,255,0.8)",
              fontSize: 11,
              padding: "6px 8px",
              width: "100%",
              fontFamily: "inherit",
              resize: "none",
              lineHeight: 1.4,
            }}
          />
        ) : (
          <div
            title="Clic para añadir descripción de uso"
            onClick={() => setEditingDesc(true)}
            style={{
              fontSize: 11,
              color: description ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)",
              cursor: "text",
              lineHeight: 1.4,
              minHeight: 32,
              padding: "4px 0",
              fontStyle: description ? "normal" : "italic",
            }}
          >
            {description || "Sin descripción — clic para añadir"}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={copyUrl}
          title="Copiar URL para usar en composiciones"
          style={{
            flex: 1,
            padding: "5px 8px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent",
            color: copied ? "#9DFF20" : "rgba(255,255,255,0.6)",
            fontSize: 11,
            cursor: "pointer",
            letterSpacing: 0.3,
          }}
        >
          {copied ? "✓ Copiado" : "Copiar URL"}
        </button>
        {saving && (
          <span style={{ fontSize: 10, color: "rgba(157,255,32,0.6)", alignSelf: "center" }}>
            Guardando…
          </span>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          title="Eliminar asset"
          style={{
            padding: "5px 8px",
            borderRadius: 6,
            border: "1px solid rgba(255,80,80,0.3)",
            background: "transparent",
            color: "rgba(255,100,100,0.7)",
            fontSize: 11,
            cursor: deleting ? "wait" : "pointer",
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? "…" : "Borrar"}
        </button>
      </div>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export function AssetsLibrary() {
  const [assets, setAssets] = useState<AssetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploadIntent, setUploadIntent] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── fetch assets ────────────────────────────────────────────────────────────
  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/assets`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { assets: AssetDTO[] };
        setAssets(data.assets);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  // ── upload logic ─────────────────────────────────────────────────────────────
  const uploadFile = useCallback(async (file: File, uploadInstruction?: string) => {
    const uploadId = `${Date.now()}-${file.name}`;
    const item: UploadItem = { id: uploadId, filename: file.name, progress: 0, done: false };
    setUploads((prev) => [...prev, item]);

    const update = (patch: Partial<UploadItem>) =>
      setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, ...patch } : u)));

    try {
      const uploadedAsset = await new Promise<AssetDTO>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file, file.name);
        if (uploadInstruction?.trim()) {
          formData.append("description", uploadInstruction.trim());
        }

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = 5 + Math.round((e.loaded / e.total) * 90);
            update({ progress: pct });
          }
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
      setAssets((prev) => [uploadedAsset, ...prev]);

      // Remove upload item after 2s
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.id !== uploadId));
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      update({ error: msg, done: true });
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const instruction = uploadIntent.trim() || undefined;
      Array.from(files).forEach((file) => uploadFile(file, instruction));
    },
    [uploadFile, uploadIntent]
  );

  // ── drag & drop ──────────────────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── asset actions ────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const res = await fetch(`${API_URL}/api/assets/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdate = async (id: string, patch: { name?: string; description?: string }) => {
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

  // ── filtered list ────────────────────────────────────────────────────────────
  const filtered = filter === "all" ? assets : assets.filter((a) => a.type === filter);
  const counts: Record<FilterTab, number> = {
    all: assets.length,
    image: assets.filter((a) => a.type === "image").length,
    video: assets.filter((a) => a.type === "video").length,
    audio: assets.filter((a) => a.type === "audio").length,
    font: assets.filter((a) => a.type === "font").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Upload zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "rgba(157,255,32,0.8)" : "rgba(157,255,32,0.25)"}`,
          borderRadius: 10,
          padding: "28px 20px",
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: dragging ? "rgba(157,255,32,0.06)" : "rgba(255,255,255,0.02)",
          transition: "all 0.15s",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>⬆️</div>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
          <strong style={{ color: "#9DFF20" }}>Haz clic o arrastra archivos</strong> para subir
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          Imágenes, videos, audio y fuentes · Se guardan en Firebase Storage
        </p>
        <textarea
          value={uploadIntent}
          onChange={(e) => setUploadIntent(e.target.value)}
          placeholder="Opcional: explica qué quieres que la IA haga con estos assets al usarlos."
          rows={2}
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 10,
            width: "min(100%, 520px)",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(157,255,32,0.25)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.85)",
            fontSize: 11,
            padding: "8px 10px",
            fontFamily: "inherit",
            resize: "vertical",
            lineHeight: 1.4,
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={TYPE_ACCEPT.all}
          style={{ display: "none" }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Upload progress items */}
      {uploads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {uploads.map((u) => (
            <div
              key={u.id}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: u.error
                  ? "rgba(255,80,80,0.1)"
                  : u.done
                    ? "rgba(157,255,32,0.08)"
                    : "rgba(255,255,255,0.05)",
                border: `1px solid ${u.error ? "rgba(255,80,80,0.3)" : u.done ? "rgba(157,255,32,0.25)" : "rgba(255,255,255,0.1)"}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {u.filename}
              </span>
              {u.error ? (
                <span style={{ fontSize: 11, color: "#ff6b6b", flexShrink: 0 }}>{u.error}</span>
              ) : u.done ? (
                <span style={{ fontSize: 11, color: "#9DFF20", flexShrink: 0 }}>✓ Subido</span>
              ) : (
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 80,
                      height: 4,
                      borderRadius: 2,
                      background: "rgba(255,255,255,0.1)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${u.progress}%`,
                        background: "#9DFF20",
                        transition: "width 0.2s",
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{u.progress}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: filter === tab.key
                ? "1px solid rgba(157,255,32,0.6)"
                : "1px solid rgba(255,255,255,0.12)",
              background: filter === tab.key ? "rgba(157,255,32,0.15)" : "transparent",
              color: filter === tab.key ? "#9DFF20" : "rgba(255,255,255,0.55)",
              fontSize: 12,
              fontWeight: filter === tab.key ? 600 : 400,
              cursor: "pointer",
              letterSpacing: 0.5,
            }}
          >
            {tab.label}
            <span
              style={{
                marginLeft: 6,
                padding: "1px 5px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", margin: "20px 0" }}>
          Cargando assets…
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", margin: "20px 0" }}>
          {filter === "all"
            ? "No hay assets. Sube imágenes, videos o audio para usarlos en tus composiciones."
            : `No hay ${TYPE_LABELS[filter as AssetType]?.toLowerCase()}s subidos.`}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      {/* Storage note */}
      {assets.length > 0 && (
        <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 0.5 }}>
          Almacenado en gs://lait-video-editor.firebasestorage.app · users/&lt;uid&gt;/assets/
        </p>
      )}
    </div>
  );
}
