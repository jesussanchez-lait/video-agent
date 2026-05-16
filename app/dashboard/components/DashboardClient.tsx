"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VideoPlayer from "../../VideoPlayer";
import { CompositionChat } from "./CompositionChat";
import { ConfirmModal } from "./ConfirmModal";
import type { CompositionDTO } from "../../../src/types";

export interface DashboardClientProps {
  compositions: CompositionDTO[];
  firebaseCredentialError: boolean;
}

export function DashboardClient({
  compositions: initialCompositions,
  firebaseCredentialError,
}: DashboardClientProps) {
  const router = useRouter();
  const [compositions, setCompositions] = useState(initialCompositions);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCompositions[0]?.id ?? null
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renderingId, setRenderingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    setCompositions(initialCompositions);
    setSelectedId((prev) => {
      if (pendingSelectId && initialCompositions.some((c) => c.id === pendingSelectId)) {
        setPendingSelectId(null);
        return pendingSelectId;
      }
      const exists = initialCompositions.some((c) => c.id === prev);
      return exists ? prev : initialCompositions[0]?.id ?? null;
    });
  }, [initialCompositions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompositionCreated = (compositionId: string) => {
    setPendingSelectId(compositionId);
    setChatOpen(false);
    router.refresh();
  };

  const handleDownload = async (
    e: React.MouseEvent,
    compositionId: string,
    title: string,
    engine?: CompositionDTO["renderEngine"]
  ) => {
    e.stopPropagation();
    setRenderingId(compositionId);
    try {
      const endpoint =
        engine === "heygen"
          ? `/api/render-heygen/${compositionId}`
          : `/api/render/${compositionId}`;
      const res = await fetch(endpoint, {
        method: engine === "heygen" ? "POST" : "GET",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAlertModal({ title: "Error al renderizar", message: data.error ?? "No se pudo renderizar el video." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setRenderingId(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, compositionId: string, title: string) => {
    e.stopPropagation();
    setConfirmDelete({ id: compositionId, title });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      const res = await fetch(`/api/compositions/${confirmDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setConfirmDelete(null);
        setAlertModal({ title: "Error al eliminar", message: data.error ?? "No se pudo eliminar la composición." });
        return;
      }
      setCompositions((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setSelectedId((prev) =>
        prev === confirmDelete.id ? compositions.find((c) => c.id !== confirmDelete.id)?.id ?? null : prev
      );
      setConfirmDelete(null);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const selected = compositions.find((c) => c.id === selectedId) ?? compositions[0];

  return (
    <>
      {firebaseCredentialError && (
        <div
          style={{
            width: "100%",
            maxWidth: 960,
            padding: 16,
            borderRadius: 8,
            background: "rgba(255,100,100,0.15)",
            border: "1px solid rgba(255,100,100,0.3)",
            color: "#ff6b6b",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong>Error de credenciales Firebase</strong>
          <p style={{ margin: "8px 0 0", opacity: 0.9 }}>
            (1) Sincroniza la hora del sistema. (2) Regenera la clave en Firebase
            Console → Configuración → Cuentas de servicio → Generar nueva clave
            privada. Sustituye el archivo JSON en la raíz del proyecto.
          </p>
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 960,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => setChatOpen(true)}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid rgba(157,255,32,0.5)",
                background: "rgba(157,255,32,0.15)",
                color: "#9DFF20",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>+</span>
              Nueva composición
            </button>
          </div>

          {compositions.length > 0 && (
            <div
              style={{
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                overflow: "hidden",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    {["Título", "Motor", "Escenas", "Duración", "Resolución", "FPS", "Estado"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: 1 }}>
                        {h}
                      </th>
                    ))}
                    <th style={{ textAlign: "right", padding: "12px 16px", color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: 1 }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compositions.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        cursor: "pointer",
                        background: selectedId === c.id ? "rgba(157,255,32,0.08)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "12px 16px", color: selectedId === c.id ? "#9DFF20" : "#fff", fontWeight: selectedId === c.id ? 600 : 400 }}>
                        {c.title}
                      </td>
                      <td style={{ padding: "12px 16px", color: c.renderEngine === "heygen" ? "#64b4ff" : "rgba(255,255,255,0.6)", fontSize: 11, textTransform: "uppercase" }}>
                        {c.renderEngine === "heygen" ? "HeyGen" : "Remotion"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.8)" }}>
                        {c.renderEngine === "heygen"
                          ? (c.heygen?.plan?.segments.length ?? 0)
                          : c.sequences.length}
                      </td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.8)" }}>{(c.totalDurationInFrames / c.fps).toFixed(1)}s</td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.8)" }}>{c.width}×{c.height}</td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.8)" }}>{c.fps}</td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.7)", textTransform: "capitalize" }}>{c.status}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          {c.renderEngine === "heygen" ? (
                            <a
                              href={`/compositions/${c.id}/preview-heygen`}
                              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(100,180,255,0.4)", background: "rgba(100,180,255,0.08)", color: "#64b4ff", fontSize: 12, textDecoration: "none", letterSpacing: 0.5 }}
                            >
                              Preview
                            </a>
                          ) : (
                            <a
                              href={`/editor?id=${c.id}`}
                              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(157,255,32,0.3)", background: "rgba(157,255,32,0.08)", color: "#9DFF20", fontSize: 12, textDecoration: "none", letterSpacing: 0.5 }}
                            >
                              Editar
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDownload(e, c.id, c.title, c.renderEngine)}
                            disabled={!!renderingId}
                            title={c.renderEngine === "heygen" ? "Export MP4 (Fase 2 — requiere worker)" : "Renderizar y descargar MP4"}
                            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(100,160,255,0.4)", background: "rgba(100,160,255,0.08)", color: "#64a0ff", fontSize: 12, cursor: renderingId ? "wait" : "pointer", letterSpacing: 0.5, opacity: renderingId ? 0.7 : 1 }}
                          >
                            {renderingId === c.id ? "Renderizando…" : "↓ MP4"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, c.id, c.title)}
                            disabled={deletingId === c.id}
                            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,120,120,0.4)", background: "rgba(255,120,120,0.08)", color: "#ff7878", fontSize: 12, cursor: deletingId === c.id ? "wait" : "pointer", letterSpacing: 0.5, opacity: deletingId === c.id ? 0.7 : 1 }}
                          >
                            {deletingId === c.id ? "…" : "Borrar"}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <VideoPlayer composition={selected} />

        {selected && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {selected.renderEngine === "heygen" ? (
              <a
                href={`/compositions/${selected.id}/preview-heygen`}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(100,180,255,0.4)", background: "rgba(100,180,255,0.08)", color: "#64b4ff", fontSize: 13, textDecoration: "none", letterSpacing: 1 }}
              >
                Preview HyperFrames
              </a>
            ) : (
              <a
                href={`/editor?id=${selected.id}`}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(157,255,32,0.3)", background: "rgba(157,255,32,0.08)", color: "#9DFF20", fontSize: 13, textDecoration: "none", letterSpacing: 1 }}
              >
                Editar en Remotion Studio
              </a>
            )}
            <button
              type="button"
              onClick={(e) => handleDownload(e, selected.id, selected.title, selected.renderEngine)}
              disabled={!!renderingId}
              title={selected.renderEngine === "heygen" ? "Requiere HYPERFRAMES_RENDER_WORKER_URL (Fase 2)" : undefined}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(100,160,255,0.4)", background: "rgba(100,160,255,0.08)", color: "#64a0ff", fontSize: 13, cursor: renderingId ? "wait" : "pointer", letterSpacing: 1, opacity: renderingId ? 0.7 : 1 }}
            >
              {renderingId === selected.id ? "Renderizando… (puede tardar)" : "↓ Descargar MP4"}
            </button>
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, letterSpacing: 1, margin: 0 }}>
              {selected.renderEngine === "heygen" ? "HeyGen" : "Remotion"} ·{" "}
              {selected.renderEngine === "heygen"
                ? `${selected.heygen?.plan?.segments.length ?? 0} segmentos`
                : `${selected.sequences.length} escenas`}{" "}
              · {(selected.totalDurationInFrames / selected.fps).toFixed(1)}s ·{" "}
              {selected.width}×{selected.height} · {selected.fps}fps
            </p>
          </div>
        )}

        {compositions.length === 0 && (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center" }}>
            No hay composiciones. Haz clic en &quot;Nueva composición&quot; y describe tu video en el chat.
          </p>
        )}
      </div>

      <CompositionChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onCreated={handleCompositionCreated}
      />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar composición"
        message={confirmDelete ? `¿Eliminar la composición "${confirmDelete.title}"? Esta acción no se puede deshacer.` : ""}
        variant="confirm"
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmDelete ? handleConfirmDelete : undefined}
        confirmLoading={deletingId === confirmDelete?.id}
      />

      <ConfirmModal
        open={!!alertModal}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title ?? ""}
        message={alertModal?.message ?? ""}
        variant="alert"
      />
    </>
  );
}
