"use client";

const VERSION = "2026-06-14.ios-btn";

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
        {" "}&middot; 圖片：DuckDuckGo &middot; LLM：DeepSeek
      </p>

      <div className="about-body">
        <p>
          每個「頁面」都是一張來自 DuckDuckGo 的照片，搭配 AI 生成的上下文。
          點擊任意位置，系統會找到最近的區域，生成一個深入探索該主題的新頁面。
          最多可達 8 層深度。
        </p>
      </div>

      <p className="version-tag">v{VERSION}</p>
    </section>
  );
}
