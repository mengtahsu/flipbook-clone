import { NextRequest, NextResponse } from "next/server";
import { DEEPSEEK_MODEL, MAX_TOKENS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const query = body.query || "test";

  // Strip BOM (PowerShell pipe can add ﻿) and whitespace
  const apiKey = (process.env.DEEPSEEK_API_KEY || "").replace(/^./, (ch: string) => ch.charCodeAt(0) === 0xFEFF ? "" : ch).trim();
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  try {
    const reqBody = JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: 100,
      messages: [
        { role: "system", content: "Return ONLY: {\"title\":\"Hello\"}" },
        { role: "user", content: query },
      ],
      temperature: 0.7,
      stream: false,
    });

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: reqBody,
    });

    const text = await res.text();
    return NextResponse.json({ ok: res.ok, status: res.status, bodyLen: text.length, preview: text.slice(0, 100) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
