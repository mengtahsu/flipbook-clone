@AGENTS.md

# Flipbook Clone — Project Rules

## Version Tag
- **Every deployment MUST update the version tag** in `components/AboutSection.tsx`
- Format: `vYYYY-MM-DD.shortdesc` (e.g. `v2026-06-14.proxy`)
- Bump the date if it changed, change the desc to reflect what was deployed
- Commit + push + deploy: `git add -A && git commit -m "..." && git push && vercel --prod --yes`

## Image Sources
- **DDG primary** (via Python endpoint at `/api/images`) — broadest coverage
- DDG URLs proxied through `/api/img?url=...` for Safari/CORS compatibility  
- **Pexels fallback** (via `/api/pexels`) — only when DDG returns 0 results
- Images deduplicated across layers (track used URLs in `Set`)

## Key Files
- `app/page.tsx` — main state, image fetching, click handling
- `lib/llm.ts` — DeepSeek prompts (Chinese output, no maps for layer 1)
- `api/images.py` — Vercel Python function for DDG image search
- `components/AboutSection.tsx` — version tag location
- `components/ImageCanvas.tsx` — image display, click overlay, crop capture

## Sanity Test
When user says "sanity test XX" (XX = minutes):
1. Set a timer for XX minutes
2. **Use Playwright (Python) or headless browser** to test the ACTUAL page — not just API calls:
   - Navigate to `https://flipbook-clone-five.vercel.app`
   - Type a query into `#search-input` and press Enter
   - Wait for image to load (check `img.result-image` naturalWidth > 0)
   - Verify info card text appears below image
   - Verify subtopic buttons are visible and clickable
   - Click a subtopic → verify layer 2 loads with different content
   - Screenshot on failures for debugging
3. API-level tests (supplement):
   - `POST /api/search` — verify title, imageSearchTerm, subtopics
   - `POST /api/click` — verify subQuery returned
   - `POST /api/images` — verify DDG returns images
4. **Show real-time test log and countdown timer** during the test — print each iteration with pass/fail status and minutes remaining
5. If any step fails: **fix the bug immediately**, deploy, resume testing
6. After each fix: re-run the failing test to confirm it's fixed
7. When time is up: report total tests, passes, failures, bugs fixed
8. Update version tag after any fixes deployed

Key check: **images must actually render** (img.complete && img.naturalWidth > 0), not just URLs returned
**LLM relevance check**: for each search result, send image titles+descriptions to LLM and ask "Is this image relevant to query X? Return YES/NO." Fail if LLM says NO.
**NSFW check**: all titles, descriptions, and image metadata must pass NSFW keyword filter

Test queries (rotate): "東京", "巴黎", "巴里島", "火箭引擎", "壽司", "長城", "北極光", "潛水", "火山", "太空站"

## Deploy
```bash
cd C:\workspace\20260613_flipbook\flipbook-clone
npx vercel --prod --yes
```
Aliased to: https://flipbook-clone-five.vercel.app
