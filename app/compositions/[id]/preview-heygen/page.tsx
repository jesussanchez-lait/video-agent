"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PreviewHeygenPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`/api/heygen/preview/${id}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar el preview");
        return;
      }
      setPreviewUrl(data.previewUrl);
      setTitle(data.plan?.title ?? "Preview HeyGen");
    })();
  }, [id]);

  useEffect(() => {
    if (!previewUrl || !containerRef.current) return;
    const container = containerRef.current;
    (async () => {
      try {
        await import("@hyperframes/player");
      } catch {
        /* fallback */
      }
      container.innerHTML = "";
      const el = document.createElement("hyperframes-player");
      el.setAttribute("src", previewUrl);
      el.setAttribute("controls", "");
      el.style.width = "100%";
      el.style.minHeight = "70vh";
      container.appendChild(el);
    })();
    return () => {
      container.innerHTML = "";
    };
  }, [previewUrl]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#fff",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 18, color: "#9DFF20", letterSpacing: 2 }}>
            {title || "HyperFrames Preview"}
          </h1>
          <Link
            href="/dashboard"
            style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}
          >
            ← Dashboard
          </Link>
        </div>

        {error && (
          <p style={{ color: "#ff6b6b", fontSize: 14 }}>{error}</p>
        )}

        {!error && !previewUrl && (
          <p style={{ color: "rgba(255,255,255,0.5)" }}>Cargando…</p>
        )}

        <div ref={containerRef} />

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          Exportar MP4 en cloud — próximamente (Fase 2). Usa el botón en dashboard cuando esté
          disponible.
        </p>

        <button
          type="button"
          onClick={() => router.back()}
          style={{
            alignSelf: "flex-start",
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Volver
        </button>
      </div>
    </div>
  );
}
