import { GEMINI_MODEL, MAX_TOKENS } from "./constants";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function getApiKey(): string {
  const raw = process.env.GEMINI_API_KEY || "";
  return raw.replace(/^./, (ch: string) => (ch.charCodeAt(0) === 0xFEFF ? "" : ch)).trim();
}

const SEARCH_PROMPT = `You are helping a visual browser generate pages. Given a search query, return a JSON object. ALL text MUST be in Taiwan Traditional Chinese (繁體中文) except imageSearchTerm (English for photo search).

Fields:
- title: page title in Taiwan Traditional Chinese (繁體中文) (max 20 chars).
- description: detailed overview in Taiwan Traditional Chinese (繁體中文), 3-5 sentences. Include key facts, interesting details, and context. Be educational and engaging — this is the main content below the image.
- imageSearchTerm: 1-2 SHORT keywords in ENGLISH (max 3 words). Keep BROAD: "Tokyo" not "Tokyo cityscape night Shibuya". Broad terms get more image results.
- subtopics: array of 4-6 SHORT strings in Taiwan Traditional Chinese (繁體中文) (max 6 chars each). Keep labels concise — the parent topic will be added automatically when searching.

Return ONLY valid JSON:
{"title": "...", "description": "...", "imageSearchTerm": "...", "subtopics": ["...", "..."]}`;

const CLICK_PROMPT = `You are helping a visual browser interpret user clicks on an image. You are shown the actual cropped region the user clicked. Look at the crop, identify the specific object / place / feature / activity there, and generate a Taiwan Traditional Chinese (繁體中文) search query to explore it deeper. Use the parent topic for context so the query is specific and relevant.

Return ONLY valid JSON: {"subQuery": "the Taiwan Traditional Chinese search query"}`;

export interface SearchBreakdown {
  title: string;
  description: string;
  imageSearchTerm: string;
  subtopics: string[];
}

export interface ClickInference {
  subQuery: string;
}

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

/** Call Gemini generateContent in JSON mode. `parts` may mix text and inline image data. */
async function geminiGenerate(parts: GeminiPart[]): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: MAX_TOKENS,
        temperature: 0.7,
      },
    }),
  });

  const rawText = await res.text();
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${rawText.slice(0, 200)}`);

  const data = JSON.parse(rawText) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  };
  const cand = data.candidates?.[0];
  if (cand?.finishReason === "MAX_TOKENS") throw new Error("Gemini response truncated (MAX_TOKENS)");
  return (cand?.content?.parts || []).map((p) => p.text || "").join("");
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

  const text = await geminiGenerate([
    { text: `${SEARCH_PROMPT}\n\nSearch query: "${query}"${context}` },
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

/**
 * Vision-based click inference: Gemini looks at the cropped region the user
 * clicked and returns a Traditional-Chinese sub-query. Falls back to
 * coordinate + context reasoning when no crop is available.
 */
export async function inferClickIntent(
  imageCrop: string | null | undefined,
  x: number,
  y: number,
  currentTitle: string,
  currentDescription: string,
  breadcrumbs: string[]
): Promise<ClickInference> {
  const context = `${CLICK_PROMPT}

Parent page: "${currentTitle}" — ${currentDescription}
History: ${breadcrumbs.length > 0 ? breadcrumbs.join(" > ") : "(start)"}
The user clicked at (${x}%, ${y}%) of the image.${
    imageCrop ? " The cropped region is attached — look at it." : " No crop available; infer from position and context."
  }`;

  const parts: GeminiPart[] = [];
  if (imageCrop) {
    const comma = imageCrop.indexOf(",");
    const b64 = comma >= 0 ? imageCrop.slice(comma + 1) : imageCrop;
    const mimeMatch = imageCrop.match(/^data:([^;]+);/);
    parts.push({ inline_data: { mime_type: mimeMatch ? mimeMatch[1] : "image/jpeg", data: b64 } });
  }
  parts.push({ text: context });

  const text = await geminiGenerate(parts);
  const parsed = parseJSON<ClickInference>(text, "Click");
  if (!parsed.subQuery) throw new Error(`Missing subQuery: ${JSON.stringify(parsed)}`);
  return parsed;
}
