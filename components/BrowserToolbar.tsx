"use client";

import BreadcrumbBar from "./BreadcrumbBar";
import SearchInput from "./SearchInput";

interface BrowserToolbarProps {
  breadcrumbs: string[];
  onBreadcrumbClick: (index: number) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function BrowserToolbar({
  breadcrumbs,
  onBreadcrumbClick,
  onSearch,
  onClear,
  isLoading,
  placeholder = "輸入任意關鍵詞探索",
}: BrowserToolbarProps) {
  const hasHistory = breadcrumbs.length > 0;

  return (
    <header className="browser-toolbar">
      {/* Window controls */}
      <div className="browser-controls" aria-hidden="true">
        {hasHistory ? (
          <button
            type="button"
            className="browser-close-button"
            onClick={onClear}
            aria-label="清除瀏覽歷史"
            title="清除歷史"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 3L9 9M9 3L3 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          <span className="browser-dot browser-dot--close" />
        )}
        <span className="browser-dot browser-dot--minimize" />
        <span className="browser-dot browser-dot--maximize" />
      </div>

      {/* Address bar */}
      <form
        className="browser-address-form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector("input") as HTMLInputElement;
          if (input && input.value.trim()) {
            onSearch(input.value.trim());
          }
        }}
      >
        <div className="browser-address-bar">
          <BreadcrumbBar
            breadcrumbs={breadcrumbs}
            onBreadcrumbClick={onBreadcrumbClick}
          />
          <SearchInput
            disabled={isLoading}
            placeholder={
              hasHistory ? "繼續探索" : placeholder
            }
            onSearch={onSearch}
          />
        </div>

        {/* Share button */}
        <button
          type="button"
          className="browser-share-button"
          aria-label="分享"
          title="分享"
          onClick={() => {
            const url = new URL(window.location.href);
            navigator.clipboard.writeText(url.toString()).catch(() => {});
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 14.5V4.25" />
            <path d="M8.75 7.5 12 4.25 15.25 7.5" />
            <path d="M7.25 9.75v7a2 2 0 0 0 2 2h5.5a2 2 0 0 0 2-2v-7" />
          </svg>
        </button>
      </form>
    </header>
  );
}
