import { NextResponse } from "next/server";

const XAI_API_URL = "https://api.x.ai/v1/files";

interface XaiFileResponse {
  id: string;
  filename: string;
  bytes: number;
  created_at: number;
}

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "XAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const formData = await request.formData();

  const companyName = formData.get("companyName") as string | null;
  const websiteUrl = formData.get("websiteUrl") as string | null;
  const emailDomain = formData.get("emailDomain") as string | null;
  const files = formData.getAll("files") as File[];

  if (!companyName) {
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 }
    );
  }

  const uploadedFiles: {
    name: string;
    size: number;
    fileId: string;
  }[] = [];

  for (const file of files) {
    if (file.size === 0) continue;

    const xaiForm = new FormData();
    xaiForm.append("file", file, file.name);
    xaiForm.append("purpose", "assistants");

    const res = await fetch(XAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: xaiForm,
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        {
          error: `Failed to upload "${file.name}" to xAI: ${res.status} ${errBody}`,
        },
        { status: 502 }
      );
    }

    const xaiFile: XaiFileResponse = await res.json();

    uploadedFiles.push({
      name: xaiFile.filename,
      size: xaiFile.bytes ?? file.size,
      fileId: xaiFile.id,
    });
  }

  return NextResponse.json({
    company: {
      name: companyName,
      websiteUrl: websiteUrl ?? "",
      emailDomain: emailDomain ?? "",
    },
    files: uploadedFiles,
  });
}
