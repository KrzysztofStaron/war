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