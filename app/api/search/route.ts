import { NextRequest, NextResponse } from "next/server";
import { breakdownQuery } from "@/lib/llm";
import { searchPhoto } from "@/lib/images";
import { MAX_DEPTH } from "@/lib/constants";
import type { SearchRequest, SearchResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SearchRequest;

  if (!body.query || typeof body.query !== "string") {
    return NextResponse.json({ error: "Missing or invalid 'query' field" }, { status: 400 });
  }

  if (body.depth > MAX_DEPTH) {
    return NextResponse.json({ error: `Maximum depth of ${MAX_DEPTH} reached` }, { status: 400 });
  }

  const breadcrumbs = Array.isArray(body.breadcrumbs) ? body.breadcrumbs : [];

  // Step 1: LLM breakdown
  let breakdown;
  try {
    breakdown = await breakdownQuery(body.query, breadcrumbs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `LLM: ${message}` }, { status: 500 });
  }

  // Step 2: Image search
  let photo;
  try {
    photo = await searchPhoto(breakdown.imageSearchTerm);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Image: ${message}` }, { status: 500 });
  }

  if (!photo) {
    return NextResponse.json({ error: "No image found for this query" }, { status: 404 });
  }

  const response: SearchResponse = {
    query: body.query,
    imageUrl: photo.imageUrl,
    imageCredit: photo.imageCredit,
    title: breakdown.title,
    description: breakdown.description,
    subtopics: breakdown.subtopics,
    regions: breakdown.regions,
  };

  return NextResponse.json(response);
}
