import { NextRequest, NextResponse } from "next/server";

// Groq + Llama 3.2 Vision — free, fast, OpenAI-compatible
const GROQ_BASE = "https://api.groq.com/openai/v1";
const VISION_MODEL = "llama-3.2-11b-vision-preview";

function getKey(): string {
  const raw = process.env.GROQ_API_KEY || "";
  return raw.replace(/^./, (ch: string) => ch.charCodeAt(0) === 0xFEFF ? "" : ch).trim();
}

export async function POST(request: NextRequest) {
  const { image, prompt } = await request.json();
  if (!image || !prompt) {
    return NextResponse.json({ error: "Missing image or prompt" }, { status: 400 });
  }

  const apiKey = getKey();
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });

  try {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: `Groq ${res.status}: ${text.slice(0, 200)}` }, { status: res.status });
    }

    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content || "";
    return NextResponse.json({ result: content.trim() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
