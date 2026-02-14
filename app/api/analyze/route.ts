import { NextResponse } from "next/server";
import { FSC_CODES } from "@/lib/fsc-codes";
import { queryGroups } from "@/lib/pinecone";
import OpenAI from "openai";

const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";

const cache = new Map<string, { data: AnalyzeResponse; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function buildCacheKey(company: AnalyzeRequest["company"], fileIds: string[]): string {
  const normalized = JSON.stringify({
    name: company.name.trim().toLowerCase(),
    websiteUrl: (company.websiteUrl ?? "").trim().toLowerCase(),
    emailDomain: (company.emailDomain ?? "").trim().toLowerCase(),
    fileIds: [...fileIds].sort(),
  });
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return String(hash);
}

interface AnalyzeRequest {
  company: {
    name: string;
    websiteUrl: string;
    emailDomain: string;
  };
  fileIds: string[];
}

interface FscResult {
  code: string;
  title: string;
  reason: string;
  confidence: "high" | "medium" | "low";
}

interface AnalyzeResponse {
  companyDescription: string;
  fscCodes: FscResult[];
}

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    companyDescription: {
      type: "string",
      description:
        "Detailed description of what the company manufactures, sells, or provides. Include specific product lines, services, materials, and industries served.",
    },
  },
  required: ["companyDescription"],
  additionalProperties: false,
} as const;

function buildSummarySystemPrompt(): string {
  return `You are a research analyst. Your task is to thoroughly investigate a company and produce a detailed summary of what they manufacture, sell, or provide.

INSTRUCTIONS:
1. Use web_search to browse the company's website thoroughly. Look for product pages, services, about pages, and capability statements.
2. If documents are attached, search through them for additional context about the company's offerings.
3. Produce a detailed summary covering:
   - What specific products or services the company offers
   - What industries or sectors they serve
   - What materials, components, or technologies they work with
   - Any government/military/defense relevance

Be specific and thorough. Mention actual product names, categories, and capabilities. This summary will be used to classify the company into federal procurement categories.`;
}

function buildUserContent(
  company: AnalyzeRequest["company"],
  fileIds: string[],
): Array<Record<string, string>> {
  const parts: Array<Record<string, string>> = [];

  let textContent = `Research this company:\n\nCompany Name: ${company.name}`;
  if (company.emailDomain) {
    textContent += `\nEmail Domain: ${company.emailDomain}`;
  }
  if (company.websiteUrl) {
    textContent += `\nWebsite: ${company.websiteUrl}`;
    textContent += `\n\nPlease browse their website at ${company.websiteUrl} to understand their products and services.`;
  }

  parts.push({ type: "input_text", text: textContent });

  for (const fileId of fileIds) {
    parts.push({ type: "input_file", file_id: fileId });
  }

  return parts;
}

const CODE_SELECTION_SCHEMA = {
  type: "object",
  properties: {
    fscCodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "4-digit FSC code from the provided list",
          },
          title: {
            type: "string",
            description: "Exact title from the FSC list",
          },
          reason: {
            type: "string",
            description: "Brief explanation of why this code is relevant",
          },
        },
        required: ["code", "title", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["fscCodes"],
  additionalProperties: false,
} as const;

interface LlmCodePick {
  code: string;
  title: string;
  reason: string;
}

function deriveConfidence(
  groupScoreMap: Map<string, number>,
  code: string,
): "high" | "medium" | "low" {
  const prefix = code.slice(0, 2);
  const score = groupScoreMap.get(prefix) ?? 0;
  if (score >= 0.5) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

function buildCodeSelectionPrompt(
  companyDescription: string,
  filteredCodes: Array<{ code: string; title: string }>,
): string {
  const codeList = filteredCodes
    .map((c) => `${c.code} - ${c.title}`)
    .join("\n");

  return `You are a federal procurement classification expert. A company has been researched and summarized below. Your task is to select the most relevant 4-digit Federal Supply Classification (FSC) codes from the provided list.

COMPANY SUMMARY:
${companyDescription}

INSTRUCTIONS:
1. Use web_search to do additional research on the company if needed to confirm your selections.
2. Based on the company summary and any additional research, select the FSC codes that best match what the company manufactures, sells, or provides.
3. Return 5-15 codes ranked by relevance.
4. Be precise -- only select codes that genuinely match the company's offerings.

IMPORTANT: You MUST only use codes from the following list. Do NOT invent codes.
=== AVAILABLE FSC CODES ===
${codeList}
=== END AVAILABLE FSC CODES ===`;
}

type XaiOutput = Array<{
  type: string;
  content?: Array<{ type: string; text?: string }>;
}>;

function extractOutputText(output: XaiOutput): string {
  let text = "";
  for (const item of output) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const block of item.content) {
        if (block.type === "output_text" && block.text) {
          text += block.text;
        }
      }
    }
  }
  return text;
}

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

async function embedText(text: string): Promise<number[]> {
  const client = getOpenAI();
  const truncated = text.slice(0, 32_000);
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: truncated,
    dimensions: 1024,
  });
  return response.data[0].embedding;
}

