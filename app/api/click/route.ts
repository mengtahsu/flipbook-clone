import { NextRequest, NextResponse } from "next/server";
import { inferClickIntent } from "@/lib/llm";
import { MAX_DEPTH } from "@/lib/constants";
import type { ClickRequest, ClickResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClickRequest;

    // Validate
    if (typeof body.x !== "number" || typeof body.y !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid click coordinates (x, y)" },
        { status: 400 }
      );
    }

    if (body.depth >= MAX_DEPTH) {
      return NextResponse.json(
        { error: `Maximum exploration depth of ${MAX_DEPTH} reached` },
        { status: 400 }
      );
    }

    const breadcrumbs = Array.isArray(body.breadcrumbs) ? body.breadcrumbs : [];

    console.log(
      `[click] Inferring intent from click at (${body.x}%, ${body.y}%) on "${body.currentTitle}"`
    );

    const inference = await inferClickIntent(
      body.x,
      body.y,
      body.currentTitle || "Unknown",
      body.currentDescription || "No description available",
      breadcrumbs
    );

    console.log(`[click] -> subQuery: "${inference.subQuery}"`);

    const response: ClickResponse = {
      subQuery: inference.subQuery,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[click] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
