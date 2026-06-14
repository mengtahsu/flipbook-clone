"use client";

interface BrowserShellProps {
  children: React.ReactNode;
  embed?: boolean;
}

export default function BrowserShell({ children, embed }: BrowserShellProps) {
  return (
    <main className={`page-shell${embed ? " page-shell--embed" : ""}`}>
      <section className="browser-stage" aria-label="Flipbook browser">
        <section className="browser-window">{children}</section>
        {!embed && (
          <p className="browser-stage-caption">
            點擊圖片任意位置深入探索
          </p>
        )}
      </section>
    </main>
  );
}
