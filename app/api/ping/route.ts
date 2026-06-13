import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ pong: true, receivedQuery: body.query?.slice(0, 20) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
