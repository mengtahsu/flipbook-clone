"use client";

export default function AboutSection() {
  return (
    <section className="about-section" aria-label="About this experiment">
      <h1 className="about-title">
        Flipbook Clone is a visual browser — type a query, get an image, click to explore deeper.
      </h1>

      <p className="about-authors">
        Built as an experimental prototype, inspired by{" "}
        <a href="https://flipbook.page" target="_blank" rel="noreferrer">
          flipbook.page
        </a>
      </p>

      <div className="about-body">
        <p>
          Every &ldquo;page&rdquo; is a real photograph paired with AI-generated context. Click
          anywhere on the image and the system will infer what you clicked on, generating a new
          page that explores that topic in more depth.
        </p>

        <h2 className="about-section-title">How does it work?</h2>
        <p>
          When you search, an LLM breaks down your query into a title, description, and image
          search terms. A relevant photo is fetched from Unsplash. When you click on the image,
          the LLM interprets the click position and generates a new sub-query for deeper
          exploration.
        </p>

        <h2 className="about-section-title">Limitations</h2>
        <p>
          This is a prototype with a maximum depth of 4 layers. It uses real photographs
          rather than AI-generated infographics (the original flipbook.page uses custom image
          models to render all content as pixels). Image selection is limited by Unsplash&rsquo;s
          catalog — abstract concepts may not have great matching photos.
        </p>

        <h2 className="about-section-title">What comes next?</h2>
        <p>
          As image generation models become faster and cheaper, the photos could be replaced
          with custom AI-generated infographics, making the experience more like the original
          flipbook.page — where every page is a bespoke visual designed just for you.
        </p>
      </div>
    </section>
  );
}
