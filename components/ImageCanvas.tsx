"use client";

import { useState, useCallback, useRef } from "react";
import ClickOverlay from "./ClickOverlay";
import InfoPanel from "./InfoPanel";
import DepthIndicator from "./DepthIndicator";
import LoadingSpinner from "./LoadingSpinner";
import type { PageData } from "@/lib/types";

interface ImageCanvasProps {
  page: PageData | null;
  depth: number;
  maxDepth: number;
  isLoading: boolean;
  error: string | null;
  onImageClick: (x: number, y: number, imageWidth: number, imageHeight: number) => void;
}

export default function ImageCanvas({
  page,
  depth,
  maxDepth,
  isLoading,
  error,
  onImageClick,
}: ImageCanvasProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const handleClick = useCallback(
    (xPercent: number, yPercent: number) => {
      if (!imageRef.current) return;
      const { naturalWidth, naturalHeight } = imageRef.current;
      onImageClick(xPercent, yPercent, naturalWidth, naturalHeight);
    },
    [onImageClick]
  );

  const atMaxDepth = depth >= maxDepth;
  const showEmptyState = !page && !isLoading;

  return (
    <div className={`browser-canvas${isLoading ? " browser-canvas--loading" : ""}`}>
      {/* Loading state */}
      {isLoading && <LoadingSpinner />}

      {/* Error state */}
      {error && <div className="error-banner" role="alert">{error}</div>}

      {/* Empty state */}
      {showEmptyState && (
        <div className="empty-state" style={{ color: "white" }}>
          <div className="empty-state-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <p className="empty-state-title">
            Type something in the search bar to begin.
          </p>
          <p className="empty-state-body">
            Every result is a visual page. Click on anything that interests you to explore deeper.
          </p>
        </div>
      )}

      {/* Image + overlays */}
      {page && (
        <div className="result-frame">
          <img
            ref={imageRef}
            className={`result-image${!isImageLoaded ? " result-image--loading" : ""}`}
            src={page.imageUrl}
            alt={page.title}
            draggable={false}
            onLoad={() => setIsImageLoaded(true)}
          />

          {isImageLoaded && (
            <>
              {/* Depth indicator dots */}
              <DepthIndicator depth={depth} maxDepth={maxDepth} />

              {/* Transparent click surface */}
              <ClickOverlay
                enabled={!isLoading && !atMaxDepth}
                onClick={handleClick}
              />

              {/* Info panel overlay */}
              <InfoPanel
                title={page.title}
                description={page.description}
                credit={page.imageCredit}
                subtopics={page.subtopics}
              />

              {/* Max depth warning */}
              {atMaxDepth && (
                <div className="error-banner" style={{ background: "oklch(75% 0.14 95)", color: "var(--color-text)" }}>
                  Maximum depth reached ({maxDepth} layers). Click a breadcrumb to go back, or start a new search.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
