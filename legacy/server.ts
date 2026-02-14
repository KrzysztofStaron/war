import cors from "cors";
import express from "express";
import { createRequire } from "node:module";
import * as path from "node:path";
import puppeteer from "puppeteer";

const require = createRequire(import.meta.url);
const root = path.resolve(process.cwd(), "..");
const dataPath = path.join(root, "lib/keywords-data.json");
const { keywords: FSC_KEYWORDS, titles: codeToTitle } = require(dataPath) as {
  keywords: Record<string, string[]>;
  titles: Record<string, string>;
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

function scoreCode(text: string, keywords: string[]): { score: number; matched: string[] } {
  const normalized = normalizeText(text);
  let score = 0;
  const matched: string[] = [];

  for (const kw of keywords) {
    const normalizedKw = normalizeText(kw);
    if (normalized.includes(normalizedKw)) {
      score += 1;
      matched.push(kw);
    }
  }

  return { score, matched };
}

function matchTextToFsc(
  text: string,
  options: { minScore?: number; maxResults?: number } = {}
): Array<{ code: string; title: string; score: number; matchedKeywords: string[] }> {
  const { minScore = 1, maxResults = 20 } = options;
  const results: Array<{ code: string; title: string; score: number; matchedKeywords: string[] }> =
    [];

  for (const [code, kwList] of Object.entries(FSC_KEYWORDS)) {
    const { score, matched } = scoreCode(text, kwList);
    if (score >= minScore && matched.length > 0) {
      const title = (codeToTitle as Record<string, string>)[code] ?? "";
      results.push({ code, title, score, matchedKeywords: matched });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.matchedKeywords.length - a.matchedKeywords.length;
  });

  return results.slice(0, maxResults);
}

async function scrapePageText(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (compatible; SalesPatriotScraper/1.0; +https://example.com)"
  );

  await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });

  const text = await page.evaluate(() => {
    const body = document.body;
    if (!body) return "";
    const clone = body.cloneNode(true) as HTMLElement;
    for (const el of clone.querySelectorAll("script, style, noscript")) {
      el.remove();
    }
    return clone.innerText ?? "";
  });

  await browser.close();
  return text;
}

const app = express();
app.use(cors());
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const url = req.body?.url ?? req.query?.url;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing url in body or query" });
    return;
  }

  const scrapeResult = await scrapePageText(url).then(
    (text) => ({ ok: true as const, text }),
    (err: Error) => ({ ok: false as const, error: err.message })
  );

  if (!scrapeResult.ok) {
    res.status(502).json({ error: scrapeResult.error });
    return;
  }

  const matches = matchTextToFsc(scrapeResult.text, { minScore: 1, maxResults: 25 });

  res.json({
    text: scrapeResult.text,
    matches: matches.map((m) => ({
      code: m.code,
      title: m.title,
      score: m.score,
      reason: `Matched keywords: ${m.matchedKeywords.join(", ")}`,
      confidence: m.score >= 2 ? ("high" as const) : m.score >= 1 ? ("medium" as const) : ("low" as const),
    })),
  });
});

const port = process.env.PORT ?? 3099;
app.listen(port, () => {
  console.log(`Scraper server on http://localhost:${port}`);
});
