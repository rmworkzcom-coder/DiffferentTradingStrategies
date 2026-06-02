"use client";

import React, { useState } from "react";
import { Copy, Check, Download, Settings, Flame, ShieldAlert, Zap, Terminal, Bell } from "lucide-react";

interface PythonExporterProps {
  warningThreshold: number;
  criticalThreshold: number;
  isPaper: boolean;
}

export default function PythonExporter({
  warningThreshold,
  criticalThreshold,
  isPaper,
}: PythonExporterProps) {
  const [platform, setPlatform] = useState<"discord" | "slack" | "webhook" | "console">("discord");
  const [webhookUrl, setWebhookUrl] = useState("https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN");
  const [cooldown, setCooldown] = useState(15); // Minutes
  const [checkInterval, setCheckInterval] = useState(10); // Seconds
  const [copied, setCopied] = useState(false);

  // Generate python script based on variables
  const pythonCode = `#!/usr/bin/env python3
"""
Alpaca Real-Time Intraday Margin Utilization Monitor
Configured with the New Intraday Margin Framework safety checks.

This script runs in an automated background loop, monitors your portfolio equity,
tracks maintenance margin limits, and triggers instant alerts when thresholds
are breached — bypassing old PDT constraints by monitoring liquid margin cushion.
"""

import os
import sys
import time
import requests
import json
from datetime import datetime

# ==================== CONFIGURATION ====================
# You can also set these via environment variables for security:
# export ALPACA_API_KEY="your_api_key"
# export ALPACA_API_SECRET="your_api_secret"

ALPACA_API_KEY = os.environ.get("ALPACA_API_KEY", "YOUR_ALPACA_API_KEY")
ALPACA_API_SECRET = os.environ.get("ALPACA_API_SECRET", "YOUR_ALPACA_API_SECRET")

# Use ${isPaper ? "Paper Trading" : "Live Trading"} endpoint by default
USE_PAPER = ${isPaper ? "True" : "False"}
BASE_URL = "https://paper-api.alpaca.markets" if USE_PAPER else "https://api.alpaca.markets"

# Alert thresholds
MARGIN_WARNING_LIMIT = ${warningThreshold}    # Trigger warning (approaching 25%)
MARGIN_CRITICAL_LIMIT = ${criticalThreshold}   # Trigger margin call threat (e.g. ${criticalThreshold}%)

COOLDOWN_MINUTES = ${cooldown}               # Cool down between notifications to prevent spam
CHECK_INTERVAL_SECONDS = ${checkInterval}         # How frequently to poll the Alpaca API

# Notification Platform: "${platform}"
PLATFORM = "${platform}"
WEBHOOK_URL = "${webhookUrl}"
# =======================================================

class MarginMonitor:
    def __init__(self):
        self.last_alert_time = 0
        self.last_critical_time = 0
        
        # Validate credentials
        if ALPACA_API_KEY == "YOUR_ALPACA_API_KEY" or ALPACA_API_SECRET == "YOUR_ALPACA_API_SECRET":
            print("[❌ ERROR] Please configure your real ALPACA_API_KEY and ALPACA_API_SECRET inside the script or env.", file=sys.stderr)
            print("[ℹ️ INFO] Running in console simulation mode with placeholder values...", file=sys.stderr)

    def log(self, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [MONITOR] {message}")

    def send_notification(self, title, message, color_hex="F1C40F"):
        """Sends alerts to Discord, Slack, Custom Webhooks, or Console."""
        self.log(f"ALERT: {title} - {message}")
        
        if PLATFORM == "console":
            return

        # Prepare payload
        if PLATFORM == "discord":
            payload = {
                "embeds": [{
                    "title": f"⚠️ {title}",
                    "description": message,
                    "color": int(color_hex, 16),
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "footer": {
                        "text": "Alpaca Real-time Margin Sentry"
                    }
                }]
            }
        elif PLATFORM == "slack":
            payload = {
                "text": f"*⚠️ {title}*\\n{message}"
            }
        else: # Generic webhook
            payload = {
                "event": "ALPACA_MARGIN_ALERT",
                "title": title,
                "message": message,
                "timestamp": time.time(),
                "level": "warning" if color_hex == "F1C40F" else "critical"
            }

        try:
            if not WEBHOOK_URL or "YOUR_WEBHOOK" in WEBHOOK_URL:
                self.log("⚠️ Webhook URL is not configured. Notification was only logged to console.")
                return
                
            response = requests.post(
                WEBHOOK_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            if response.status_code in [200, 204]:
                self.log("📨 Alert successfully sent to " + PLATFORM)
            else:
                self.log(f"❌ Failed to dispatch notification. Server returned status {response.status_code}")
        except Exception as e:
            self.log(f"❌ Error sending notification: {str(e)}")

    def fetch_account_data(self):
        """Fetches latest portfolio credentials from Alpaca API."""
        headers = {
            "APCA-API-KEY-ID": ALPACA_API_KEY,
            "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.get(f"{BASE_URL}/v2/account", headers=headers, timeout=5)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                self.log("❌ Unauthorized. Please check ALPACA_API_KEY or SECRETS.")
                return None
            else:
                self.log(f"❌ Failed to fetch account (HTTP {response.status_code}): {response.text}")
                return None
        except Exception as e:
            self.log(f"❌ Network error while connecting to Alpaca API: {str(e)}")
            return None

    def run(self):
        self.log("Starting Real-time Alpaca Margin Monitor Engine.")
        self.log(f"Targeting: {BASE_URL}")
        self.log(f"Safety Limits: Warning: {MARGIN_WARNING_LIMIT}% | Critical: {MARGIN_CRITICAL_LIMIT}%")
        self.log(f"Scanning every {CHECK_INTERVAL_SECONDS} seconds...")
        
        while True:
            account = self.fetch_account_data()
            if account:
                equity = float(account.get("equity", 0.0))
                maintenance_margin = float(account.get("maintenance_margin", 0.0))
                day_trading_bp = float(account.get("daytrading_buying_power", 0.0))
                
                # Check for divide-by-zero
                if equity > 0:
                    # Margin Utilization (Maintenance Margin vs total Equity)
                    margin_utilization = (maintenance_margin / equity) * 100
                else:
                    margin_utilization = 0.0

                cushion = equity - maintenance_margin
                cushion_pct = (cushion / equity * 100) if equity > 0 else 0.0

                self.log(
                    f"Portfolio Equity: \${equity:,.2f} | "
                    f"Utilized Margin: \${maintenance_margin:,.2f} ({margin_utilization:.2f}%) | "
                    f"Safety Cushion: \${cushion:,.2f} ({cushion_pct:.1f}%)"
                )

                current_time = time.time()
                cooldown_sec = COOLDOWN_MINUTES * 60

                # 1. Critical Level Check (High margin utilization, high liquidation risk)
                if margin_utilization >= MARGIN_CRITICAL_LIMIT:
                    if current_time - self.last_critical_time > cooldown_sec:
                        title = "🚨 CRITICAL LIQUIDATION RISK!"
                        message = (
                            f"Account Margin Utilization is at {margin_utilization:.1f}%!\\n\\n"
                            f"* portfolio Equity: \${equity:,.2f}\\n"
                            f"* Utilized Margin (MM): \${maintenance_margin:,.2f}\\n"
                            f"* Account Cushion remaining: \${cushion:,.2f} ({cushion_pct:.1f}%)\\n\\n"
                            f"⚠️ A margin call or automatic liquidation by Alpaca Risk Engine is imminent! "
                            f"Please reduce positions immediately to raise equity."
                        )
                        self.send_notification(title, message, color_hex="E74C3C")
                        self.last_critical_time = current_time

                # 2. Margin Utilization Alert Check (Approaching or exceeding 25% threshold)
                elif margin_utilization >= MARGIN_WARNING_LIMIT:
                    if current_time - self.last_alert_time > cooldown_sec:
                        title = "⚠️ MARGIN UTILIZATION WARNING"
                        message = (
                            f"Margin Utilization has breached the {MARGIN_WARNING_LIMIT}% threshold "
                            f"and is currently at *{margin_utilization:.1f}%*!\\n\\n"
                            f"* Total Portfolio Equity: \${equity:,.2f}\\n"
                            f"* Maintenance Margin: \${maintenance_margin:,.2f}\\n"
                            f"* Day Trading Buying Power: \${day_trading_bp:,.2f}\\n"
                            f"* Net Cushion: \${cushion:,.2f} ({cushion_pct:.1f}%)"
                        )
                        self.send_notification(title, message, color_hex="F1C40F")
                        self.last_alert_time = current_time
                        
            time.sleep(CHECK_INTERVAL_SECONDS)

if __name__ == "__main__":
    try:
        monitor = MarginMonitor()
        monitor.run()
    except KeyboardInterrupt:
        print("\\n[✔] Monitor engine gracefully stopped by user.")
        sys.exit(0)
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScript = () => {
    const element = document.createElement("a");
    const file = new Blob([pythonCode], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "alpaca_margin_monitor.py";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div id="python-exporter-root" className="bg-brand-card border border-brand-border rounded-xl p-5 md:p-6 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-brand-border pb-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="text-brand-green w-5 h-5 animate-pulse" />
            Automated Python Script Exporter
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Generate and deploy a lightweight, zero-dependency background daemon to monitor broker limits.
          </p>
        </div>
        <div className="flex gap-2 mt-3 md:mt-0">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg hover:bg-brand-card text-gray-200 text-xs rounded-lg transition border border-brand-border cursor-pointer font-sans font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
          <button
            onClick={downloadScript}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-green hover:bg-brand-green/90 text-black text-xs font-bold rounded-lg transition shadow-md shadow-brand-green/15 cursor-pointer font-sans"
          >
            <Download className="w-3.5 h-3.5" />
            Download Script (.py)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0a0b0d] p-4 border border-brand-border/80 rounded-lg">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
              <Settings className="w-3.5 h-3.5 text-gray-400" />
              Script Configuration
            </h4>

            {/* Notification platform selection */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Alert Trigger Platform
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["discord", "slack", "webhook", "console"] as const).map((plt) => (
                    <button
                      key={plt}
                      onClick={() => setPlatform(plt)}
                      className={`px-2 py-1.5 text-xs text-left capitalize border rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                        platform === plt
                          ? "bg-brand-card border-brand-green/30 text-white ring-1 ring-brand-green/30"
                          : "bg-[#0f1115]/40 border-brand-border/60 text-gray-400 hover:bg-[#0f1115]/80"
                      }`}
                    >
                      <Bell className={`w-3 h-3 ${platform === plt ? "text-brand-green" : "text-gray-500"}`} />
                      {plt}
                    </button>
                  ))}
                </div>
              </div>

              {platform !== "console" && (
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">
                    {platform === "discord" ? "Discord Webhook URL" : platform === "slack" ? "Slack Webhook URL" : "API Webhook Endpoint"}
                  </label>
                  <input
                    type="password"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#0a0b0d] border border-brand-border text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">
                    Poll Frequency
                  </label>
                  <select
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(Number(e.target.value))}
                    className="w-full bg-[#0a0b0d] border border-brand-border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-green"
                  >
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">
                    Alert Cooldown
                  </label>
                  <select
                    value={cooldown}
                    onChange={(e) => setCooldown(Number(e.target.value))}
                    className="w-full bg-[#0a0b0d] border border-brand-border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-green"
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-brand-green/5 border border-brand-green/15 rounded-lg text-xs leading-relaxed text-gray-300">
            <h5 className="font-semibold text-brand-green flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-brand-green" />
              PDT Exemption Strategy
            </h5>
            The new Intraday Margin Framework monitors liquid cushion thresholds dynamically. This script implements safety locks so you can trade comfortably while automating notifications on key thresholds.
          </div>
        </div>

        {/* Code View */}
        <div className="lg:col-span-8 flex flex-col h-[320px] bg-[#0a0b0d] border border-brand-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-brand-card border-b border-brand-border">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-red" />
              <div className="w-2.5 h-2.5 rounded-full bg-brand-yellow" />
              <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />
              <span className="ml-1.5">alpaca_margin_monitor.py</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Python 3.x</span>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-[11px] text-gray-300 font-mono leading-relaxed select-text bg-[#060708]/95 text-left">
            <code>{pythonCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
