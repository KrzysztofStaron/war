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

  const [formError, formData] = await request
    .formData()
    .then(
      (d) => [null, d] as const,
      () => ["Invalid form data in request."] as const
    );

  if (formError) {
    return NextResponse.json({ error: formError }, { status: 400 });
  }

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

    const [xaiParseError, xaiFile] = await res.json().then(
      (d: XaiFileResponse) => [null, d] as const,
      () => [`Failed to parse xAI response for "${file.name}".`] as const
    );

    if (xaiParseError) {
      return NextResponse.json({ error: xaiParseError }, { status: 502 });
    }

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
