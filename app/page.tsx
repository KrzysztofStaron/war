"use client";

import { useState } from "react";
import { FileCard, type UploadedFile } from "./components/FileCard";
import { UploadDropzone } from "./components/UploadDropzone";

export default function Home() {
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAddFiles(files: File[]) {
    setSelectedFiles((prev) => [...prev, ...files]);
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!companyName.trim() || !emailDomain.trim()) {
      setError("Company name and email domain are required.");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("companyName", companyName);
    formData.append("websiteUrl", websiteUrl);
    formData.append("emailDomain", emailDomain);
    for (const file of selectedFiles) {
      formData.append("files", file);
    }

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Upload failed. Please try again.");
      setIsUploading(false);
      return;
    }

    setUploadedFiles((prev) => [...prev, ...data.files]);
    setSelectedFiles([]);
    setCompanyName("");
    setWebsiteUrl("");
    setEmailDomain("");
    setIsUploading(false);
  }

  return (
    <div className="min-h-screen bg-background px-6 py-16 sm:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">
            Company Onboarding
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-none sm:text-5xl">
            Tell us about
            <br />
            <span className="text-primary">your company.</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <fieldset className="space-y-6 border-2 border-foreground/20 p-6">
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
                Email Domain *
              </label>
              <input
                id="emailDomain"
                placeholder="example.com"
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value)}
                required
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
            disabled={isUploading}
            className="group relative w-full border-2 border-foreground bg-foreground py-4 text-center font-mono text-sm uppercase tracking-[0.2em] text-background transition-all hover:bg-primary hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Submit"}
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
                <FileCard key={file.path} file={file} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
