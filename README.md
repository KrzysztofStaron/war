# SalesPatriot

FSC Classification — analyze companies to identify relevant Federal Supply Classification (FSC) codes for federal procurement.

## Setup

```bash
pnpm install
```

Create `.env.local` in the project root with:

| Variable | Description |
|----------|-------------|
| `XAI_API_KEY` | xAI API key (Grok) — used for company research and code selection |
| `OPENAI_API_KEY` | OpenAI API key — used for embeddings |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX_HOST` | Pinecone index host URL (e.g. `https://codes-xxx.svc.region.pinecone.io`) |

## Pinecone Setup

Create an index named `codes` in your Pinecone project (1024 dimensions, cosine metric). Copy the index host URL to `PINECONE_INDEX_HOST`. Seed the index once:

```bash
pnpm run keywords:export
pnpm exec tsx scripts/seed-pinecone.ts
```

## Run the App

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Submit** — Enter company name, optional website URL and email domain. Upload PDFs, docs, or other files for context.
2. **Results** — The app uses Grok to research the company (website + documents), embeds the summary, retrieves relevant FSC groups from Pinecone, then selects specific 4-digit codes. Results include confidence levels and reasons.

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm run keywords:export` | Export FSC keywords to `lib/keywords-data.json` |
| `pnpm run scraper` | Run the standalone scraper (dev mode) |
| `pnpm run scraper:start` | Export keywords + run scraper |

## Scraper (Optional)

Standalone server that scrapes a URL and returns keyword-matched FSC codes. Runs on port 3099 by default (`PORT` env var to override).

```bash
pnpm run scraper
# or, to export keywords first:
pnpm run scraper:start
```

Install Chrome for Puppeteer:

```bash
pnpm run scraper:setup
```

POST to `/scrape` with `{ "url": "https://example.com" }` in the body.
