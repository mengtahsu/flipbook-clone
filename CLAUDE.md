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

## Deploy
```bash
cd C:\workspace\20260613_flipbook\flipbook-clone
npx vercel --prod --yes
```
Aliased to: https://flipbook-clone-five.vercel.app
