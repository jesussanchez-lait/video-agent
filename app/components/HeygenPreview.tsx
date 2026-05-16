"use client";

import { useEffect, useRef, useState } from "react";
import type { CompositionDTO } from "../../src/types";

interface HeygenPreviewProps {
  composition: CompositionDTO;
}

export function HeygenPreview({ composition }: HeygenPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    composition.heygen?.previewHtmlUrl ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!composition.heygen?.previewHtmlUrl);

  useEffect(() => {
    if (composition.heygen?.previewHtmlUrl) {
      setPreviewUrl(composition.heygen.previewHtmlUrl);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/heygen/preview/${composition.id}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al cargar preview");
        if (!cancelled) setPreviewUrl(data.previewUrl);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error de preview");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [composition.id, composition.heygen?.previewHtmlUrl]);

  useEffect(() => {
    if (!previewUrl || !containerRef.current) return;

    const container = containerRef.current;

    (async () => {
      try {
        await import("@hyperframes/player");
      } catch {
        // iframe fallback
      }

      container.innerHTML = "";
      const el = document.createElement("hyperframes-player");
      el.setAttribute("src", previewUrl);
      el.setAttribute("controls", "");
      el.style.width = "100%";
      el.style.display = "block";
      el.style.aspectRatio = `${composition.width} / ${composition.height}`;
      el.style.maxHeight = "70vh";
      container.appendChild(el);
    })();

    return () => {
      container.innerHTML = "";
    };
  }, [previewUrl, composition.width, composition.height]);

  if (loading) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: "center",
          color: "rgba(255,255,255,0.5)",
          fontSize: 14,
        }}
      >
        Cargando preview HyperFrames…
      </div>
    );
  }

  if (error || !previewUrl) {
    return (
      <div
        style={{
          padding: 32,
          borderRadius: 12,
          border: "1px dashed rgba(255,180,80,0.4)",
          background: "rgba(255,180,80,0.06)",
          color: "rgba(255,200,120,0.9)",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {error ?? "Preview no disponible. Genera la composición con motor HeyGen."}
        <p style={{ margin: "12px 0 0" }}>
          <a
            href={`/compositions/${composition.id}/preview-heygen`}
            style={{ color: "#9DFF20" }}
          >
            Abrir preview en pantalla completa
          </a>
        </p>
      </div>
    );
  }

  const segmentCount = composition.heygen?.plan?.segments.length ?? 0;

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
      <div ref={containerRef} />
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: 1,
        }}
      >
        HeyGen · HyperFrames · {segmentCount} segmentos
      </p>
    </div>
  );
}
