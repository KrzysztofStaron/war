import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export async function POST(request: Request) {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const formData = await request.formData();

  const companyName = formData.get("companyName") as string | null;
  const websiteUrl = formData.get("websiteUrl") as string | null;
  const emailDomain = formData.get("emailDomain") as string | null;
  const files = formData.getAll("files") as File[];

  if (!companyName || !emailDomain) {
    return NextResponse.json(
      { error: "Company name and email domain are required." },
      { status: 400 }
    );
  }

  const savedFiles: { name: string; size: number; path: string }[] = [];

  for (const file of files) {
    if (file.size === 0) continue;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uniqueName = `${Date.now()}-${file.name}`;
    const filePath = join(UPLOAD_DIR, uniqueName);

    await writeFile(filePath, buffer);

    savedFiles.push({
      name: file.name,
      size: file.size,
      path: `/uploads/${uniqueName}`,
    });
  }

  return NextResponse.json({
    company: {
      name: companyName,
      websiteUrl: websiteUrl ?? "",
      emailDomain,
    },
    files: savedFiles,
  });
}
