"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { DynamicComposition } from "../../../src/Composition";
import { ComponentPalette } from "./ComponentPalette";
import { Timeline } from "./Timeline";
import { PropertiesPanel } from "./PropertiesPanel";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { createSequenceFromType } from "../../../src/constants/componentPalette";
import { calcTotalDuration } from "../../../src/utils/duration";
import type { CompositionDTO, Sequence } from "../../../src/types";

export type ContextMenuTarget =
  | { type: "track"; sequenceId: string }
  | { type: "timeline-empty"; insertOrder: number; frame: number }
  | { type: "palette-item"; sceneType: import("../../../src/types").SceneType }
  | { type: "preview" };

const API_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3000";

export interface EditorClientProps {
  composition: CompositionDTO | null;
}

let idCounter = 0;
function generateId() {
  return `seq-${Date.now()}-${++idCounter}`;
}

export function EditorClient({ composition: initialComposition }: EditorClientProps) {
  const [composition, setComposition] = useState<CompositionDTO | null>(
    initialComposition
  );
  const [sequences, setSequences] = useState<Sequence[]>(
    initialComposition?.sequences ?? []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: ContextMenuTarget;
  } | null>(null);
  const [clipboard, setClipboard] = useState<{ sequence: Sequence; cut: boolean } | null>(null);
  const playerRef = useRef<PlayerRef>(null);

  const totalDurationInFrames = useMemo(
    () => calcTotalDuration(sequences),
    [sequences]
  );

  const inputProps = useMemo(
    () => ({ sequences }),
    [sequences]
  );

  const handleDrop = useCallback(
    (type: Parameters<typeof createSequenceFromType>[0]) => {
      const startFrame = totalDurationInFrames;
      const newSeq = createSequenceFromType(
        type,
        sequences.length,
        generateId,
        startFrame
      );
      const next = [...sequences, newSeq].map((s, i) => ({ ...s, order: i }));
      setSequences(next);
      setSelectedId(newSeq.id);
    },
    [sequences, totalDurationInFrames]
  );

  const handleSequencesChange = useCallback((next: Sequence[]) => {
    const reordered = next.map((s, i) => ({ ...s, order: i }));
    setSequences(reordered);
  }, []);

  const handleReorder = useCallback(
    (draggedId: string, targetOrder: number) => {
      const idx = sequences.findIndex((s) => s.id === draggedId);
      if (idx < 0 || idx === targetOrder) return;
      const next = [...sequences];
      const [moved] = next.splice(idx, 1);
      next.splice(targetOrder, 0, moved);
      setSequences(next.map((s, i) => ({ ...s, order: i })));
    },
    [sequences]
  );

  const handleMoveInTime = useCallback(
    (sequenceId: string, newFromFrame: number) => {
      setSequences((prev) =>
        prev.map((s) =>
          s.id === sequenceId ? { ...s, from: Math.max(0, newFromFrame) } : s
        )
      );
    },
    []
  );

  const handleSequenceChange = useCallback((updated: Sequence) => {
    setSequences((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!composition?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/compositions/${composition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sequences }),
      });
      if (res.ok) {
        const data = await res.json();
        setComposition(data.composition);
      }
    } catch (err) {
      console.error("Error saving:", err);
    }
  }, [composition?.id, sequences]);

  const handleSeek = useCallback((frame: number) => {
    const maxFrame = Math.max(0, totalDurationInFrames - 1);
    const clamped = Math.max(0, Math.min(frame, maxFrame));
    setCurrentFrame(clamped);
    playerRef.current?.seekTo(clamped);
  }, [totalDurationInFrames]);

  const handleContextMenu = useCallback((e: React.MouseEvent, target: ContextMenuTarget) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, target });
  }, []);

  const handleDuplicateSequence = useCallback(
    (id: string) => {
      const idx = sequences.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const seq = sequences[idx];
      const newSeq: Sequence = {
        ...JSON.parse(JSON.stringify(seq)),
        id: generateId(),
        from: totalDurationInFrames,
      };
      const next = [
        ...sequences.slice(0, idx + 1),
        newSeq,
        ...sequences.slice(idx + 1),
      ].map((s, i) => ({ ...s, order: i }));
      setSequences(next);
      setSelectedId(newSeq.id);
    },
    [sequences, totalDurationInFrames]
  );

  const handleDeleteSequence = useCallback(
    (id: string) => {
      setSequences((prev) => {
        const next = prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }));
        setSelectedId((sel) => (sel === id ? (next[0]?.id ?? null) : sel));
        return next;
      });
      setClipboard((c) => (c?.cut && c.sequence.id === id ? null : c));
    },
    []
  );

  const handleCopySequence = useCallback((id: string) => {
    const seq = sequences.find((s) => s.id === id);
    if (seq) setClipboard({ sequence: JSON.parse(JSON.stringify(seq)), cut: false });
  }, [sequences]);

  const handleCutSequence = useCallback(
    (id: string) => {
      const seq = sequences.find((s) => s.id === id);
      if (seq) {
        setClipboard({ sequence: JSON.parse(JSON.stringify(seq)), cut: true });
        handleDeleteSequence(id);
      }
    },
    [sequences, handleDeleteSequence]
  );

  const handlePasteSequence = useCallback(
    (insertOrder: number) => {
      if (!clipboard) return;
      const newSeq: Sequence = {
        ...JSON.parse(JSON.stringify(clipboard.sequence)),
        id: generateId(),
        order: insertOrder,
        from: totalDurationInFrames,
      };
      const next = sequences
        .map((s) => (s.order >= insertOrder ? { ...s, order: s.order + 1 } : s))
        .concat(newSeq)
        .sort((a, b) => a.order - b.order)
        .map((s, i) => ({ ...s, order: i }));
      setSequences(next);
      setSelectedId(newSeq.id);
      if (clipboard.cut) setClipboard(null);
    },
    [clipboard, sequences, totalDurationInFrames]
  );

  const handleMoveSequenceUp = useCallback(
    (id: string) => {
      const idx = sequences.findIndex((s) => s.id === id);
      if (idx <= 0) return;
      const next = [...sequences];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      setSequences(next.map((s, i) => ({ ...s, order: i })));
    },
    [sequences]
  );

  const handleMoveSequenceDown = useCallback(
    (id: string) => {
      const idx = sequences.findIndex((s) => s.id === id);
      if (idx < 0 || idx >= sequences.length - 1) return;
      const next = [...sequences];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      setSequences(next.map((s, i) => ({ ...s, order: i })));
    },
    [sequences]
  );

  const handleAddFromPalette = useCallback(
    (sceneType: import("../../../src/types").SceneType) => {
      const startFrame = totalDurationInFrames;
      const newSeq = createSequenceFromType(
        sceneType,
        sequences.length,
        generateId,
        startFrame
      );
      const next = [...sequences, newSeq].map((s, i) => ({ ...s, order: i }));
      setSequences(next);
      setSelectedId(newSeq.id);
    },
    [sequences, totalDurationInFrames]
  );

  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    if (!contextMenu) return [];
    const target = contextMenu.target;

    if (target.type === "track") {
      const seq = sequences.find((s) => s.id === target.sequenceId);
      const idx = seq ? sequences.findIndex((s) => s.id === seq.id) : -1;
      const canMoveUp = idx > 0;
      const canMoveDown = idx >= 0 && idx < sequences.length - 1;
      return [
        {
          id: "duplicate",
          label: "Duplicar",
          shortcut: "Ctrl+D",
          onClick: () => handleDuplicateSequence(target.sequenceId),
        },
        { id: "sep1", separator: true },
        { id: "cut", label: "Cortar", shortcut: "Ctrl+X", onClick: () => handleCutSequence(target.sequenceId) },
        { id: "copy", label: "Copiar", shortcut: "Ctrl+C", onClick: () => handleCopySequence(target.sequenceId) },
        {
          id: "paste",
          label: "Pegar",
          shortcut: "Ctrl+V",
          disabled: !clipboard,
          onClick: () => seq && handlePasteSequence(seq.order + 1),
        },
        { id: "sep2", separator: true },
        {
          id: "move-up",
          label: "Mover arriba",
          disabled: !canMoveUp,
          onClick: () => handleMoveSequenceUp(target.sequenceId),
        },
        {
          id: "move-down",
          label: "Mover abajo",
          disabled: !canMoveDown,
          onClick: () => handleMoveSequenceDown(target.sequenceId),
        },
        { id: "sep3", separator: true },
        {
          id: "delete",
          label: "Eliminar",
          shortcut: "Supr",
          onClick: () => handleDeleteSequence(target.sequenceId),
        },
      ];
    }

    if (target.type === "timeline-empty") {
      return [
        {
          id: "paste",
          label: "Pegar aquí",
          shortcut: "Ctrl+V",
          disabled: !clipboard,
          onClick: () => handlePasteSequence(target.insertOrder),
        },
        {
          id: "add-insight",
          label: "Añadir insight",
          onClick: () => handleAddFromPalette("insight"),
        },
        {
          id: "add-image",
          label: "Añadir imagen",
          onClick: () => handleAddFromPalette("image"),
        },
        {
          id: "add-video",
          label: "Añadir video",
          onClick: () => handleAddFromPalette("video"),
        },
      ];
    }

    if (target.type === "palette-item") {
      return [
        {
          id: "add",
          label: "Añadir al final",
          onClick: () => handleAddFromPalette(target.sceneType),
        },
      ];
    }

    if (target.type === "preview") {
      return [
        {
          id: "deselect",
          label: "Deseleccionar",
          onClick: () => setSelectedId(null),
        },
        {
          id: "paste",
          label: "Pegar al final",
          shortcut: "Ctrl+V",
          disabled: !clipboard,
          onClick: () => handlePasteSequence(sequences.length),
        },
      ];
    }

    return [];
  }, [
    contextMenu,
    sequences,
    clipboard,
    handleDuplicateSequence,
    handleCutSequence,
    handleCopySequence,
    handlePasteSequence,
    handleMoveSequenceUp,
    handleMoveSequenceDown,
    handleDeleteSequence,
    handleAddFromPalette,
  ]);

  useEffect(() => {
    const maxFrame = Math.max(0, totalDurationInFrames - 1);
    if (currentFrame > maxFrame) {
      setCurrentFrame(maxFrame);
      playerRef.current?.seekTo(maxFrame);
    }
  }, [totalDurationInFrames, currentFrame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "c") {
        e.preventDefault();
        handleCopySequence(selectedId);
      } else if (isMod && e.key === "x") {
        e.preventDefault();
        handleCutSequence(selectedId);
      } else if (isMod && e.key === "v") {
        e.preventDefault();
        const seq = sequences.find((s) => s.id === selectedId);
        if (seq) handlePasteSequence(seq.order + 1);
        else handlePasteSequence(sequences.length);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSequence(selectedId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedId,
    sequences,
    handleCopySequence,
    handleCutSequence,
    handlePasteSequence,
    handleDeleteSequence,
  ]);

  const selectedSequence = useMemo(
    () => sequences.find((s) => s.id === selectedId) ?? null,
    [sequences, selectedId]
  );

  const fps = composition?.fps ?? 30;
  const width = composition?.width ?? 1920;
  const height = composition?.height ?? 1080;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#050508",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid rgba(157,255,32,0.15)",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#9DFF20",
              letterSpacing: 2,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {composition?.title ?? "Editor"}
          </h1>
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              margin: "2px 0 0",
            }}
          >
            {!composition
              ? "Sin composición — crea una desde el dashboard para guardar"
              : `${sequences.length} secuencias · ${(totalDurationInFrames / fps).toFixed(1)}s`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/dashboard"
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              textDecoration: "none",
            }}
          >
            Dashboard
          </a>
          <button
            type="button"
            onClick={handleSave}
            disabled={!composition?.id}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(157,255,32,0.4)",
              background: composition?.id
                ? "rgba(157,255,32,0.1)"
                : "rgba(255,255,255,0.05)",
              color: composition?.id ? "#9DFF20" : "rgba(255,255,255,0.4)",
              fontSize: 12,
              cursor: composition?.id ? "pointer" : "not-allowed",
            }}
          >
            Guardar
          </button>
          <a
            href={process.env.NEXT_PUBLIC_STUDIO_URL ?? "http://localhost:3001"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: "rgba(157,255,32,0.8)",
              textDecoration: "none",
            }}
          >
            Remotion Studio →
          </a>
        </div>
      </header>

      {/* Main layout */}
      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
        }}
      >
        <ComponentPalette
          onContextMenu={(e, sceneType) =>
            handleContextMenu(e, { type: "palette-item", sceneType })
          }
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {/* Preview */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              minHeight: 0,
            }}
            onContextMenu={(e) => handleContextMenu(e, { type: "preview" })}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 960,
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 0 0 1px rgba(157,255,32,0.15)",
              }}
            >
              <Player
                ref={playerRef as React.RefObject<never>}
                component={DynamicComposition}
                inputProps={inputProps}
                durationInFrames={Math.max(1, totalDurationInFrames)}
                fps={fps}
                compositionWidth={width}
                compositionHeight={height}
                style={{ width: "100%" }}
                controls
                loop
                clickToPlay
                acknowledgeRemotionLicense
              />
            </div>
          </div>

          <Timeline
            sequences={sequences}
            fps={fps}
            totalDurationInFrames={Math.max(1, totalDurationInFrames)}
            currentFrame={currentFrame}
            onSeek={handleSeek}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDrop={handleDrop}
            onChange={handleSequencesChange}
            onReorder={handleReorder}
            onMoveInTime={handleMoveInTime}
            onContextMenu={handleContextMenu}
          />
        </div>

        <PropertiesPanel
          sequence={selectedSequence}
          onChange={handleSequenceChange}
        />
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
