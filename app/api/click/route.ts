import { NextRequest, NextResponse } from "next/server";
import { inferClickIntent } from "@/lib/llm";
import { MAX_DEPTH } from "@/lib/constants";
import type { ClickRequest, ClickResponse } from "@/lib/types";

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

    const inference = await inferClickIntent(
      body.x, body.y,
      body.currentTitle || "Unknown",
      body.currentDescription || "",
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
