interface StepNavProps {
  currentStep: 1 | 2;
  canGoToResults: boolean;
  isAnalyzing: boolean;
  onStepChange: (step: 1 | 2) => void;
}

const steps = [
  { number: 1 as const, label: "Submit" },
  { number: 2 as const, label: "Results" },
];

export function StepNav({
  currentStep,
  canGoToResults,
  isAnalyzing,
  onStepChange,
}: StepNavProps) {
  return (
    <nav className="mb-12 flex items-center gap-0">
      {steps.map((step, i) => {
        const isActive = currentStep === step.number;
        const isDisabled = step.number === 2 && !canGoToResults;

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-initial">
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => onStepChange(step.number)}
              className={`
                flex items-center gap-2.5 px-1 py-2 transition-colors
                ${isDisabled ? "cursor-not-allowed opacity-30" : "cursor-pointer"}
                ${isActive ? "text-primary" : "text-foreground/40 hover:text-foreground/70"}
              `}
            >
              <span
                className={`
                  flex h-7 w-7 shrink-0 items-center justify-center border-2 font-mono text-xs font-bold
                  ${isActive ? "border-primary bg-primary text-primary-foreground" : "border-current bg-transparent"}
                  ${isAnalyzing && step.number === 1 && isActive ? "animate-pulse" : ""}
                `}
              >
                {step.number}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] whitespace-nowrap">
                {step.label}
              </span>
            </button>

            {i < steps.length - 1 && (
              <div
                className={`
                  mx-3 h-px flex-1 transition-colors
                  ${canGoToResults ? "bg-primary/40" : "bg-foreground/10"}
                `}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
