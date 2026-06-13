"use client";

interface BreadcrumbBarProps {
  breadcrumbs: string[];
  onBreadcrumbClick: (index: number) => void;
}

export default function BreadcrumbBar({
  breadcrumbs,
  onBreadcrumbClick,
}: BreadcrumbBarProps) {
  if (breadcrumbs.length === 0) return null;

  return (
    <nav className="browser-breadcrumb" aria-label="Exploration history">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <span key={index} className="browser-breadcrumb-item">
            {index > 0 && (
              <span className="browser-breadcrumb-separator" aria-hidden="true">
                /
              </span>
            )}
            <button
              type="button"
              className={`browser-breadcrumb-button${isLast ? " browser-breadcrumb-button--active" : ""}`}
              onClick={() => onBreadcrumbClick(index)}
              aria-current={isLast ? "page" : undefined}
            >
              {crumb}
            </button>
          </span>
        );
      })}
      <span className="browser-breadcrumb-separator" aria-hidden="true">
        /
      </span>
    </nav>
  );
}
