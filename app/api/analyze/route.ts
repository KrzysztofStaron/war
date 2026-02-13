import { NextResponse } from "next/server";
import { FSC_CODES } from "@/lib/fsc-codes";

const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";

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

function buildFscReference(): string {
  return FSC_CODES.map((c) => `${c.code} - ${c.title}`).join("\n");
}

function extractDomain(url: string): string | null {
  const match = url.match(/^https?:\/\/(?:www\.)?([^/]+)/);
  return match ? match[1] : null;
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
duces aircraft landing gear. Clearly, they’re interested in very different contracts. Our job is to
filter away the noise and surface only the opportunities that matter to each customer.
How do we do this? The U.S. federal government classifies every procurement using Federal
Supply Classification (FSC) codes - 4-digit codes that categorize products and services. If
we know which FSC codes apply to a company, our matching engine can automatically connect
them to relevant solicitations.

IMPORTANT: You MUST only use codes from the following reference list. Do NOT invent codes.

=== FSC REFERENCE LIST ===
${fscReference}
=== END FSC REFERENCE LIST ===

You MUST respond with ONLY a JSON object in this exact format (no markdown fences, no explanation outside the JSON):
{
  "companyDescription": "Brief 2-3 sentence description of what the company does",
  "fscCodes": [
    {
      "code": "NNNN",
      "title": "Exact title from the reference list",
      "reason": "Brief explanation of why this code is relevant",
      "confidence": "high" | "medium" | "low"
    }
  ]
}`;
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

function buildTools(
  websiteUrl: string | undefined
): Array<Record<string, unknown>> {
  const tools: Array<Record<string, unknown>> = [];

  const webSearchTool: Record<string, unknown> = { type: "web_search" };
  if (websiteUrl) {
    const domain = extractDomain(websiteUrl);
    if (domain) {
      webSearchTool.web_search = { allowed_domains: [domain] };
    }
  }
  tools.push(webSearchTool);

  return tools;
}

function parseAnalysisResponse(text: string): AnalyzeResponse {
  // Try to parse the raw text directly as JSON first
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as AnalyzeResponse;
  }

  // Try to extract JSON from a markdown code fence
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1]) as AnalyzeResponse;
  }

  // Try to find any JSON object in the text
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]) as AnalyzeResponse;
  }

  return {
    companyDescription: "Could not parse the analysis response.",
    fscCodes: [],
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "XAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const body: AnalyzeRequest = await request.json();
  const { company, fileIds } = body;

  if (!company.name) {
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 }
    );
  }

  const fscReference = buildFscReference();
  const systemPrompt = buildSystemPrompt(fscReference);
  const userContent = buildUserContent(company, fileIds);
  const tools = buildTools(company.websiteUrl || undefined);

  const payload = {
    model: "grok-4-1-fast-reasoning",
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

  const xaiResponse = await res.json();

  // The responses API returns output as an array of items
  // Find the text output
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

  const result = parseAnalysisResponse(outputText);

  return NextResponse.json(result);
}
