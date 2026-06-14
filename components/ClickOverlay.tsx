"use client";

import { useState, useCallback, useRef } from "react";

interface ClickOverlayProps {
  enabled: boolean;
  onClick: (xPercent: number, yPercent: number) => void;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function ClickOverlay({ enabled, onClick }: ClickOverlayProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

      // Add ripple animation
      const id = nextId.current++;
      setRipples((prev) => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 500);

      onClick(xPercent, yPercent);
    },
    [enabled, onClick]
  );

  return (
    <div
      className={`click-overlay${!enabled ? " click-overlay--disabled" : ""}`}
      onClick={handleClick}
      role={enabled ? "button" : "presentation"}
      aria-label={enabled ? "點擊探索此區域" : undefined}
    >
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="click-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </div>
  );
}
