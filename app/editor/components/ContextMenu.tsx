"use client";

import React, { useEffect, useCallback } from "react";

export interface ContextMenuItem {
  id: string;
  label?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

const MENU_STYLE: React.CSSProperties = {
  position: "fixed",
  zIndex: 9999,
  minWidth: 180,
  padding: "4px 0",
  backgroundColor: "#121214",
  border: "1px solid rgba(157,255,32,0.2)",
  borderRadius: 8,
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  fontSize: 13,
};

const ITEM_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  color: "rgba(255,255,255,0.9)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "background 0.15s",
};

const ITEM_DISABLED: React.CSSProperties = {
  ...ITEM_STYLE,
  color: "rgba(255,255,255,0.35)",
  cursor: "not-allowed",
};

const SEPARATOR_STYLE: React.CSSProperties = {
  height: 1,
  margin: "4px 8px",
  backgroundColor: "rgba(157,255,32,0.15)",
};

const SHORTCUT_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.4)",
  marginLeft: 16,
};

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const handleClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled) return;
      item.onClick?.();
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const t = requestAnimationFrame(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    });

    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      role="menu"
      style={{
        ...MENU_STYLE,
        left: x,
        top: y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) =>
        item.separator ? (
          <div key={item.id} role="separator" style={SEPARATOR_STYLE} />
        ) : (
          <div
            key={item.id}
            role="menuitem"
            style={item.disabled ? ITEM_DISABLED : ITEM_STYLE}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(157,255,32,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
            onClick={() => handleClick(item)}
          >
            {item.label}
            {item.shortcut && (
              <span style={SHORTCUT_STYLE}>{item.shortcut}</span>
            )}
          </div>
        )
      )}
    </div>
  );
}
