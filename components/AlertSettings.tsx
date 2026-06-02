"use client";

import React from "react";
import { AlertCircle, Sliders, BellDot, CircleSlash, ShieldAlert, X } from "lucide-react";

export interface AlertLogItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: "warning" | "critical";
  isResolved?: boolean;
}

interface AlertSettingsProps {
  warningThreshold: number;
  setWarningThreshold: (val: number) => void;
  criticalThreshold: number;
  setCriticalThreshold: (val: number) => void;
  alerts: AlertLogItem[];
  clearAlerts: () => void;
}

export default function AlertSettings({
  warningThreshold,
  setWarningThreshold,
  criticalThreshold,
  setCriticalThreshold,
  alerts,
  clearAlerts,
}: AlertSettingsProps) {
  return (
    <div id="alert-control-panel-root" className="bg-brand-card border border-brand-border rounded-xl p-5 md:p-6 text-left">
      <div className="flex items-center gap-2 border-b border-brand-border pb-4 mb-5">
        <BellDot className="text-brand-yellow w-5 h-5 animate-pulse" />
        <div>
          <h3 className="text-lg font-semibold text-white">Risk Sentry & Threshold configuration</h3>
          <p className="text-xs text-gray-400">Configure safety boundaries and analyze triggered warning flags.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Controls Slider */}
        <div className="md:col-span-5 space-y-5">
          <div className="bg-[#0a0b0d] p-4 border border-brand-border/80 rounded-lg">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-mono">
              <Sliders className="w-3.5 h-3.5 text-gray-500" />
              Safety Boundaries
            </h4>

            {/* Warning Threshold */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300 font-medium font-sans flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-yellow" />
                  Margin Warning Limit
                </span>
                <span className="text-brand-yellow font-mono font-bold">{warningThreshold}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(Number(e.target.value))}
                className="w-full h-1 bg-brand-card rounded-lg appearance-none cursor-pointer accent-brand-yellow"
              />
              <p className="text-[10px] text-gray-500 leading-snug">
                Triggers visual warning as your margin utilization approaches NYSE/FINRA daytrading risk limits (PDT exemption base).
              </p>
            </div>

            {/* Critical Threshold */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300 font-medium font-sans flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-red" />
                  Critical Liquidation Risk
                </span>
                <span className="text-brand-red font-mono font-bold">{criticalThreshold}%</span>
              </div>
              <input
                type="range"
                min="55"
                max="95"
                step="1"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                className="w-full h-1 bg-brand-card rounded-lg appearance-none cursor-pointer accent-brand-red"
              />
              <p className="text-[10px] text-gray-500 leading-snug">
                Triggers absolute alert as equity drops dangerously close to open positions maintenance guidelines.
              </p>
            </div>
          </div>

          <div className="bg-[#0a0b0d]/40 p-4 border border-brand-border rounded-lg text-xs text-gray-400">
            <h5 className="font-semibold text-gray-300 mb-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-brand-yellow shrink-0" />
              Intraday Margin Framework Note
            </h5>
            The standard margin utilization is determined as:
            <div className="font-mono bg-[#08090b] border border-brand-border px-2 py-1 my-1.5 rounded text-center text-gray-300 text-[11px]">
              (Maintenance Margin / Equity) × 100
            </div>
            Alpaca expects you to have a cushion here. If utilization crosses 100%, security liquidation will trigger automatically.
          </div>
        </div>

        {/* Live Triggers Log */}
        <div className="md:col-span-7 flex flex-col h-[270px] bg-[#0a0b0d] border border-brand-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-brand-card border-b border-brand-border flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <ShieldAlert className="w-4 h-4 text-gray-400" />
              Real-Time Alert Sentry Loop
            </h4>
            {alerts.length > 0 && (
              <button
                onClick={clearAlerts}
                className="text-[10px] text-gray-500 hover:text-gray-300 cursor-pointer flex items-center gap-0.5"
                id="clear-logs-btn"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-6 text-gray-600">
                <CircleSlash className="w-10 h-10 mb-2 stroke-1 text-gray-700" />
                <p className="text-xs font-medium">Sentry clear. No breaches logged.</p>
                <p className="text-[10px] mt-1 text-gray-500">Your margin framework utilization remains safely below active alerts triggers.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border flex items-start gap-2.5 animate-fadeIn ${
                    alert.type === "critical"
                      ? "bg-brand-red/10 border-brand-red/30"
                      : "bg-brand-yellow/10 border-brand-yellow/30"
                  }`}
                >
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                    alert.type === "critical" ? "text-brand-red animate-pulse" : "text-brand-yellow"
                  }`} />
                  <div className="space-y-0.5 flex-1 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-200">{alert.title}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{alert.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug">{alert.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
