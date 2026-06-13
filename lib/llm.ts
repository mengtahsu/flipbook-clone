import { DEEPSEEK_MODEL, MAX_TOKENS } from "./constants";

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

function getApiKey(): string {
  // Strip BOM (PowerShell pipes can add ﻿)
  const raw = process.env.DEEPSEEK_API_KEY || "";
  return raw.replace(/^./, (ch: string) => ch.charCodeAt(0) === 0xFEFF ? "" : ch).trim();
}

const SEARCH_SYSTEM_PROMPT = `You are helping a visual browser generate pages. Given a search query, you must return a JSON object with these exact fields. ALL text output MUST be in Chinese (Simplified Chinese):

- title: A compelling page title in Chinese (max 20 Chinese characters).
- description: A 1-2 sentence overview in Chinese, very concise.
- imageSearchTerm: 1-3 keywords in ENGLISH optimized for finding a relevant photograph via image search. These should be visual, photogenic search terms in English.
- subtopics: An array of 4-6 strings in Chinese. Each is a sub-topic someone might want to explore by clicking on different parts of the image.

Return ONLY valid JSON, no other text. Use this exact format:
{"title": "...", "description": "...", "imageSearchTerm": "...", "subtopics": ["...", "..."]}`;

const CLICK_SYSTEM_PROMPT = `You are helping a visual browser interpret user clicks. A user is exploring a visual page and has clicked somewhere on the image.

Given the click position (as percentage of image dimensions), the page title, description, and the exploration history, you must infer what the user likely clicked on and generate a new search query for deeper exploration. Output the query in Chinese.

The query should be:
- Specific and focused (not too broad)
- Naturally phrased in Chinese
- Related to what a reasonable person would expect to find at that position on an image about this topic

Return ONLY valid JSON: {"subQuery": "the new Chinese search query"}`;

export interface SearchBreakdown {
  title: string;
  description: string;
  imageSearchTerm: string;
  subtopics: string[];
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
  };
}

export async function inferClickIntent(
  x: number,
  y: number,
  currentTitle: string,
  currentDescription: string,
  breadcrumbs: string[]
): Promise<ClickInference> {
  const positionDescription = describePosition(x, y);

  const text = await deepseekChat([
    { role: "system", content: CLICK_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Page title: "${currentTitle}"
Page description: "${currentDescription}"
Exploration history: ${breadcrumbs.length > 0 ? breadcrumbs.join(" > ") : "(start)"}
Click position: (${x}%, ${y}%) — ${positionDescription}

What did the user click on? Generate a new search query.`,
    },
  ]);

  const parsed = parseJSON<ClickInference>(text, "Click inference");

  if (!parsed.subQuery) {
    throw new Error(`Click inference missing subQuery: ${JSON.stringify(parsed)}`);
  }

  return { subQuery: parsed.subQuery };
}

function describePosition(x: number, y: number): string {
  const vertical = y < 30 ? "upper" : y > 70 ? "lower" : "middle";
  const horizontal = x < 30 ? "left" : x > 70 ? "right" : "center";
  if (vertical === "middle" && horizontal === "center") return "center of the image";
  return `${vertical}-${horizontal} area of the image`;
}
