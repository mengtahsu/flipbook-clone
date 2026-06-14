"use client";

interface BrowserShellProps {
  children: React.ReactNode;
}

export default function BrowserShell({ children }: BrowserShellProps) {
  return (
    <main className="page-shell">
      <section className="browser-stage" aria-label="Flipbook browser">
        <section className="browser-window">{children}</section>
        <p className="browser-stage-caption">
          點擊圖片任意位置深入探索
        </p>
      </section>
    </main>
  );
}
