import { NextRequest, NextResponse } from "next/server";

// Serper.dev — real Google Images. Server-side only so the key never reaches the browser.
function getKey(): string {
  const raw = process.env.SERPER_API_KEY || "";
  return raw.replace(/^./, (ch: string) => (ch.charCodeAt(0) === 0xFEFF ? "" : ch)).trim();
}

const REJECT = [
  "pinterest", "pinimg", "shutterstock", "istockphoto", "gettyimages",
  "alamy", "dreamstime", "123rf", "depositphotos", "vecteezy", "freepik", "stock.adobe",
];

interface SerperImage {
  imageUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  source?: string;
  domain?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export async function POST(request: NextRequest) {
  const { query } = await request.json();
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const key = getKey();
  if (!key) return NextResponse.json({ error: "SERPER_API_KEY not set" }, { status: 500 });

  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 20 }),
    });
    // 402/429 = out of credits / rate limited → let the caller fall back to DDG/Pexels
    if (!res.ok) {
      return NextResponse.json({ error: `Serper ${res.status}` }, { status: res.status });
    }
    const data = (await res.json()) as { images?: SerperImage[] };
    const seen = new Set<string>();
    const results = (data.images || [])
      .map((i) => ({
        url: i.imageUrl || "",
        thumb: i.thumbnailUrl || i.imageUrl || "",
        title: i.title || query,
        source: i.source || i.domain || "Google",
        width: i.imageWidth || 0,
        height: i.imageHeight || 0,
      }))
      .filter((r) => {
        const u = r.url.toLowerCase();
        if (!u || u.length < 20 || seen.has(u)) return false;
        seen.add(u);
        return !REJECT.some((bad) => u.includes(bad));
      });
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Serper unavailable" }, { status: 502 });
  }
}
