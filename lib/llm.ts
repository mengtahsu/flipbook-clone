import { DEEPSEEK_MODEL, MAX_TOKENS } from "./constants";

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

function getApiKey(): string {
  // Strip BOM (PowerShell pipes can add ﻿)
  const raw = process.env.DEEPSEEK_API_KEY || "";
  return raw.replace(/^./, (ch: string) => ch.charCodeAt(0) === 0xFEFF ? "" : ch).trim();
}

const SEARCH_SYSTEM_PROMPT = `You are helping a visual browser generate pages. Given a search query, return a JSON object. ALL text MUST be in Chinese except imageSearchTerm (English for photo search).

Fields:
- title: page title in Chinese (max 20 chars).
- description: 1-2 sentences in Chinese, very concise.
- imageSearchTerm: 1-3 keywords in ENGLISH for photo search. For places/locations, prefer "aerial view" or "map" style terms so the photo shows the layout.
- subtopics: array of 4-6 strings in Chinese.
- regions: array of 4-8 objects. Each has:
  * label: short Chinese name (max 8 chars)
  * description: what's there (Chinese, max 20 chars)
  * x: horizontal center % (0-100)
  * y: vertical center % (0-100)

IMPORTANT region placement rules:
1. SPREAD regions across the ENTIRE image. Minimum 25% distance between any two region centers.
2. For geographic places: top = north, bottom = south, left = west, right = east.
3. Distribute evenly — don't cluster all regions in one corner. Use the full 0-100 range for both x and y.
4. Place each region where it would roughly appear on a map of the area.

Return ONLY valid JSON:
{"title": "...", "description": "...", "imageSearchTerm": "...", "subtopics": [...], "regions": [{"label": "...", "description": "...", "x": 30, "y": 50}]}`;

const CLICK_SYSTEM_PROMPT = `You are helping a visual browser interpret user clicks. A user clicked on an image at a specific position.

You will be given:
- Click position as (x%, y%)
- The page title and description
- Known image regions with their positions

Find the CLOSEST region to the click position (shortest distance). Generate a new Chinese search query that explores THAT region's topic in depth. Be specific — use the region's label and description.

Return ONLY valid JSON: {"subQuery": "the new Chinese search query"}`;

export interface ImageRegion {
  label: string;
  description: string;
  x: number;
  y: number;
}

export interface SearchBreakdown {
  title: string;
  description: string;
  imageSearchTerm: string;
  subtopics: string[];
  regions: ImageRegion[];
}

export interface ClickInference {
  subQuery: string;
}

async function deepseekChat(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const bodyStr = JSON.stringify({
    model: DEEPSEEK_MODEL,
    max_tokens: MAX_TOKENS,
    messages,
    temperature: 0.7,
    stream: false,
  });

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: bodyStr,
  });

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error(`DeepSeek API ${res.status}: ${rawText.slice(0, 200)}`);
  }

  const data = JSON.parse(rawText) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content || "";
}

function parseJSON<T>(text: string, label: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`${label}: no JSON in response: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]) as T;
}

export async function breakdownQuery(
  query: string,
  breadcrumbs: string[]
): Promise<SearchBreakdown> {
  const contextNote =
    breadcrumbs.length > 0
      ? `\n\nExploration context (the user drilled down from these pages): ${breadcrumbs.join(" > ")}`
      : "";

  const text = await deepseekChat([
    { role: "system", content: SEARCH_SYSTEM_PROMPT },
    { role: "user", content: `Search query: "${query}"${contextNote}` },
  ]);

  const parsed = parseJSON<SearchBreakdown>(text, "Search breakdown");

  if (!parsed.title || !parsed.description || !parsed.imageSearchTerm || !parsed.subtopics) {
    throw new Error(`Search breakdown missing fields: ${JSON.stringify(parsed)}`);
  }

  return {
    title: parsed.title,
    description: parsed.description,
    imageSearchTerm: parsed.imageSearchTerm,
    subtopics: Array.isArray(parsed.subtopics) ? parsed.subtopics : [],
    regions: Array.isArray(parsed.regions) ? parsed.regions : [],
  };
}

export async function inferClickIntent(
  x: number,
  y: number,
  currentTitle: string,
  currentDescription: string,
  breadcrumbs: string[],
  regions?: ImageRegion[]
): Promise<ClickInference> {
  // If we have regions, find the closest one by Euclidean distance
  let clickedLabel = "";
  let clickedDesc = "";

  if (regions && regions.length > 0) {
    let best: ImageRegion | null = null;
    let bestDist = Infinity;
    for (const r of regions) {
      const dx = r.x - x;
      const dy = r.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = r;
      }
    }
    if (best) {
      clickedLabel = best.label;
      clickedDesc = best.description;
    }
  }

  const regionContext = clickedLabel
    ? `\nThe user clicked closest to region: "${clickedLabel}" — ${clickedDesc}. Generate a query about ${clickedLabel}.`
    : `\n(No specific regions defined — infer from general knowledge what's at (${x}%, ${y}%) on an image about this topic.)`;

  const text = await deepseekChat([
    { role: "system", content: CLICK_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Page title: "${currentTitle}"
Page description: "${currentDescription}"
Exploration history: ${breadcrumbs.length > 0 ? breadcrumbs.join(" > ") : "(start)"}
Click position: (${x}%, ${y}%)${regionContext}`,
    },
  ]);

  const parsed = parseJSON<ClickInference>(text, "Click inference");

  if (!parsed.subQuery) {
    throw new Error(`Click inference missing subQuery: ${JSON.stringify(parsed)}`);
  }

  return { subQuery: parsed.subQuery };
}
