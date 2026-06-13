"use client";

export default function LoadingSpinner() {
  return (
    <div className="loading-container" role="status" aria-label="Loading">
      <div className="loading-spinner" />
      <p className="loading-text">Generating your page...</p>
    </div>
  );
}
