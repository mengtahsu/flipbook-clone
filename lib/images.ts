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

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3456";

/**
 * Search for images via DuckDuckGo.
 * On Vercel: calls the Python /api/images endpoint.
 * Locally: calls the Python ddg_search.py script via child_process.
 */
async function searchDDG(query: string): Promise<ImageResult[]> {
  // Try the HTTP endpoint first (works on Vercel + locally if Python server is up)
  try {
    const res = await fetch(`${BASE_URL}/api/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      return (await res.json()) as ImageResult[];
    }
  } catch {
    // Fall through to local Python call
  }

  // Local fallback: call Python script directly
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
      (error, stdout, stderr) => {
        if (error) {
          console.error("[images] Python search failed:", error.message);
          reject(error);
          return;
        }
        try {
          resolve(JSON.parse(stdout) as ImageResult[]);
        } catch (parseError) {
          console.error("[images] Parse failed:", stdout.slice(0, 200));
          reject(parseError);
        }
      }
    );
  });
}

/**
 * Search for a photo. Results are pre-scored by the Python script
 * (preferred sources first, watermarked sources last).
 * Picks the top result.
 */
export async function searchPhoto(query: string): Promise<ImageSearchResponse | null> {
  try {
    const results = await searchDDG(query);

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
