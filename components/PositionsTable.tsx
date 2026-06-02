"use client";

import React, { useState } from "react";
import { TrendingUp, TrendingDown, Trash2, ShieldAlert, Zap, Compass, RefreshCw } from "lucide-react";

interface Position {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  side: "long" | "short";
  maintenance_margin_rate: number;
  realized_pnl?: number;
}

interface PositionsTableProps {
  positions: Position[];
  isMock: boolean;
  onAddPosition: (symbol: string, qty: number, price: number, side: "long" | "short", mmRate: number) => void;
  onRemovePosition: (symbol: string) => void;
  onSimulateMarketDrop: (pct: number) => void;
  onResetSimulation: () => void;
  onLiquidateAll?: () => void;
  onResetPaperSettings?: () => void;
  isConnected?: boolean;
  isPlacingOrder?: boolean;
  onPlaceLiveOrder?: (symbol: string, qty: number, side: "buy" | "sell") => Promise<{ error?: string; success?: boolean; data?: any }>;
  isPaper?: boolean;
}

export default function PositionsTable({
  positions,
  isMock,
  onAddPosition,
  onRemovePosition,
  onSimulateMarketDrop,
  onResetSimulation,
  onLiquidateAll,
  onResetPaperSettings,
  isConnected = false,
  isPlacingOrder = false,
  onPlaceLiveOrder,
  isPaper = true,
}: PositionsTableProps) {
  const [newSym, setNewSym] = useState("AAPL");
  const [newPrice, setNewPrice] = useState(180);
  const [newInvestment, setNewInvestment] = useState(2000);
  const [newQty, setNewQty] = useState(11.1111);
  const [newSide, setNewSide] = useState<"long" | "short">("long");
  const [newMmRate, setNewMmRate] = useState(0.25); // 25% margin rate

  // Alpaca Live Trading States
  const [liveSym, setLiveSym] = useState("AAPL");
  const [liveQty, setLiveQty] = useState<string>("0.01"); // String so users can input decimals smoothly
  const [liveSide, setLiveSide] = useState<"buy" | "sell">("buy");
  const [executing, setExecuting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePlaceLiveTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveSym || !liveQty || isNaN(Number(liveQty)) || Number(liveQty) <= 0) {
      setResultMsg({ type: "error", text: "Invalid symbol or quantity configuration." });
      return;
    }
    setExecuting(true);
    setResultMsg(null);
    try {
      if (onPlaceLiveOrder) {
        const res = await onPlaceLiveOrder(liveSym.trim().toUpperCase(), Number(liveQty), liveSide);
        if (res.error) {
          setResultMsg({ type: "error", text: res.error });
        } else {
          setResultMsg({ type: "success", text: `Success! ${liveSide.toUpperCase()} order submitted.` });
        }
      } else {
        setResultMsg({ type: "error", text: "Live order handler is missing." });
      }
    } catch (err: any) {
      setResultMsg({ type: "error", text: err?.message || "Execution exception error." });
    } finally {
      setExecuting(false);
    }
  };

  const handleResetForm = () => {
    setNewSym("AAPL");
    setNewPrice(180);
    setNewInvestment(2000);
    setNewQty(11.1111);
    setNewSide("long");
    setNewMmRate(0.25);
  };

  const handleResetAllPropsAndForm = () => {
    handleResetForm();
    onResetSimulation();
  };

  const handleResetPaperSettingsClick = () => {
    handleResetForm();
    if (onResetPaperSettings) {
      onResetPaperSettings();
    }
  };

  const handlePriceChange = (price: number) => {
    setNewPrice(price);
    if (price > 0 && newInvestment > 0) {
      setNewQty(Number((newInvestment / price).toFixed(4)));
    }
  };

  const handleInvestmentChange = (inv: number) => {
    setNewInvestment(inv);
    if (newPrice > 0) {
      setNewQty(Number((inv / newPrice).toFixed(4)));
    }
  };

  const handleQtyChange = (qty: number) => {
    setNewQty(qty);
    if (newPrice > 0) {
      setNewInvestment(Number((qty * newPrice).toFixed(2)));
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSym) return;
    onAddPosition(newSym.toUpperCase(), Number(newQty), Number(newPrice), newSide, Number(newMmRate));
  };

  const getPresetConfig = (symbol: string) => {
    switch (symbol) {
      case "AAPL": return { price: 180, mm: 0.25 };
      case "NVDA": return { price: 900, mm: 0.40 }; // Highly volatile
      case "TSLA": return { price: 175, mm: 0.35 };
      case "BTC/USD": return { price: 65000, mm: 0.50 }; // High margin required
      default: return { price: 100, mm: 0.30 };
    }
  };

  const handleSymbolChange = (sym: string) => {
    setNewSym(sym);
    const preset = getPresetConfig(sym);
    setNewPrice(preset.price);
    setNewMmRate(preset.mm);
    setNewQty(Number((newInvestment / preset.price).toFixed(4)));
  };

  return (
    <div id="positions-monitor-root" className="bg-brand-card border border-brand-border rounded-xl p-5 md:p-6 text-left">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-brand-border pb-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Compass className="text-brand-green w-5 h-5" />
            Intraday Open Positions monitor
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Analyze maintenance margins allocations per symbol. Real-time regulatory limits apply here.
          </p>
        </div>

        {/* Sandbox simulator panel if using mock mode */}
        {isMock && (
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 bg-[#0a0b0d] p-2.5 rounded-lg border border-brand-border">
            <span className="text-[10px] font-bold text-brand-yellow uppercase tracking-widest px-1.5 py-0.5 bg-brand-yellow/10 rounded border border-brand-yellow/30">
              Sandbox Controller
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onSimulateMarketDrop(0.2)}
                className="px-2.5 py-1 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red text-xs rounded border border-brand-red/30 cursor-pointer transition"
                id="market-crash-btn"
              >
                Simulate -20% Crash
              </button>
              <button
                onClick={() => onSimulateMarketDrop(0.4)}
                className="px-2.5 py-1 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red font-semibold text-xs rounded border border-brand-red/40 cursor-pointer transition"
                id="critical-dump-btn"
              >
                Simulate -40% Dump!
              </button>
              <button
                onClick={handleResetAllPropsAndForm}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-bg hover:bg-brand-card text-gray-200 text-xs rounded transition border border-brand-border cursor-pointer"
                id="reset-market-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Prices
              </button>
              
              {onLiquidateAll && (
                <button
                  onClick={onLiquidateAll}
                  className="px-2.5 py-1 bg-brand-red text-black font-bold text-xs rounded hover:bg-brand-red/90 cursor-pointer transition"
                  id="liquidate-all-sandbox-btn"
                >
                  Liquidate All
                </button>
              )}
              
              {onResetPaperSettings && (
                <button
                  onClick={handleResetPaperSettingsClick}
                  className="flex items-center gap-1 px-2.5 py-1 bg-brand-green text-black font-bold text-xs rounded hover:bg-brand-green/90 cursor-pointer transition"
                  id="reset-paper-settings-sandbox-btn"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Paper Settings
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Positions Table */}
        <div className="lg:col-span-8 overflow-x-auto">
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 bg-brand-bg/40 border border-dashed border-brand-border rounded-lg">
              <Compass className="w-8 h-8 mb-2 stroke-1 text-gray-600" />
              <p className="text-xs">No active assets holding margin.</p>
              <p className="text-[10px] mt-1 max-w-sm">Use the trade config on the side to simulate leveraging positions and watch MM boundaries.</p>
            </div>
          ) : (
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="text-gray-500 border-b border-brand-border text-left">
                  <th className="pb-3 pl-2">Asset / Side</th>
                  <th className="pb-3 text-right">Shares / Price</th>
                  <th className="pb-3 text-right">Avg Entry</th>
                  <th className="pb-3 text-right">Invested Capital</th>
                  <th className="pb-3 text-right">Market Value</th>
                  <th className="pb-3 text-right">Maint. Margin</th>
                  <th className="pb-3 text-right">Realized P&L</th>
                  <th className="pb-3 text-right">Unrealized P&L</th>
                  <th className="pb-3 text-center pl-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {positions.map((pos) => {
                  const mmCost = pos.market_value * pos.maintenance_margin_rate;
                  const plpc = pos.unrealized_plpc * 100;
                  const investedCapital = pos.qty * pos.avg_entry_price;
                  const realizedPnlVal = pos.realized_pnl || 0;
                  return (
                    <tr key={pos.symbol} className="hover:bg-brand-bg/40 transition-colors">
                      <td className="py-3 pl-2 text-left">
                        <div className="font-bold text-gray-200">{pos.symbol}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded border ${
                            pos.side === "long"
                              ? "bg-brand-green/10 text-brand-green border-brand-green/20"
                              : "bg-brand-red/10 text-brand-red border-brand-red/20"
                          }`}>
                            {pos.side}
                          </span>
                          <span className="text-[10px] text-gray-500">Vol Rate: {pos.maintenance_margin_rate * 100}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono text-gray-300">
                        <div>{pos.qty} shs</div>
                        <div className="text-[10px] text-gray-500">${pos.current_price?.toFixed(2)}</div>
                      </td>
                      <td className="py-3 text-right font-mono text-gray-300">
                        ${pos.avg_entry_price?.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono text-gray-300">
                        ${investedCapital?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-gray-200">
                        ${pos.market_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right font-mono text-brand-yellow font-semibold">
                        ${mmCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <div className="text-[9px] text-gray-500 font-normal">{(pos.maintenance_margin_rate * 100).toFixed(0)}%</div>
                      </td>
                      <td className={`py-3 text-right font-mono font-semibold ${realizedPnlVal >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                        {realizedPnlVal >= 0 ? "+" : ""}${realizedPnlVal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right font-mono">
                        <div className={`flex items-center justify-end gap-0.5 font-bold ${
                          pos.unrealized_pl >= 0 ? "text-brand-green" : "text-brand-red"
                        }`}>
                          {pos.unrealized_pl >= 0 ? <TrendingUp className="w-3 h-3 text-brand-green" /> : <TrendingDown className="w-3 h-3 text-brand-red" />}
                          <span>${pos.unrealized_pl?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className={`text-[9px] font-semibold ${
                          pos.unrealized_pl >= 0 ? "text-brand-green/80" : "text-brand-red/80"
                        }`}>
                          {pos.unrealized_pl >= 0 ? "+" : ""}{plpc?.toFixed(2)}%
                        </div>
                      </td>
                      <td className="py-3 text-center pl-2">
                        {isMock ? (
                          <button
                            onClick={() => onRemovePosition(pos.symbol)}
                            className="p-1 px-1.5 hover:bg-brand-red/10 hover:text-brand-red text-gray-500 rounded transition cursor-pointer"
                            title="Remove simulated holding"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              if (confirm(`Are you sure you want to close/liquidate all ${pos.qty} shares of ${pos.symbol}?`)) {
                                const targetSide = pos.side === "long" ? "sell" : "buy";
                                const res = await onPlaceLiveOrder?.(pos.symbol, pos.qty, targetSide);
                                if (res?.error) {
                                  alert(`Liquidation failed: ${res.error}`);
                                } else {
                                  alert("Liquidation order successfully submitted!");
                                }
                              }
                            }}
                            className="px-2 py-1 bg-brand-red text-black hover:bg-brand-red/90 text-[10px] font-black rounded duration-150 transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            title="Close real Alpaca position"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>CLOSE</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Trade Simulator (Mock Mode) vs Alpaca Live Order Card (Live Mode) */}
        <div className="lg:col-span-4 bg-[#0a0b0d] p-4 border border-brand-border rounded-lg">
          {isMock ? (
            <>
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-brand-yellow" />
                Trade Simulator
              </h4>
              <p className="text-[11px] text-gray-400 leading-snug mb-4">
                Place leveraged trades in our sandbox matrix to evaluate margins risk. Real-time calculations are reactive.
              </p>

              <form onSubmit={handleAdd} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Asset Symbol (Type or Select)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSym}
                      onChange={(e) => setNewSym(e.target.value.toUpperCase())}
                      className="flex-1 bg-brand-card border border-brand-border rounded-lg text-white p-2 font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-brand-green"
                      placeholder="e.g. AAPL, DOGEUSD"
                      id="preset-stock-input"
                      required
                    />
                    <select
                      value={newSym}
                      onChange={(e) => handleSymbolChange(e.target.value)}
                      className="bg-brand-card border border-brand-border rounded-lg text-white font-semibold p-2 focus:outline-none focus:ring-1 focus:ring-brand-green max-w-[120px]"
                    >
                      <option value="">Presets...</option>
                      <option value="AAPL">AAPL</option>
                      <option value="NVDA">NVDA</option>
                      <option value="TSLA">TSLA</option>
                      <option value="BTC/USD">BTC/USD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Investment Amount ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={newInvestment}
                    onChange={(e) => handleInvestmentChange(Number(e.target.value))}
                    className="w-full bg-brand-card border border-brand-border rounded-lg text-white p-2 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-green"
                    placeholder="Investment Amount"
                    id="investment-amount-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Buy Shares (Qty)</label>
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      value={newQty}
                      onChange={(e) => handleQtyChange(Number(e.target.value))}
                      className="w-full bg-brand-card border border-brand-border rounded-lg text-white p-2 font-semibold text-center focus:outline-none focus:ring-1 focus:ring-brand-green"
                      placeholder="Qty"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Cost Basis (Price)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={newPrice}
                      onChange={(e) => handlePriceChange(Number(e.target.value))}
                      className="w-full bg-brand-card border border-brand-border rounded-lg text-white p-2 font-semibold text-center focus:outline-none focus:ring-1 focus:ring-brand-green"
                      placeholder="Price"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Position Side</label>
                    <div className="flex bg-brand-card border border-brand-border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setNewSide("long")}
                        className={`flex-1 py-1.5 text-center font-bold text-[10px] cursor-pointer transition ${
                          newSide === "long" ? "bg-brand-green text-black" : "text-gray-400 hover:bg-brand-card/80"
                        }`}
                      >
                        LONG
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSide("short")}
                        className={`flex-1 py-1.5 text-center font-bold text-[10px] cursor-pointer transition ${
                          newSide === "short" ? "bg-brand-red text-white" : "text-gray-400 hover:bg-brand-card/80"
                        }`}
                      >
                        SHORT
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Maint. margin</label>
                    <select
                      value={newMmRate}
                      onChange={(e) => setNewMmRate(Number(e.target.value))}
                      className="w-full bg-brand-card border border-brand-border rounded-lg text-white font-semibold p-2 focus:outline-none focus:ring-1 focus:ring-brand-green"
                    >
                      <option value={0.25}>25% Rate</option>
                      <option value={0.30}>30% Rate</option>
                      <option value={0.35}>35% Rate</option>
                      <option value={0.40}>40% Rate</option>
                      <option value={0.50}>50% Rate</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isMock}
                  className="w-full py-2.5 rounded-lg text-xs font-bold font-sans cursor-pointer transition-all bg-brand-green text-black hover:bg-brand-green/90 shadow-md shadow-brand-green/10"
                >
                  Place Simulated Order
                </button>
              </form>
            </>
          ) : (
            <>
              <h4 className="text-xs font-black text-brand-green uppercase tracking-widest mb-2 flex items-center gap-1.5 font-mono">
                <Zap className="w-3.5 h-3.5 fill-brand-green animate-pulse" />
                Alpaca Live Order
              </h4>
              <p className="text-[11px] text-gray-400 leading-snug mb-3">
                Send live market orders directly to your connected {isPaper ? "Paper" : "Live"} Alpaca brokerage account.
              </p>

              <div className="p-2.5 bg-brand-bg/60 border border-brand-border rounded-lg text-[10px] text-gray-400 leading-normal mb-3.5 font-mono space-y-1">
                <div className="flex justify-between">
                  <span>Fractional Trading:</span>
                  <span className="text-brand-green font-bold text-right">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span>Small Balance ($5.80):</span>
                  <span className="text-brand-yellow font-bold text-right text-[10px]">Trades fractionals &lt; 1 item</span>
                </div>
              </div>

              {!isConnected ? (
                <div className="p-4 bg-brand-red/10 border border-brand-red/20 rounded-lg text-center text-xs font-semibold text-brand-red font-mono">
                  🔑 Key Pair Disconnected! Verify keys on Left sidebar to activate.
                </div>
              ) : (
                <form onSubmit={handlePlaceLiveTradeSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 font-mono">Stock Ticker</label>
                    <input
                      type="text"
                      required
                      value={liveSym}
                      onChange={(e) => setLiveSym(e.target.value.toUpperCase())}
                      className="w-full bg-brand-card border border-brand-border rounded-lg text-white p-2 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-green"
                      placeholder="e.g. AAPL, NVDA, DOGE, F"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 font-mono">Quantity (Qty)</label>
                    <input
                      type="text"
                      required
                      value={liveQty}
                      onChange={(e) => setLiveQty(e.target.value)}
                      className="w-full bg-brand-card border border-brand-border rounded-lg text-white p-2 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-green"
                      placeholder="e.g. 1 or 0.01"
                    />
                    <div className="flex gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setLiveQty("0.01")}
                        className="flex-1 py-1 bg-brand-bg hover:bg-brand-card text-[9px] font-bold text-gray-400 hover:text-white rounded border border-brand-border transition cursor-pointer"
                      >
                        0.01 Low Eq
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiveQty("0.05")}
                        className="flex-1 py-1 bg-brand-bg hover:bg-brand-card text-[9px] font-bold text-gray-400 hover:text-white rounded border border-brand-border transition cursor-pointer"
                      >
                        0.05
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiveQty("0.1")}
                        className="flex-1 py-1 bg-brand-bg hover:bg-brand-card text-[9px] font-bold text-gray-400 hover:text-white rounded border border-brand-border transition cursor-pointer"
                      >
                        0.10
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiveQty("1")}
                        className="flex-1 py-1 bg-brand-bg hover:bg-brand-card text-[9px] font-bold text-gray-400 hover:text-white rounded border border-brand-border transition cursor-pointer"
                      >
                        1.00
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 font-mono">Order Actions</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLiveSide("buy")}
                        className={`py-2 text-center rounded-lg font-black text-xs transition duration-200 cursor-pointer ${
                          liveSide === "buy"
                            ? "bg-brand-green text-black"
                            : "bg-brand-card text-gray-500 hover:text-gray-300 border border-brand-border"
                        }`}
                      >
                        BUY MARKET
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiveSide("sell")}
                        className={`py-2 text-center rounded-lg font-black text-xs transition duration-200 cursor-pointer ${
                          liveSide === "sell"
                            ? "bg-brand-red text-white"
                            : "bg-brand-card text-gray-500 hover:text-gray-300 border border-brand-border"
                        }`}
                      >
                        SELL MARKET
                      </button>
                    </div>
                  </div>

                  {resultMsg && (
                    <div className={`p-2.5 rounded-lg border text-[10px] font-bold font-mono tracking-tight leading-relaxed ${
                      resultMsg.type === "success"
                        ? "bg-brand-green/10 border-brand-green/30 text-brand-green"
                        : "bg-brand-red/10 border-brand-red/30 text-brand-red"
                    }`}>
                      {resultMsg.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={executing}
                    className="w-full bg-[#ff9f43] hover:bg-[#ff9f43]/90 disabled:bg-[#16171d] text-black disabled:text-gray-600 font-bold text-xs py-2.5 rounded-lg transition duration-200 shadow-md transform active:scale-[0.98] cursor-pointer uppercase flex items-center justify-center gap-1.5 font-mono"
                  >
                    {executing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Transmit...
                      </>
                    ) : (
                      <span>TRANSMIT {liveSide.toUpperCase()} ORDER</span>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
