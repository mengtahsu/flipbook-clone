# Flipbook Clone — Visual Browser

A simplified clone of [flipbook.page](https://flipbook.page) — an experimental visual browser where every "page" is an image, and clicking anywhere dives deeper into subtopics.

## How It Works

1. **Type a query** — Claude breaks it down into a title, description, and image search term
2. **Get a visual page** — A relevant photo is fetched from Unsplash, paired with AI-generated context
3. **Click to explore deeper** — Click anywhere on the image; Claude infers what you clicked and generates a new page (up to 4 layers deep)
4. **Navigate with breadcrumbs** — Click any breadcrumb to go back to that layer

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React + TypeScript |
| LLM | Anthropic Claude API |
| Images | Unsplash API |
| Styling | CSS Custom Properties (design tokens, animations) |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Set your API keys in .env.local
ANTHROPIC_API_KEY=sk-ant-...
UNSPLASH_ACCESS_KEY=...

# 3. Run the dev server
npm run dev

# 4. Open http://localhost:3000
```

## Limitations (by design)

- **Max 4 layers deep** — prevents runaway exploration
- **Real photos, not AI-generated infographics** — the original flipbook.page renders pixels directly
- **Text search only** — no image upload in this version
- **Unsplash free tier** — ~50 requests/hour

## Project Structure

```
flipbook-clone/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx             # Main page (state management)
│   ├── globals.css          # Design system
│   └── api/
│       ├── search/route.ts  # POST: query → image + info
│       └── click/route.ts   # POST: click → sub-query
├── components/
│   ├── BrowserShell.tsx     # Browser window frame
│   ├── BrowserToolbar.tsx   # Address bar + controls
│   ├── BreadcrumbBar.tsx    # Breadcrumb navigation
│   ├── SearchInput.tsx      # Search field
│   ├── BrowserContent.tsx   # Content wrapper
│   ├── ImageCanvas.tsx      # Image display + orchestration
│   ├── ClickOverlay.tsx     # Click capture + ripple effect
│   ├── InfoPanel.tsx        # Title/description overlay
│   ├── DepthIndicator.tsx   # Layer depth dots
│   ├── LoadingSpinner.tsx   # Loading state
│   └── AboutSection.tsx     # About the project
└── lib/
    ├── llm.ts               # Claude API wrapper
    ├── images.ts            # Unsplash API wrapper
    ├── types.ts             # TypeScript interfaces
    └── constants.ts         # Config constants
```

## License

MIT
