"use client";

interface DepthIndicatorProps {
  depth: number;
  maxDepth: number;
}

export default function DepthIndicator({ depth, maxDepth }: DepthIndicatorProps) {
  return (
    <div className="depth-indicator" aria-label={`Layer ${depth} of ${maxDepth}`}>
      {Array.from({ length: maxDepth }, (_, i) => {
        const dotIndex = i + 1;
        const isActive = dotIndex === depth;
        const isVisited = dotIndex < depth;

        return (
          <div
            key={i}
            className={`depth-dot${isActive ? " depth-dot--active" : ""}${isVisited ? " depth-dot--visited" : ""}`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
