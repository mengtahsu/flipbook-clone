"use client";

const VERSION = "2026-06-14.pexels";

export default function AboutSection() {
  return (
    <section className="about-section" aria-label="About this experiment">
      <h1 className="about-title">
        Flipbook Clone — visual browser. Type a query, get an image, click to explore deeper.
      </h1>

      <p className="about-authors">
        Inspired by{" "}
        <a href="https://flipbook.page" target="_blank" rel="noreferrer">
          flipbook.page
        </a>
        {" "}&middot; Images: DuckDuckGo &middot; LLM: DeepSeek
      </p>

      <div className="about-body">
        <p>
          Every &ldquo;page&rdquo; is a photo from DuckDuckGo paired with AI-generated context.
          Click anywhere and the system finds the nearest region, generating a new page that
          explores that topic in depth. Up to 8 layers deep.
        </p>
      </div>

      <p className="version-tag">v{VERSION}</p>
    </section>
  );
}
