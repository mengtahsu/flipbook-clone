import { NextRequest, NextResponse } from "next/server";
import { breakdownQuery } from "@/lib/llm";
import { MAX_DEPTH } from "@/lib/constants";
import type { SearchRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SearchRequest;

  if (!body.query || typeof body.query !== "string") {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (body.depth > MAX_DEPTH) {
    return NextResponse.json({ error: `Max depth ${MAX_DEPTH} reached` }, { status: 400 });
  }

  const breadcrumbs = Array.isArray(body.breadcrumbs) ? body.breadcrumbs : [];

  let breakdown;
  try {
    breakdown = await breakdownQuery(body.query, breadcrumbs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `LLM: ${message}` }, { status: 500 });
  }

  return NextResponse.json({
    query: body.query,
    imageSearchTerm: breakdown.imageSearchTerm,
    title: breakdown.title,
    description: breakdown.description,
    subtopics: breakdown.subtopics,
  });
}
