import Image from "next/image";
import Link from "next/link";

const COST_PER_COMPANY = 0.00965;

const costBreakdown = [
  {
    label: "Grok 4.1 Fast (input tokens)",
    description:
      "System prompt with FSC reference list (~5,800 tokens) + user message with company details",
    cost: 0.0029,
    detail: "~6,000 tokens × $0.48/M input",
  },
  {
    label: "Web search",
    description: "Browsing company website for products, services, and capabilities",
    cost: 0.005,
    detail: "1 search call × $0.005/call",
  },
  {
    label: "Grok 4.1 Fast (output tokens)",
    description:
      "Structured JSON with company description and 5–15 FSC codes with reasons",
    cost: 0.00175,
    detail: "~500 tokens × $3.50/M output",
  },
] as const;

const assumptions = [
  "Average input prompt is ~6,000 tokens (system prompt with full FSC code list + company details)",
  "One web search call per company to browse website content",
  "Average output is ~500 tokens of structured JSON (company description + 10 FSC codes)",
  "File uploads to xAI are free and not included in the per-company cost",
  "In-memory caching eliminates cost for repeated lookups of the same company",
];

function formatCost(cost: number): string {
  return `$${cost.toFixed(5)}`;
}

function CostRow({
  label,
  description,
  cost,
  detail,
}: (typeof costBreakdown)[number]) {
  const pct = ((cost / COST_PER_COMPANY) * 100).toFixed(0);
  return (
    <div className="flex flex-col gap-1 py-4 border-b border-foreground/10">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="font-mono text-sm text-primary tabular-nums">
          {formatCost(cost)}
        </span>
      </div>
      <p className="text-xs text-foreground/50">{description}</p>
      <div className="flex items-center justify-between gap-4 mt-1">
        <span className="font-mono text-[11px] text-foreground/35">{detail}</span>
        <span className="font-mono text-[11px] text-foreground/35">{pct}%</span>
      </div>
    </div>
  );
}

function ScaleRow({
  companies,
  label,
}: {
  companies: number;
  label: string;
}) {
  const total = companies * COST_PER_COMPANY;
  return (
    <div className="flex items-baseline justify-between py-2">
      <span className="text-sm text-foreground/70">{label}</span>
      <span className="font-mono text-sm tabular-nums text-foreground">
        ${total < 1 ? total.toFixed(3) : total.toFixed(2)}
      </span>
    </div>
  );
}

export default function CostsPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-16 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="SalesPatriot" width={36} height={36} />
            <span className="text-lg font-bold tracking-tight text-foreground">
              SalesPatriot
            </span>
          </Link>
        </div>

        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">
            Pricing
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-none sm:text-5xl">
            Cost
            <br />
            <span className="text-primary">breakdown.</span>
          </h1>
          <p className="mt-4 text-sm text-foreground/50 max-w-md">
            A transparent look at what it costs to classify one company using
            our FSC code analysis pipeline.
          </p>
        </div>

        {/* Per-company total */}
        <div className="mb-10 border border-foreground/10 bg-card p-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Cost per company
          </p>
          <p className="text-4xl font-extrabold tracking-tight text-primary tabular-nums">
            {formatCost(COST_PER_COMPANY)}
          </p>
        </div>

        {/* Breakdown */}
        <div className="mb-12">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Line items
          </h2>
          <div>
            {costBreakdown.map((item) => (
              <CostRow key={item.label} {...item} />
            ))}
          </div>
          <div className="flex items-baseline justify-between pt-4">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="font-mono text-sm font-semibold text-primary tabular-nums">
              {formatCost(costBreakdown.reduce((sum, i) => sum + i.cost, 0))}
            </span>
          </div>
        </div>

        {/* Scale table */}
        <div className="mb-12">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            At scale
          </h2>
          <div className="border border-foreground/10 bg-card p-6">
            <ScaleRow companies={1} label="1 company" />
            <ScaleRow companies={50} label="50 companies" />
            <ScaleRow companies={4000} label="4,000 companies" />
          </div>
        </div>

        {/* Assumptions */}
        <div className="mb-16">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Assumptions
          </h2>
          <ul className="space-y-2">
            {assumptions.map((a) => (
              <li
                key={a}
                className="flex items-start gap-2 text-xs text-foreground/50"
              >
                <span className="mt-1 block h-1 w-1 shrink-0 bg-foreground/25" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        {/* Tech stack */}
        <div className="border-t border-foreground/10 pt-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Pipeline
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              "xAI Grok 4.1 Fast",
              "Web Search",
              "Structured Outputs",
              "File Analysis",
              "In-Memory Cache",
            ].map((tag) => (
              <span
                key={tag}
                className="border border-foreground/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-foreground/50"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
