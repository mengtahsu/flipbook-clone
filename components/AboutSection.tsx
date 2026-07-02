"use client";

const VERSION = "2026-07-02.gemini-serper";

export default function AboutSection() {
  return (
    <section className="about-section" aria-label="關於此實驗">
      <h1 className="about-title">
        Flipbook Clone — 視覺瀏覽器。輸入關鍵詞，獲得圖片，點擊深入探索。
      </h1>

      <p className="about-authors">
        靈感來自{" "}
        <a href="https://flipbook.page" target="_blank" rel="noreferrer">
          flipbook.page
        </a>
        {" "}&middot; 圖片：Google（Serper）&middot; LLM：Gemini
      </p>

      <div className="about-body">
        <p>
          每個「頁面」都是一張來自 Google 的照片，搭配 AI 生成的上下文。
          點擊圖片任意位置，Gemini 會「看」你點到的區塊，生成一個深入探索該主題的新頁面。
          最多可達 8 層深度。
        </p>
      </div>

      <p className="version-tag">v{VERSION}</p>
    </section>
  );
}
