import { DEEPSEEK_MODEL, MAX_TOKENS } from "./constants";

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

function getApiKey(): string {
  const raw = process.env.DEEPSEEK_API_KEY || "";
  return raw.replace(/^./, (ch: string) => ch.charCodeAt(0) === 0xFEFF ? "" : ch).trim();
}

const SEARCH_SYSTEM_PROMPT = `You are helping a visual browser generate pages. Given a search query, return a JSON object. ALL text MUST be in Chinese except imageSearchTerm (English for photo search).

Fields:
- title: page title in Chinese (max 20 chars).
- description: 1-2 sentences in Chinese, very concise.
- imageSearchTerm: 1-3 keywords in ENGLISH for photo search. Use visually rich, photogenic terms. Do NOT use "satellite map" or "aerial" — use real scene descriptions.
- subtopics: array of 4-6 strings in Chinese. CRITICAL: each subtopic MUST include context from the query. For example, if query is "Bali", subtopics should be "Bali beaches" not just "beaches", "Bali temples" not "temples". This ensures clicking a subtopic gives relevant deep-dive results.

Return ONLY valid JSON:
{"title": "...", "description": "...", "imageSearchTerm": "...", "subtopics": ["...", "..."]}`;

const CLICK_FALLBACK_PROMPT = `You are helping a visual browser interpret user clicks. The user clicked on an image. Given the click position, page title, description, and exploration history, infer what the user clicked and generate a Chinese search query. Include context from the parent topic so the search is specific and relevant.

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

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: MAX_TOKENS,
      messages,
      temperature: 0.7,
      stream: false,
    }),
  });

  const rawText = await res.text();
  if (!res.ok) throw new Error(`DeepSeek API ${res.status}: ${rawText.slice(0, 200)}`);

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
  const context = breadcrumbs.length > 0
    ? `\n\nExploration history: ${breadcrumbs.join(" > ")}`
    : "";

  const text = await deepseekChat([
    { role: "system", content: SEARCH_SYSTEM_PROMPT },
    { role: "user", content: `Search query: "${query}"${context}` },
  ]);

  const parsed = parseJSON<SearchBreakdown>(text, "Search");
  if (!parsed.title || !parsed.description || !parsed.imageSearchTerm || !parsed.subtopics) {
    throw new Error(`Missing fields: ${JSON.stringify(parsed)}`);
  }
  return {
    title: parsed.title,
    description: parsed.description,
    imageSearchTerm: parsed.imageSearchTerm,
    subtopics: Array.isArray(parsed.subtopics) ? parsed.subtopics : [],
  };
}

// Vision via DeepSeek not yet supported (API rejects image_url type).
// Image crop is captured but we use coordinate-based inference with full context.

/** Coordinate-based click inference with subtopic hints */
export async function inferClickIntent(
  x: number, y: number,
  currentTitle: string,
  currentDescription: string,
  breadcrumbs: string[]
): Promise<ClickInference> {
  const text = await deepseekChat([
    { role: "system", content: CLICK_FALLBACK_PROMPT },
    {
      role: "user",
      content: `Page: "${currentTitle}" — ${currentDescription}
History: ${breadcrumbs.length > 0 ? breadcrumbs.join(" > ") : "(start)"}
Click at (${x}%, ${y}%)
What did the user click? Generate a Chinese search query.`,
    },
  ]);
  const parsed = parseJSON<ClickInference>(text, "Click fallback");
  if (!parsed.subQuery) throw new Error(`Missing subQuery: ${JSON.stringify(parsed)}`);
  return parsed;
}
