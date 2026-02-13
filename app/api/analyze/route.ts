import { NextResponse } from "next/server";
import { FSC_CODES } from "@/lib/fsc-codes";

const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";

// In-memory cache: key is a hash of the request inputs, value is the response + timestamp
const cache = new Map<string, { data: AnalyzeResponse; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function buildCacheKey(company: AnalyzeRequest["company"], fileIds: string[]): string {
  const normalized = JSON.stringify({
    name: company.name.trim().toLowerCase(),
    websiteUrl: (company.websiteUrl ?? "").trim().toLowerCase(),
    emailDomain: (company.emailDomain ?? "").trim().toLowerCase(),
    fileIds: [...fileIds].sort(),
  });
  // Simple string hash
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

const ANALYZE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    companyDescription: {
      type: "string",
      description: "Brief 2-3 sentence description of what the company does",
    },
    fscCodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "4-digit FSC code from the reference list",
          },
          title: {
            type: "string",
            description: "Exact title from the FSC reference list",
          },
          reason: {
            type: "string",
            description: "Brief explanation of why this code is relevant",
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Confidence level of the match",
          },
        },
        required: ["code", "title", "reason", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["companyDescription", "fscCodes"],
  additionalProperties: false,
} as const;

function buildFscReference(): string {
  return FSC_CODES.map((c) => `${c.code} - ${c.title}`).join("\n");
}

function buildSystemPrompt(fscReference: string): string {
  return `You are a federal procurement classification expert. Your task is to analyze a company and determine the most relevant 4-digit Federal Supply Classification (FSC) codes that describe what the company manufactures, sells, or provides.

You have access to the web_search tool to browse the company's website and learn about their products and services. You also have access to any attached documents which may contain capability statements, product catalogs, or other relevant information.

INSTRUCTIONS:
1. Use web_search to browse the company's website thoroughly. Look for product pages, services, about pages, and capability statements.
2. If documents are attached, search through them for additional context about the company's offerings.
3. Based on ALL gathered information, identify what the company manufactures, sells, or provides.
4. Match the company's offerings to the most relevant FSC codes from the reference list below.
5. Return 5-15 FSC codes ranked by relevance.

Consider two of our customers: Company A manufactures light bulbs, while Company B pro-
duces aircraft landing gear. Clearly, they're interested in very different contracts. Our job is to
filter away the noise and surface only the opportunities that matter to each customer.
How do we do this? The U.S. federal government classifies every procurement using Federal
Supply Classification (FSC) codes - 4-digit codes that categorize products and services. If
we know which FSC codes apply to a company, our matching engine can automatically connect
them to relevant solicitations.

IMPORTANT: You MUST only use codes from the following reference list. Do NOT invent codes.
=== FSC REFERENCE LIST ===
${fscReference}
=== END FSC REFERENCE LIST ===`;
}

function buildUserContent(
  company: AnalyzeRequest["company"],
  fileIds: string[]
): Array<Record<string, string>> {
  const parts: Array<Record<string, string>> = [];

  let textContent = `Analyze this company and determine the relevant FSC codes:\n\nCompany Name: ${company.name}`;
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

function buildTools(): Array<Record<string, unknown>> {
  return [{ type: "web_search" }];
}

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "XAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const [bodyError, body] = await request
    .json()
    .then(
      (d: AnalyzeRequest) => [null, d] as const,
      () => ["Invalid JSON in request body."] as const
    );

  if (bodyError) {
    return NextResponse.json({ error: bodyError }, { status: 400 });
  }

  const { company, fileIds } = body;

  if (!company?.name) {
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 }
    );
  }

  // Check cache
  const cacheKey = buildCacheKey(company, fileIds);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const fscReference = buildFscReference();
  const systemPrompt = buildSystemPrompt(fscReference);
  const userContent = buildUserContent(company, fileIds);
  const tools = buildTools();

  const payload = {
    model: "grok-4-1-fast-non-reasoning",
    input: [
      {
        role: "developer",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    tools,
    text: {
      format: {
        type: "json_schema",
        name: "analyze_response",
        schema: ANALYZE_RESPONSE_SCHEMA,
        strict: true,
      },
    },
  };

  const res = await fetch(XAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return NextResponse.json(
      { error: `xAI API error: ${res.status} ${errBody}` },
      { status: 502 }
    );
  }

  const [jsonError, xaiResponse] = await res.json().then(
    (d: { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }) =>
      [null, d] as const,
    () => ["Failed to parse xAI response."] as const
  );

  if (jsonError) {
    return NextResponse.json({ error: jsonError }, { status: 502 });
  }

  // The responses API returns output as an array of items
  // With structured outputs, the text is guaranteed to be valid JSON matching our schema
  let outputText = "";
  if (Array.isArray(xaiResponse.output)) {
    for (const item of xaiResponse.output) {
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block.type === "output_text") {
            outputText += block.text;
          }
        }
      }
    }
  }

  if (!outputText) {
    return NextResponse.json(
      { error: "No output received from xAI." },
      { status: 502 }
    );
  }

  const [parseError, result] = await new Promise<AnalyzeResponse>(
    (resolve) => resolve(JSON.parse(outputText) as AnalyzeResponse)
  ).then(
    (d) => [null, d] as const,
    () => ["Failed to parse analysis output."] as const
  );

  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 502 });
  }

  const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  result.fscCodes.sort(
    (a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]
  );

  // Store in cache
  cache.set(cacheKey, { data: result, timestamp: Date.now() });

  return NextResponse.json(result);
}
