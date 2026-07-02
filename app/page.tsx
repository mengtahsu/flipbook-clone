"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import BrowserShell from "@/components/BrowserShell";
import BrowserToolbar from "@/components/BrowserToolbar";
import BrowserContent from "@/components/BrowserContent";
import ImageCanvas from "@/components/ImageCanvas";
import InfoPanel from "@/components/InfoPanel";
import AboutSection from "@/components/AboutSection";
import { MAX_DEPTH } from "@/lib/constants";
import type { PageData } from "@/lib/types";

type ImgResult = { imageUrl: string; imageCredit: { name: string; url: string } } | null;

async function fetchBestImage(imageSearchTerm: string, usedUrls: Set<string>) {
  // Preload a few candidates, return the first that actually loads (via the
  // /api/img proxy, with a direct-URL fallback for CORS). Serper and DDG both
  // return relevance-ranked results, so we keep their order.
  const pickLoadable = (results: { url: string; source?: string }[], fallbackName: string): Promise<ImgResult> => {
    const top = results.slice(0, 6);
    let settled = false;
    return Promise.race(
      top.map((r) =>
        new Promise<ImgResult>((resolve) => {
          const proxyUrl = `/api/img?url=${encodeURIComponent(r.url)}`;
          if (usedUrls.has(proxyUrl)) { resolve(null); return; }
          const done = (val: ImgResult) => { if (!settled) { settled = true; resolve(val); } };
          setTimeout(() => done(null), 10000);
          const img = new Image();
          img.onload = () => done({ imageUrl: proxyUrl, imageCredit: { name: r.source || fallbackName, url: r.url } });
          img.onerror = () => {
            const img2 = new Image();
            img2.onload = () => done({ imageUrl: r.url, imageCredit: { name: r.source || fallbackName, url: r.url } });
            img2.onerror = () => done(null);
            img2.src = r.url;
          };
          img.src = proxyUrl;
        })
      )
    );
  };

  // Serper (Google Images) first for accuracy, then DDG.
  const sources = [
    { url: "/api/serper", name: "Google" },
    { url: "https://flipbook-clone-five.vercel.app/api/images", name: "DDG" },
  ];
  for (const src of sources) {
    for (const term of [imageSearchTerm, imageSearchTerm.split(" ")[0]]) {
      try {
        const res = await fetch(src.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: term }) });
        if (!res.ok) continue;
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          const winner = await pickLoadable(results, src.name);
          if (winner) return winner;
        }
      } catch { /* try next term / source */ }
    }
  }

  // Pexels fallback — only when Serper and DDG return nothing
  try {
    const res = await fetch("/api/pexels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: imageSearchTerm }) });
    if (res.ok) {
      const photos = await res.json();
      if (Array.isArray(photos) && photos.length > 0) {
        for (const p of photos) {
          if (!usedUrls.has(p.url)) {
            return { imageUrl: p.url, imageCredit: { name: p.source || "Pexels", url: p.url } };
          }
        }
        return { imageUrl: photos[0].url, imageCredit: { name: photos[0].source || "Pexels", url: photos[0].url } };
      }
    }
  } catch { /* ok */ }

  return null;
}

