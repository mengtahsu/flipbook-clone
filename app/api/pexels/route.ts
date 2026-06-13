import { NextRequest, NextResponse } from "next/server";

// Server-side only — key never reaches the browser
export async function POST(request: NextRequest) {
  const { query } = await request.json();
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const key = process.env.PEXELS_API_KEY;
  if (!key) return NextResponse.json({ error: "PEXELS_API_KEY not set" }, { status: 500 });

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Pexels ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    const results = (data.photos || []).map((p: Record<string, unknown>) => ({
      url: (p.src as Record<string, string>)?.large || "",
      thumb: (p.src as Record<string, string>)?.tiny || "",
      title: p.alt || query,
      source: p.photographer || "Pexels",
      width: p.width || 0,
      height: p.height || 0,
    }));
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Pexels unavailable" }, { status: 502 });
  }
}
