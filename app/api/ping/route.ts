import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { parsed = { parseError: true }; }
    return NextResponse.json({ pong: true, bodyReceived: true, query: parsed?.query, rawLen: raw.length, rawHex: Buffer.from(raw.slice(0, 20)).toString("hex") });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
