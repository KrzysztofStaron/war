"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "./components/AppHeader";
import { CompanyForm } from "./components/CompanyForm";
import { FscResults, type FscResult } from "./components/FscResults";
import { StepNav } from "./components/StepNav";

interface AnalysisResult {
  companyDescription: string;
  fscCodes: FscResult[];
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (analysisResult) {
      setCurrentStep(2);
    }
  }, [analysisResult]);

  async function handleAnalysisStart(
    company: { name: string; websiteUrl: string; emailDomain: string },
    fileIds: string[]
  ) {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setCurrentStep(1);

    const fetchResult = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, fileIds }),
    }).then(
      (r) => ({ ok: true as const, value: r }),
      (err: unknown) => ({
        ok: false as const,
        error: err instanceof Error ? err.message : "Network error",
      })
    );

    if (!fetchResult.ok) {
      setAnalysisError(fetchResult.error);
      setIsAnalyzing(false);
      return;
    }

    const res = fetchResult.value;

    const parseResult = await res.json().then(
      (d: AnalysisResult & { error?: string }) => ({
        ok: true as const,
        value: d,
      }),
      () => ({ ok: false as const, error: "Invalid response from server." })
    );

    if (!parseResult.ok) {
      setAnalysisError(parseResult.error);
      setIsAnalyzing(false);
      return;
    }

    const data = parseResult.value;

    if (!res.ok) {
      setAnalysisError(data.error ?? "Analysis failed. Please try again.");
      setIsAnalyzing(false);
      return;
    }

    setAnalysisResult(data);
    setIsAnalyzing(false);
  }

  return (
    <div className="min-h-screen bg-background px-6 py-16 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <AppHeader />

        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">
            FSC Classification
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-none sm:text-5xl">
            Find your
            <br />
            <span className="text-primary">supply codes.</span>
          </h1>
          <p className="mt-4 text-sm text-foreground/50 max-w-md">
            Enter company information and upload documents. We will analyze your
            products and services to identify relevant Federal Supply
            Classification codes.
          </p>
        </div>

        <StepNav
          currentStep={currentStep}
          canGoToResults={analysisResult !== null}
          isAnalyzing={isAnalyzing}
          onStepChange={setCurrentStep}
        />

        {currentStep === 1 && (
          <>
            <div className="relative">
              <CompanyForm
                onAnalysisStart={handleAnalysisStart}
                isAnalyzing={isAnalyzing}
              />

              {isAnalyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
                  <div className="h-6 w-6 animate-spin border-2 border-foreground/20 border-t-primary" />
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/40">
                    Browsing website and analyzing documents...
                  </p>
                </div>
              )}
            </div>

            {analysisError && (
              <div className="mt-8 border-l-4 border-destructive bg-destructive/5 px-4 py-3">
                <p className="font-mono text-sm text-destructive">
                  {analysisError}
                </p>
              </div>
            )}
          </>
        )}

        {currentStep === 2 && analysisResult && (
          <FscResults
            companyDescription={analysisResult.companyDescription}
            fscCodes={analysisResult.fscCodes}
          />
        )}
      </div>
    </div>
  );
}
