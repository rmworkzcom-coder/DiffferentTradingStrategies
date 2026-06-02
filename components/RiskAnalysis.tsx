"use client";

import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, Sparkles, AlertTriangle, Play, HelpCircle, Loader2 } from "lucide-react";

interface RiskAnalysisProps {
  accountData: any;
  positionsData: any;
}

export default function RiskAnalysis({ accountData, positionsData }: RiskAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountData,
          positionsData,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Risk analysis failed.");
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to contact the AI risk manager. Ensure your API secrets are configured correctly.");
    } finally {
      setLoading(false);
    }
  };

  // Utility to parse simple markdown to clean JSX strings
  const renderSimpleMarkdown = (text: string) => {
    if (!text) return "";
    return text.split("\n\n").map((para, idx) => {
      // Bold syntax conversion **text** to <strong>
      let line = para;
      const boldRegex = /\*\*(.*?)\*\*/g;
      
      // Parse lists
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const items = line.split(/\n[-*]\\s+/);
        return (
          <ul key={idx} className="list-disc pl-5 text-xs text-slate-300 space-y-1 mb-3">
            {items.map((item, itemIdx) => {
              const cleanItem = item.replace(/^[-*]\s+/, "");
              return (
                <li key={itemIdx} dangerouslySetInnerHTML={{
                  __html: cleanItem.replace(boldRegex, "<strong>$1</strong>")
                }} />
              );
            })}
          </ul>
        );
      }

      // Safe HTML replacement for bold tags
      const formatted = line.replace(boldRegex, "<strong>$1</strong>");
      return (
        <p
          key={idx}
          className="text-xs text-slate-300 leading-relaxed mb-3.5"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  return (
    <div id="risk-analysis-root" className="bg-brand-card border border-brand-border rounded-xl p-5 md:p-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-border pb-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="text-brand-green w-5 h-5 animate-pulse" />
            AI Intraday Portfolio Risk Sentry
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 font-sans">
            Evaluate concentration exposure, margin calling cushions, and PDT compliance reports powered by Gemini.
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="mt-3 sm:mt-0 flex items-center justify-center gap-2 px-4 py-2 bg-brand-green hover:bg-brand-green/90 disabled:bg-brand-card text-black disabled:text-gray-500 font-bold text-xs rounded-lg transition shadow-lg shadow-brand-green/10 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Auditing Portfolio...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Risk Audit
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-brand-red/10 border border-brand-red/30 rounded-lg flex items-start gap-2.5 mb-5">
          <AlertTriangle className="text-brand-red w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-xs text-brand-red font-medium">{error}</span>
        </div>
      )}

      {!analysis && !loading && (
        <div className="flex flex-col items-center justify-center py-10 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#0a0b0d] flex items-center justify-center mb-3 border border-brand-border">
            <HelpCircle className="text-gray-500 w-6 h-6" />
          </div>
          <h4 className="text-gray-300 font-medium text-sm">Audit Report Pending</h4>
          <p className="text-xs text-gray-550 mt-1.5 max-w-sm">
            Click &apos;Run Risk Audit&apos; upwards to dispatch your live positions and margin accounts parameters to our risk compiler.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-200 uppercase tracking-widest font-mono">Retrieving Volatility Framework Coefficients...</p>
            <p className="text-[11px] text-gray-500 font-mono">Checking standard portfolio leverages on margin accounts</p>
          </div>
        </div>
      )}

      {analysis && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Risk Badge and recommendations Column */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-[#0a0b0d] p-5 border border-brand-border rounded-lg flex flex-col items-center justify-center text-center">
              <div className="text-[10px] font-bold text-gray-550 uppercase tracking-widest">Calculated Risk Score</div>
              <div className="mt-3 relative flex items-center justify-center">
                <span className={`text-5xl font-extrabold font-mono ${
                  analysis.riskScore > 75 
                    ? "text-brand-red" 
                    : analysis.riskScore > 50 
                    ? "text-brand-yellow" 
                    : "text-brand-green"
                }`}>
                  {analysis.riskScore}
                </span>
                <span className="text-gray-500 text-xs ml-0.5 font-mono">/100</span>
              </div>
              <div className={`mt-2.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                analysis.riskLevel === "Critical" || analysis.riskLevel === "High"
                  ? "bg-brand-red/10 border-brand-red/30 text-brand-red"
                  : analysis.riskLevel === "Medium"
                  ? "bg-brand-yellow/10 border-brand-yellow/30 text-brand-yellow"
                  : "bg-brand-green/10 border-brand-green/30 text-brand-green"
              }`}>
                {analysis.riskLevel} Risk
              </div>
              <div className="mt-4 flex gap-1.5 justify-center items-center">
                {analysis.riskScore > 50 ? (
                  <ShieldAlert className="text-brand-yellow w-4 h-4" />
                ) : (
                  <ShieldCheck className="text-brand-green w-4 h-4" />
                )}
                <span className="text-[10px] text-gray-400 font-mono font-bold uppercase">
                  {analysis.riskScore > 50 ? "Reductions Advised" : "Safety Sustained"}
                </span>
              </div>
            </div>

            <div className="bg-[#0a0b0d]/50 p-4 border border-brand-border rounded-lg">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
                Mitigation Measures
              </h4>
              <ul className="space-y-2 text-left">
                {analysis.recommendations?.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start gap-1.5 text-xs text-slate-300 leading-snug">
                    <span className="text-brand-green font-bold shrink-0 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Audit Narrative and stress testing Column */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-[#0a0b0d]/30 p-5 border border-brand-border rounded-lg text-slate-300">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3.5 font-mono">Risk Manager Audit Report</h4>
              {renderSimpleMarkdown(analysis.analysisText)}
            </div>

            <div className="bg-[#0a0b0d]/20 border border-brand-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-[#0a0b0d]/60 border-b border-brand-border">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
                  Margin Cushion Leverage Stress-Test
                </h4>
              </div>
              <div className="divide-y divide-brand-border/60">
                {analysis.stressTests?.map((test: any, index: number) => (
                  <div key={index} className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 items-center">
                    <div className="md:col-span-1">
                      <div className="text-xs font-bold text-gray-200">{test.scenario}</div>
                      <div className={`inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                        test.marginCallStatus === "Breached/Liquidated"
                          ? "bg-brand-red/10 text-brand-red border border-brand-red/30"
                          : test.marginCallStatus === "Warning"
                          ? "bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/30"
                          : "bg-brand-green/10 text-brand-green border border-brand-green/30"
                      }`}>
                        {test.marginCallStatus}
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Proj. Equity</div>
                      <div className="text-xs font-bold text-gray-300 font-mono">
                        ${test.projectedEquity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="md:col-span-2 text-xs text-slate-300 leading-relaxed">
                      {test.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
