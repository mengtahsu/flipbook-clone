import { NextRequest, NextResponse } from "next/server";

// Proxy external images through our server to bypass hotlink blocking
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FlipbookClone/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return new NextResponse("Image unavailable", { status: 404 });

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }
}
