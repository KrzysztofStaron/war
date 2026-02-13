interface FscResult {
  code: string;
  title: string;
  reason: string;
  confidence: "high" | "medium" | "low";
}

interface FscResultsProps {
  companyDescription: string;
  fscCodes: FscResult[];
}

const confidenceStyles: Record<string, string> = {
  high: "border-emerald-600/40 text-emerald-700",
  medium: "border-amber-600/40 text-amber-700",
  low: "border-foreground/20 text-foreground/50",
};

const confidenceBg: Record<string, string> = {
  high: "bg-emerald-600/5",
  medium: "bg-amber-600/5",
  low: "bg-foreground/2",
};

export function FscResults({ companyDescription, fscCodes }: FscResultsProps) {
  return (
    <div className="mt-16">
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Company Summary
          </h2>
          <div className="h-px flex-1 bg-foreground/10" />
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          {companyDescription}
        </p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
          FSC Classifications
        </h2>
        <div className="h-px flex-1 bg-foreground/10" />
        <span className="font-mono text-xs text-foreground/30">
          {fscCodes.length}
        </span>
      </div>

      {fscCodes.length === 0 ? (
        <p className="text-sm text-foreground/40">
          No FSC codes could be determined.
        </p>
      ) : (
        <div className="space-y-3">
          {fscCodes.map((fsc) => (
            <div
              key={fsc.code}
              className={`border-2 border-foreground/10 p-5 transition-colors hover:border-primary/20 ${confidenceBg[fsc.confidence] ?? ""}`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                    {fsc.code}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-foreground/85">
                      {fsc.title}
                    </h3>
                    <span
                      className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${confidenceStyles[fsc.confidence] ?? ""}`}
                    >
                      {fsc.confidence}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/50">
                    {fsc.reason}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { FscResult, FscResultsProps };
