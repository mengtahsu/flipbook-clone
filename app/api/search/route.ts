import { NextRequest, NextResponse } from "next/server";
import { breakdownQuery } from "@/lib/llm";
import { searchPhoto } from "@/lib/images";
import { MAX_DEPTH } from "@/lib/constants";
import type { SearchRequest, SearchResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchRequest;

    // Validate
    if (!body.query || typeof body.query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'query' field" },
        { status: 400 }
      );
    }

    if (body.depth > MAX_DEPTH) {
      return NextResponse.json(
        { error: `Maximum exploration depth of ${MAX_DEPTH} reached` },
        { status: 400 }
      );
    }

    const breadcrumbs = Array.isArray(body.breadcrumbs) ? body.breadcrumbs : [];

    // Step 1: Use Claude to break down the query
    console.log(`[search] Breaking down query: "${body.query}" (depth ${body.depth})`);
    const breakdown = await breakdownQuery(body.query, breadcrumbs);
    console.log(`[search] -> title: "${breakdown.title}", imageSearch: "${breakdown.imageSearchTerm}"`);

    // Step 2: Fetch a relevant photo from Unsplash
    const photo = await searchPhoto(breakdown.imageSearchTerm);

    if (!photo) {
      return NextResponse.json(
        { error: "No image found for this query. Try different search terms." },
        { status: 404 }
      );
    }

    const response: SearchResponse = {
      query: body.query,
      imageUrl: photo.imageUrl,
      imageCredit: photo.imageCredit,
      title: breakdown.title,
      description: breakdown.description,
      subtopics: breakdown.subtopics,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[search] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
