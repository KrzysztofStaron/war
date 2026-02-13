import { FSC_CODES } from "@/lib/fsc-codes";
import { FSC_KEYWORDS } from "@/lib/keywords";

export interface KeywordMatch {
  code: string;
  title: string;
  score: number;
  matchedKeywords: string[];
}

const codeToTitle = new Map(FSC_CODES.map((c) => [c.code, c.title]));

/**
 * Normalize text for matching: lowercase, collapse whitespace
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

/**
 * Count how many keywords from a code appear in the text.
 * Multi-word keywords must match as whole phrases.
 */
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

/**
 * Compare raw text against FSC keywords and return best matches, ranked by score.
 */
export function matchTextToFsc(
  text: string,
  options: { minScore?: number; maxResults?: number } = {}
): KeywordMatch[] {
  const { minScore = 1, maxResults = 20 } = options;

  const results: KeywordMatch[] = [];

  for (const [code, keywords] of Object.entries(FSC_KEYWORDS)) {
    const { score, matched } = scoreCode(text, keywords);
    if (score >= minScore && matched.length > 0) {
      const title = codeToTitle.get(code) ?? "";
      results.push({ code, title, score, matchedKeywords: matched });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.matchedKeywords.length - a.matchedKeywords.length;
  });

  return results.slice(0, maxResults);
}
