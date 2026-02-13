"use client";

import { useState } from "react";
import { UploadDropzone } from "./UploadDropzone";
import { FileCard, type UploadedFile } from "./FileCard";

interface CompanyData {
  name: string;
  websiteUrl: string;
  emailDomain: string;
}

interface CompanyFormProps {
  onAnalysisStart: (company: CompanyData, fileIds: string[]) => void;
  isAnalyzing: boolean;
}

export function CompanyForm({ onAnalysisStart, isAnalyzing }: CompanyFormProps) {
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = isUploading || isAnalyzing;

  function handleAddFiles(files: File[]) {
    setSelectedFiles((prev) => [...prev, ...files]);
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    setIsUploading(true);

    // Phase 1: Upload files to xAI
    const formData = new FormData();
    formData.append("companyName", companyName);
    formData.append("websiteUrl", websiteUrl);
    formData.append("emailDomain", emailDomain);
    for (const file of selectedFiles) {
      formData.append("files", file);
    }

    const fetchResult = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    }).then(
      (r) => ({ ok: true as const, value: r }),
      (err: unknown) => ({
        ok: false as const,
        error: err instanceof Error ? err.message : "Network error",
      })
    );

    if (!fetchResult.ok) {
      setError(fetchResult.error);
      setIsUploading(false);
      return;
    }

    const res = fetchResult.value;

    const parseResult = await res.json().then(
      (d: { files: UploadedFile[]; error?: string }) => ({
        ok: true as const,
        value: d,
      }),
      () => ({ ok: false as const, error: "Invalid response from server." })
    );

    if (!parseResult.ok) {
      setError(parseResult.error);
      setIsUploading(false);
      return;
    }

    const data = parseResult.value;

    if (!res.ok) {
      setError(data.error ?? "Upload failed. Please try again.");
      setIsUploading(false);
      return;
    }

    const newFiles: UploadedFile[] = data.files;
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setSelectedFiles([]);
    setIsUploading(false);

    // Phase 2: Trigger analysis
    const allFileIds = [
      ...uploadedFiles.map((f) => f.fileId),
      ...newFiles.map((f) => f.fileId),
    ];

    onAnalysisStart(
      {
        name: companyName,
        websiteUrl,
        emailDomain,
      },
      allFileIds
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        <fieldset
          className="space-y-6 border-2 border-foreground/20 p-6"
          disabled={isBusy}
        >
          <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground px-2">
            Basic Details
          </legend>

          <div className="space-y-1.5">
            <label
              htmlFor="companyName"
              className="block font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/70"
            >
              Company Name *
            </label>
            <input
              id="companyName"
              placeholder="Acme Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full border-b-2 border-foreground/20 bg-transparent py-3 text-lg font-medium text-foreground placeholder:text-foreground/25 outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="websiteUrl"
              className="block font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/70"
            >
              Website URL
            </label>
            <input
              id="websiteUrl"
              type="url"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full border-b-2 border-foreground/20 bg-transparent py-3 text-lg font-medium text-foreground placeholder:text-foreground/25 outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="emailDomain"
              className="block font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/70"
            >
              Email Domain
            </label>
            <input
              id="emailDomain"
              placeholder="example.com"
              value={emailDomain}
              onChange={(e) => setEmailDomain(e.target.value)}
              className="w-full border-b-2 border-foreground/20 bg-transparent py-3 text-lg font-medium text-foreground placeholder:text-foreground/25 outline-none transition-colors focus:border-primary"
            />
          </div>
        </fieldset>

        <UploadDropzone
          selectedFiles={selectedFiles}
          onFilesChange={handleAddFiles}
          onRemoveFile={removeSelectedFile}
        />

        {error && (
          <div className="border-l-4 border-destructive bg-destructive/5 px-4 py-3">
            <p className="font-mono text-sm text-destructive">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="group relative w-full border-2 border-foreground bg-foreground py-4 text-center font-mono text-sm uppercase tracking-[0.2em] text-background transition-all hover:bg-primary hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading
            ? "Uploading files..."
            : isAnalyzing
              ? "Analyzing..."
              : "Analyze Company"}
        </button>
      </form>

      {uploadedFiles.length > 0 && (
        <div className="mt-16">
          <div className="mb-6 flex items-center gap-4">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Uploaded Files
            </h2>
            <div className="h-px flex-1 bg-foreground/10" />
            <span className="font-mono text-xs text-foreground/30">
              {uploadedFiles.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {uploadedFiles.map((file) => (
              <FileCard key={file.fileId} file={file} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
