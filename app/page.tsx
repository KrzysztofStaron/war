"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
    setAnalysisResult(null);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, fileIds }),
    });

    const data = await res.json();

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
        <div className="mb-4 flex items-center gap-3">
          <Image src="/logo.png" alt="SalesPatriot" width={36} height={36} />
          <span className="text-lg font-bold tracking-tight text-foreground">
            SalesPatriot
          </span>
        </div>

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
            <CompanyForm
              onAnalysisStart={handleAnalysisStart}
              isAnalyzing={isAnalyzing}
            />

            {isAnalyzing && (
              <div className="mt-16 flex flex-col items-center gap-4 py-12">
                <div className="h-6 w-6 animate-spin border-2 border-foreground/20 border-t-primary" />
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/40">
                  Browsing website and analyzing documents...
                </p>
              </div>
            )}

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
