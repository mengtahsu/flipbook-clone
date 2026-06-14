"use client";

export default function LoadingSpinner() {
  return (
    <div className="loading-container" role="status" aria-label="Loading">
      <div className="loading-spinner" />
      <p className="loading-text">正在生成頁面...</p>
    </div>
  );
}
