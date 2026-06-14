import { NextRequest, NextResponse } from "next/server";

// Proxy DDG images through our domain so Safari/iOS loads them (CORS workaround)
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FlipbookClone/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return new NextResponse("Unavailable", { status: 404 });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }
}
