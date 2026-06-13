import { execFile } from "child_process";
import path from "path";

export interface ImageResult {
  url: string;
  thumb: string;
  title: string;
  source: string;
  width: number;
  height: number;
}

export interface ImageSearchResponse {
  imageUrl: string;
  imageCredit: { name: string; url: string };
}

// Use the production alias for DDG endpoint (Vercel Python function)
const DDG_ENDPOINT = "https://flipbook-clone-five.vercel.app/api/images";
// For local dev, fall back to Pexels or local Python

/**
 * DuckDuckGo image search via Python endpoint (Vercel).
 * Uses the Python serverless function at /api/images.
 * DDG has broader coverage and user prefers it.
 */
async function searchDDGEndpoint(query: string): Promise<ImageResult[] | null> {
  try {
    const res = await fetch(DDG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ImageResult[];
  } catch {
    return null;
  }
}

/**
 * DuckDuckGo via local Python child_process (dev fallback).
 */
function searchDDGLocal(query: string): Promise<ImageResult[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "lib", "ddg_search.py");
    execFile(
      "python",
      [scriptPath, query],
      {
        timeout: 15000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      },
      (error, stdout) => {
        if (error) { reject(error); return; }
        try { resolve(JSON.parse(stdout) as ImageResult[]); }
        catch (e) { reject(e); }
      }
    );
  });
}

/**
 * Pexels API fallback (pure Node.js, works everywhere with key).
 */
async function searchPexels(query: string): Promise<ImageResult[] | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photos: Array<{
        width: number; height: number;
        src: { large: string; tiny: string };
        alt: string; photographer: string;
      }>;
    };
    return data.photos.map((p) => ({
      url: p.src.large,
      thumb: p.src.tiny,
      title: p.alt || query,
      source: p.photographer,
      width: p.width,
      height: p.height,
    }));
  } catch { return null; }
}

/**
 * Search for a photo. DDG first (broader coverage, user preference),
 * then Pexels as fallback.
 */
export async function searchPhoto(query: string): Promise<ImageSearchResponse | null> {
  try {
    // 1. DDG Python endpoint (works on Vercel with Python runtime)
    let results = await searchDDGEndpoint(query);

    // 2. DDG local (works in dev with Python installed)
    if (!results || results.length === 0) {
      try { results = await searchDDGLocal(query); } catch { /* ok */ }
    }

    // 3. Pexels fallback
    if (!results || results.length === 0) {
      results = await searchPexels(query);
    }

    if (!results || results.length === 0) {
      console.warn(`[images] No results for: "${query}"`);
      return null;
    }

    const photo = results[0];
    return {
      imageUrl: photo.url,
      imageCredit: {
        name: photo.source || photo.title || "Image Search",
        url: photo.url,
      },
    };
  } catch (error) {
    console.error("[images] Search failed:", error);
    return null;
  }
}
