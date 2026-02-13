import { useRef } from "react";

interface UploadDropzoneProps {
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}

export function UploadDropzone({
  selectedFiles,
  onFilesChange,
  onRemoveFile,
}: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    onFilesChange(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <fieldset className="space-y-4 border-2 border-foreground/20 p-6">
      <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground px-2">
        Documentation
      </legend>

      <div
        className="group relative flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-foreground/15 bg-foreground/2 px-6 py-10 transition-colors hover:border-primary/50 hover:bg-primary/3"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center border-2 border-foreground/15 text-foreground/40 transition-colors group-hover:border-primary/40 group-hover:text-primary">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-foreground/40 group-hover:text-foreground/60">
          Click to add files
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/50">
            Queued ({selectedFiles.length})
          </p>
          <ul className="space-y-1">
            {selectedFiles.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between border border-foreground/10 bg-foreground/2 px-4 py-2.5"
              >
                <span className="truncate font-mono text-sm text-foreground/70">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(i)}
                  className="ml-3 shrink-0 font-mono text-xs text-foreground/30 transition-colors hover:text-destructive"
                >
                  REMOVE
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </fieldset>
  );
}