function HomePageInner() {
  const searchParams = useSearchParams();
  const autoQuery = searchParams.get("q");
  const isEmbed = searchParams.get("embed") === "1";

  const [pages, setPages] = useState<PageData[]>([]);
  const [currentDepth, setCurrentDepth] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-search when ?q= is in URL
  useEffect(() => {
    if (autoQuery && pages.length === 0 && !isLoading) {
      performSearch(autoQuery, 1);
    }
  }, [autoQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = pages.map((p) => p.title);
  const currentPage = pages.length > 0 ? pages[pages.length - 1] : null;

  const performSearch = useCallback(
    async (query: string, depth: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const oldBreadcrumbs = pages.slice(0, depth - 1).map((p) => p.title);

        // Step 1: Get LLM breakdown
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, breadcrumbs: oldBreadcrumbs, depth }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || `Server error (${res.status})`);
        }

        const data = await res.json();

        // Step 2: Fetch image, avoiding duplicates from previous layers
        const usedUrls = new Set(pages.map((p) => p.imageUrl).filter(Boolean));
        const image = await fetchBestImage(data.imageSearchTerm, usedUrls);

        const pageData: PageData = {
          query,
          imageUrl: image?.imageUrl || "",
          imageCredit: image?.imageCredit || { name: "", url: "" },
          title: data.title,
          description: data.description,
          subtopics: data.subtopics,
        };

        if (!image) {
          setError("找不到圖片，請嘗試其他搜尋");
        }

        setPages((prev) => {
          const trimmed = prev.slice(0, depth - 1);
          return [...trimmed, pageData];
        });
        setCurrentDepth(depth);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [pages]
  );

  const handleSearch = useCallback(
    (query: string) => performSearch(query, 1),
    [performSearch]
  );

  const handleImageClick = useCallback(
    async (x: number, y: number, imageWidth: number, imageHeight: number, crop: string | null) => {
      if (isLoading) return;
      if (currentDepth >= MAX_DEPTH) return;
      if (!currentPage) return;

      const newDepth = currentDepth + 1;
      setIsLoading(true);
      setError(null);

      try {
        const clickRes = await fetch("/api/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            x, y, imageWidth, imageHeight,
            currentTitle: currentPage.title,
            currentDescription: currentPage.description,
            breadcrumbs: pages.map((p) => p.title),
            depth: currentDepth,
            imageCrop: crop,
          }),
        });

        if (!clickRes.ok) {
          const body = await clickRes.json();
          throw new Error(body.error || "Click interpretation failed");
        }

        const { subQuery } = await clickRes.json();
        await performSearch(subQuery, newDepth);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        setIsLoading(false);
      }
    },
    [currentDepth, currentPage, isLoading, pages, performSearch]
  );

  const handleBreadcrumbClick = useCallback((index: number) => {
    const newDepth = index + 1;
    setPages((prev) => prev.slice(0, newDepth));
    setCurrentDepth(newDepth);
    setError(null);
  }, []);

  // Direct subtopic click — prepend parent query for context
  const handleSubtopicClick = useCallback(
    (topic: string) => {
      if (isLoading) return;
      if (currentDepth >= MAX_DEPTH) return;
      const context = currentPage?.query || currentPage?.title || "";
      const contextualQuery = context ? `${context} ${topic}` : topic;
      performSearch(contextualQuery, currentDepth + 1);
    },
    [currentDepth, isLoading, currentPage, performSearch]
  );

  const handleClear = useCallback(() => {
    setPages([]);
    setCurrentDepth(0);
    setError(null);
  }, []);

  return (
    <>
      <BrowserShell embed={isEmbed}>
        <BrowserToolbar
          breadcrumbs={breadcrumbs}
          onBreadcrumbClick={handleBreadcrumbClick}
          onSearch={handleSearch}
          onClear={handleClear}
          isLoading={isLoading}
        />
        <BrowserContent isLoading={isLoading}>
          <ImageCanvas
            page={currentPage}
            depth={currentDepth}
            maxDepth={MAX_DEPTH}
            isLoading={isLoading}
            error={error}
            onImageClick={handleImageClick}
            onSubtopicClick={handleSubtopicClick}
          />
        </BrowserContent>

        {/* Info card below the image */}
        {currentPage && (
          <div className="info-card">
            <InfoPanel
              title={currentPage.title}
              description={currentPage.description}
              credit={currentPage.imageCredit}
              subtopics={currentPage.subtopics}
              onSubtopicClick={handleSubtopicClick}
            />
          </div>
        )}
      </BrowserShell>

      {!isEmbed && <AboutSection />}
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="loading-container"><div className="loading-spinner" /></div>}>
      <HomePageInner />
    </Suspense>
  );
}
