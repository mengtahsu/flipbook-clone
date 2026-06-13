"use client";

import { useState, useCallback, useRef } from "react";
import ClickOverlay from "./ClickOverlay";
import DepthIndicator from "./DepthIndicator";
import LoadingSpinner from "./LoadingSpinner";
import type { PageData } from "@/lib/types";

interface ImageCanvasProps {
  page: PageData | null;
  depth: number;
  maxDepth: number;
  isLoading: boolean;
  error: string | null;
  onImageClick: (x: number, y: number, w: number, h: number, crop: string | null) => void;
  onSubtopicClick?: (topic: string) => void;
}

function cropAround(image: HTMLImageElement, xPct: number, yPct: number, size = 300): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const sx = (xPct / 100) * image.naturalWidth - size / 2;
    const sy = (yPct / 100) * image.naturalHeight - size / 2;
    ctx.drawImage(image, sx, sy, size, size, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.75);
  } catch {
    return null; // cross-origin image — fall back to coord-only
  }
}

export default function ImageCanvas({
  page, depth, maxDepth, isLoading, error,
  onImageClick, onSubtopicClick,
}: ImageCanvasProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const handleClick = useCallback(
    (xPct: number, yPct: number) => {
      if (!imageRef.current) return;
      const img = imageRef.current;
      const crop = cropAround(img, xPct, yPct);
      onImageClick(xPct, yPct, img.naturalWidth, img.naturalHeight, crop);
    },
    [onImageClick]
  );

  const atMaxDepth = depth >= maxDepth;
  const showEmptyState = !page && !isLoading;

  return (
    <div className={`browser-canvas${isLoading ? " browser-canvas--loading" : ""}`}>
      {isLoading && <LoadingSpinner />}
      {error && <div className="error-banner" role="alert">{error}</div>}

      {showEmptyState && (
        <div className="empty-state" style={{ color: "white" }}>
          <div className="empty-state-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <p className="empty-state-title">Type something in the search bar to begin.</p>
          <p className="empty-state-body">Every result is a visual page. Click on anything that interests you to explore deeper.</p>
        </div>
      )}

      {page && (
        <div className="result-frame">
          {page.imageUrl ? (
            <img
              ref={imageRef}
              crossOrigin="anonymous"
              className={`result-image${!isImageLoaded ? " result-image--loading" : ""}`}
              src={page.imageUrl}
              alt={page.title}
              draggable={false}
              onLoad={() => setIsImageLoaded(true)}
              onError={(e) => {
                const img = e.currentTarget;
                const tried = parseInt(img.dataset.tried || "1", 10);
                // Try adding cache-bust to retry same URL once
                if (tried === 1) {
                  img.dataset.tried = "2";
                  img.src = img.src.includes("?") ? img.src + "&r=1" : img.src + "?r=1";
                }
              }}
            />
          ) : (
            <LoadingSpinner />
          )}

          {(isImageLoaded || !page.imageUrl) && (
            <>
              <DepthIndicator depth={depth} maxDepth={maxDepth} />

              <ClickOverlay
                enabled={!isLoading && !atMaxDepth && isImageLoaded}
                onClick={handleClick}
              />

              {atMaxDepth && (
                <div className="error-banner" style={{ background: "oklch(75% 0.14 95)", color: "var(--color-text)" }}>
                  Max depth {maxDepth} layers. Click a breadcrumb to go back.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
