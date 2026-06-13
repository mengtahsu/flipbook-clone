"use client";

import { useState, useCallback } from "react";
import BrowserShell from "@/components/BrowserShell";
import BrowserToolbar from "@/components/BrowserToolbar";
import BrowserContent from "@/components/BrowserContent";
import ImageCanvas from "@/components/ImageCanvas";
import AboutSection from "@/components/AboutSection";
import { MAX_DEPTH } from "@/lib/constants";
import type { PageData } from "@/lib/types";

// DDG endpoint — called from browser (works because it's public)
const DDG_ENDPOINT = "https://flipbook-clone-five.vercel.app/api/images";

// Fetch ALL DDG image URLs for a term. Returns all results so we can try
// multiple images if some URLs are dead (hotlink blocking is common).
async function fetchDDGImages(imageSearchTerm: string) {
  const terms = [
    imageSearchTerm,
    imageSearchTerm.split(" ").slice(0, 2).join(" "),
    imageSearchTerm.split(" ")[0],
  ].filter((t, i, a) => t && a.indexOf(t) === i);

  for (const term of terms) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 1000));
        const res = await fetch(DDG_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: term }),
        });
        if (!res.ok) continue;
        const results: Array<{url: string; title: string; source: string}> = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          return results.map((r) => ({
            imageUrl: r.url,
            imageCredit: { name: r.source || r.title || "DDG", url: r.url },
          }));
        }
      } catch { /* retry */ }
    }
  }
  return [];
}

export default function HomePage() {
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentDepth, setCurrentDepth] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        // Step 2: Fetch ALL DDG images — ImageCanvas will try each URL until one loads
        const images = await fetchDDGImages(data.imageSearchTerm);

        const backups = images.slice(1).map((i: {imageUrl: string}) => i.imageUrl);
        const pageData = {
          query,
          imageUrl: images.length > 0 ? images[0].imageUrl : "",
          imageCredit: images.length > 0 ? images[0].imageCredit : { name: "", url: "" },
          backupUrls: backups,
          title: data.title,
          description: data.description,
          subtopics: data.subtopics,
        } as PageData & { backupUrls: string[] };

        if (images.length === 0) {
          setError("No image found. Try a different search.");
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

  // Direct subtopic click — search immediately, no position interpretation needed
  const handleSubtopicClick = useCallback(
    (topic: string) => {
      if (isLoading) return;
      if (currentDepth >= MAX_DEPTH) return;
      performSearch(topic, currentDepth + 1);
    },
    [currentDepth, isLoading, performSearch]
  );

  const handleClear = useCallback(() => {
    setPages([]);
    setCurrentDepth(0);
    setError(null);
  }, []);

  return (
    <>
      <BrowserShell>
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
      </BrowserShell>

      <AboutSection />
    </>
  );
}