export async function POST(request: Request) {
  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) {
    return NextResponse.json(
      { error: "XAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const [bodyError, body] = await request
    .json()
    .then(
      (d: AnalyzeRequest) => [null, d] as const,
      () => ["Invalid JSON in request body."] as const,
    );

  if (bodyError) {
    return NextResponse.json({ error: bodyError }, { status: 400 });
  }

  const { company, fileIds } = body;

  if (!company?.name) {
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 },
    );
  }

  const cacheKey = buildCacheKey(company, fileIds);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const summaryPayload = {
    model: "grok-4-1-fast-non-reasoning",
    temperature: 0,
    input: [
      { role: "developer", content: buildSummarySystemPrompt() },
      { role: "user", content: buildUserContent(company, fileIds) },
    ],
    tools: [{ type: "web_search" }],
    text: {
      format: {
        type: "json_schema",
        name: "summary_response",
        schema: SUMMARY_SCHEMA,
        strict: true,
      },
    },
  };

  const summaryRes = await fetch(XAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${xaiKey}`,
    },
    body: JSON.stringify(summaryPayload),
  });

  if (!summaryRes.ok) {
    const errBody = await summaryRes.text();
    return NextResponse.json(
      { error: `Step 1 (summary) failed: ${summaryRes.status} ${errBody}` },
      { status: 502 },
    );
  }

  const [summaryJsonErr, summaryXai] = await summaryRes.json().then(
    (d: { output?: XaiOutput }) => [null, d] as const,
    () => ["Failed to parse Step 1 response."] as const,
  );

  if (summaryJsonErr) {
    return NextResponse.json({ error: summaryJsonErr }, { status: 502 });
  }

  const summaryText = extractOutputText(summaryXai.output ?? []);
  if (!summaryText) {
    return NextResponse.json(
      { error: "No output from Step 1 (summary)." },
      { status: 502 },
    );
  }

  const [summaryParseErr, summaryResult] = await Promise.resolve()
    .then(() => JSON.parse(summaryText) as { companyDescription: string })
    .then(
      (d) => [null, d] as const,
      () => ["Failed to parse Step 1 JSON."] as const,
    );

  if (summaryParseErr) {
    return NextResponse.json({ error: summaryParseErr }, { status: 502 });
  }

  const companyDescription = summaryResult.companyDescription;

  const summaryEmbedding = await embedText(companyDescription);
  const topGroups = await queryGroups(summaryEmbedding, 10);
  const groupScoreMap = new Map(topGroups.map((g) => [g.prefix, g.score]));
  const selectedPrefixes = new Set(topGroups.map((g) => g.prefix));
  const filteredCodes = FSC_CODES.filter((c) =>
    selectedPrefixes.has(c.code.slice(0, 2)),
  );
  const codesToUse = filteredCodes.length > 0 ? filteredCodes : FSC_CODES;

  const codePayload = {
    model: "grok-4-1-fast-non-reasoning",
    temperature: 0,
    input: [
      {
        role: "developer",
        content: buildCodeSelectionPrompt(companyDescription, codesToUse),
      },
      {
        role: "user",
        content: buildUserContent(company, fileIds),
      },
    ],
    tools: [{ type: "web_search" }],
    text: {
      format: {
        type: "json_schema",
        name: "code_selection_response",
        schema: CODE_SELECTION_SCHEMA,
        strict: true,
      },
    },
  };

  const codeRes = await fetch(XAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${xaiKey}`,
    },
    body: JSON.stringify(codePayload),
  });

  if (!codeRes.ok) {
    const errBody = await codeRes.text();
    return NextResponse.json(
      { error: `Step 3 (code selection) failed: ${codeRes.status} ${errBody}` },
      { status: 502 },
    );
  }

  const [codeJsonErr, codeXai] = await codeRes.json().then(
    (d: { output?: XaiOutput }) => [null, d] as const,
    () => ["Failed to parse Step 3 response."] as const,
  );

  if (codeJsonErr) {
    return NextResponse.json({ error: codeJsonErr }, { status: 502 });
  }

  const codeText = extractOutputText(codeXai.output ?? []);
  if (!codeText) {
    return NextResponse.json(
      { error: "No output from Step 3 (code selection)." },
      { status: 502 },
    );
  }

  const [codeParseErr, codeResult] = await Promise.resolve()
    .then(() => JSON.parse(codeText) as { fscCodes: LlmCodePick[] })
    .then(
      (d) => [null, d] as const,
      () => ["Failed to parse Step 3 JSON."] as const,
    );

  if (codeParseErr) {
    return NextResponse.json({ error: codeParseErr }, { status: 502 });
  }

  const allowedCodeSet = new Set(codesToUse.map((c) => c.code));
  const scoredCodes: FscResult[] = codeResult.fscCodes
    .filter((c) => allowedCodeSet.has(c.code))
    .map((c) => ({
      code: c.code,
      title: c.title,
      reason: c.reason,
      confidence: deriveConfidence(groupScoreMap, c.code),
    }));
  scoredCodes.sort((a, b) => {
    const scoreA = groupScoreMap.get(a.code.slice(0, 2)) ?? 0;
    const scoreB = groupScoreMap.get(b.code.slice(0, 2)) ?? 0;
    return scoreB - scoreA;
  });

  const result: AnalyzeResponse = {
    companyDescription,
    fscCodes: scoredCodes,
  };
  cache.set(cacheKey, { data: result, timestamp: Date.now() });

  return NextResponse.json(result);
}
