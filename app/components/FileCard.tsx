interface UploadedFile {
  name: string;
  size: number;
  path: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toUpperCase() ?? "FILE";
}

function getExtColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "bg-red-600/10 text-red-700";
  if (["doc", "docx"].includes(ext)) return "bg-sky-600/10 text-sky-700";
  if (["xls", "xlsx", "csv"].includes(ext))
    return "bg-emerald-600/10 text-emerald-700";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return "bg-amber-600/10 text-amber-700";
  if (["zip", "tar", "gz", "rar"].includes(ext))
    return "bg-violet-600/10 text-violet-700";
  return "bg-foreground/5 text-foreground/60";
}

export function FileCard({ file }: { file: UploadedFile }) {
  return (
    <div className="group flex items-start gap-4 border-2 border-foreground/10 bg-card p-4 transition-colors hover:border-primary/30">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center font-mono text-[10px] font-bold uppercase tracking-wider ${getExtColor(file.name)}`}
      >
        {getFileExtension(file.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold text-foreground/85"
          title={file.name}
        >
          {file.name}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-foreground/35">
          {formatFileSize(file.size)}
        </p>
      </div>
    </div>
  );
}

export type { UploadedFile };
