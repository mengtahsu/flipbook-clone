"use client";

import { useState, useCallback } from "react";
import BrowserShell from "@/components/BrowserShell";
import BrowserToolbar from "@/components/BrowserToolbar";
import BrowserContent from "@/components/BrowserContent";
import ImageCanvas from "@/components/ImageCanvas";
import AboutSection from "@/components/AboutSection";
import { MAX_DEPTH } from "@/lib/constants";
import type { PageData } from "@/lib/types";

export default function HomePage() {
  // State: a stack of pages (index = depth - 1)
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentDepth, setCurrentDepth] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived
  const breadcrumbs = pages.map((p) => p.title);
  const currentPage = pages.length > 0 ? pages[pages.length - 1] : null;

  // Search for a new query (top-level or drill-down)
  const performSearch = useCallback(
    async (query: string, depth: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const oldBreadcrumbs = pages.slice(0, depth - 1).map((p) => p.title);

        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            breadcrumbs: oldBreadcrumbs,
            depth,
          }),
        });

        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error || `Server error (${response.status})`);
        }

        const pageData: PageData = await response.json();

        setPages((prev) => {
          // Trim to the correct depth (in case user navigated back)
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

  // Initial search from the toolbar
  const handleSearch = useCallback(
    (query: string) => {
      performSearch(query, 1);
    },
    [performSearch]
  );

  // Click on the image to drill deeper
  const handleImageClick = useCallback(
    async (x: number, y: number, imageWidth: number, imageHeight: number) => {
      if (isLoading) return;
      if (currentDepth >= MAX_DEPTH) return;
      if (!currentPage) return;

      const newDepth = currentDepth + 1;
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Ask the LLM what the click means
        const clickResponse = await fetch("/api/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            x,
            y,
            imageWidth,
            imageHeight,
            currentTitle: currentPage.title,
            currentDescription: currentPage.description,
            breadcrumbs: pages.map((p) => p.title),
            depth: currentDepth,
            regions: currentPage.regions,
          }),
        });

        if (!clickResponse.ok) {
          const body = await clickResponse.json();
          throw new Error(body.error || `Click interpretation failed (${clickResponse.status})`);
        }

        const { subQuery } = await clickResponse.json();

        // Step 2: Search with the inferred sub-query
        await performSearch(subQuery, newDepth);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        setIsLoading(false);
      }
    },
    [currentDepth, currentPage, isLoading, pages, performSearch]
  );

  // Click a breadcrumb to go back to that layer
  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const newDepth = index + 1;
      setPages((prev) => prev.slice(0, newDepth));
      setCurrentDepth(newDepth);
      setError(null);
    },
    []
  );

  // Clear all history
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
          />
        </BrowserContent>
      </BrowserShell>

      <AboutSection />
    </>
  );
}
