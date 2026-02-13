"use client";

import { useState } from "react";

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

/** Strip Grok inline citation XML tags from text */
function stripCitations(text: string): string {
  return text.replace(/<grok:render[\s\S]*?<\/grok:render>/g, "");
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

function FscCard({ fsc }: { fsc: FscResult }) {
  return (
    <div
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
            {stripCitations(fsc.reason)}
          </p>
        </div>
      </div>
    </div>
  );
}

function groupByPrefix(codes: FscResult[]): { prefix: string; items: FscResult[] }[] {
  const map = new Map<string, FscResult[]>();
  for (const fsc of codes) {
    const prefix = fsc.code.slice(0, 2);
    const group = map.get(prefix);
    if (group) {
      group.push(fsc);
    } else {
      map.set(prefix, [fsc]);
    }
  }
  return Array.from(map, ([prefix, items]) => ({ prefix, items }));
}

function GroupedCards({ codes }: { codes: FscResult[] }) {
  const groups = groupByPrefix(codes);
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.prefix} className="space-y-1">
          {group.items.map((fsc) => (
            <FscCard key={fsc.code} fsc={fsc} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FscResults({ companyDescription, fscCodes }: FscResultsProps) {
  const [showLow, setShowLow] = useState(false);

  const primaryCodes = fscCodes.filter((fsc) => fsc.confidence !== "low");
  const lowCodes = fscCodes.filter((fsc) => fsc.confidence === "low");

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
          {stripCitations(companyDescription)}
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
        <>
          <GroupedCards codes={primaryCodes} />

          {lowCodes.length > 0 && (
            <div className="pt-2 mt-4">
              <button
                type="button"
                onClick={() => setShowLow((prev) => !prev)}
                className="group flex w-full items-center gap-3 text-left"
              >
                <div className="h-px flex-1 bg-foreground/10" />
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/30 transition-colors group-hover:text-foreground/50">
                  {showLow ? "Hide" : "Show"} {lowCodes.length} low confidence
                  {lowCodes.length === 1 ? "" : " results"}
                </span>
                <svg
                  className={`h-3.5 w-3.5 shrink-0 text-foreground/30 transition-transform group-hover:text-foreground/50 ${showLow ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                <div className="h-px flex-1 bg-foreground/10" />
              </button>

              {showLow && (
                <div className="mt-3">
                  <GroupedCards codes={lowCodes} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type { FscResult, FscResultsProps };
