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
          Click anywhere on the image to explore deeper
        </p>
      </section>
    </main>
  );
}
