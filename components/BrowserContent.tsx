"use client";

interface BrowserContentProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

export default function BrowserContent({
  children,
  isLoading = false,
}: BrowserContentProps) {
  return (
    <div className="browser-content" role="region" aria-label="視覺內容">
      {children}
    </div>
  );
}
