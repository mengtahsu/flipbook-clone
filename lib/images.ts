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
  imageCredit: {
    name: string;
    url: string;
  };
}

/**
 * Search Pexels (pure Node.js, works everywhere including Vercel).
 * Free tier: 200 req/hour. Needs PEXELS_API_KEY env var.
 * Returns up to 10 results.
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
        id: number;
        width: number;
        height: number;
        url: string;
        src: { large: string; medium: string; tiny: string };
        alt: string;
        photographer: string;
        photographer_url: string;
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
  } catch {
    return null;
  }
}

/**
 * Search DuckDuckGo via Python ddgs (local dev only).
 * Falls back to this if Pexels is unavailable.
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
        try {
          resolve(JSON.parse(stdout) as ImageResult[]);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/**
 * Search for a photo. Tries Pexels first (works on Vercel),
 * then falls back to local DDG (needs Python). Results are
 * sorted by Pexels quality or DDG scoring.
 */
export async function searchPhoto(query: string): Promise<ImageSearchResponse | null> {
  try {
    // Try Pexels (works on Vercel, high quality, no watermarks)
    let results = await searchPexels(query);

    // Fall back to local DDG
    if (!results || results.length === 0) {
      try {
        results = await searchDDGLocal(query);
      } catch {
        // DDG unavailable (e.g., on Vercel without Pexels key)
      }
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
