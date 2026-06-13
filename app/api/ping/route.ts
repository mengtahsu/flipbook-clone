import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const hasKey = !!process.env.DEEPSEEK_API_KEY;
  return NextResponse.json({
    pong: true,
    hasKey,
    keyFirstChar: hasKey ? process.env.DEEPSEEK_API_KEY!.charCodeAt(0) : 0,
  });
}
