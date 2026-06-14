import { NextRequest, NextResponse } from "next/server";
import { inferClickIntent } from "@/lib/llm";
import { MAX_DEPTH } from "@/lib/constants";
import type { ClickRequest, ClickResponse } from "@/lib/types";

async function visionDescribe(imageBase64: string, title: string): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3456"}/api/vision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imageBase64,
        prompt: `Describe what you see in this image crop in one sentence. The full image is about: "${title}". Be specific - name objects, places, features, or activities visible.`,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClickRequest;

    if (typeof body.x !== "number" || typeof body.y !== "number") {
      return NextResponse.json({ error: "Missing click coordinates" }, { status: 400 });
    }
    if (body.depth >= MAX_DEPTH) {
      return NextResponse.json({ error: `Max depth ${MAX_DEPTH} reached` }, { status: 400 });
    }

    const breadcrumbs = Array.isArray(body.breadcrumbs) ? body.breadcrumbs : [];

    // Vision-enhanced: use Groq to describe the image crop
    let visionDesc = "";
    if (body.imageCrop) {
      const desc = await visionDescribe(body.imageCrop, body.currentTitle || "");
      if (desc) visionDesc = `\nVision saw at click point: "${desc}"`;
    }

    const inference = await inferClickIntent(
      body.x, body.y,
      body.currentTitle || "Unknown",
      (body.currentDescription || "") + visionDesc,
      breadcrumbs
    );

    console.log(`[click] (${body.x}%,${body.y}%) -> "${inference.subQuery}"`);
    return NextResponse.json({ subQuery: inference.subQuery } as ClickResponse);
  } catch (error) {
    console.error("[click] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
