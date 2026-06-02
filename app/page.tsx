"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Flame,
  Zap,
  RefreshCw,
  Eye,
  EyeOff,
  Terminal,
  Compass,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Info,
  Play,
  Pause,
  Skull,
  Plus,
  Target,
  Settings,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import PositionsTable from "@/components/PositionsTable";
import RiskAnalysis from "@/components/RiskAnalysis";
import PythonExporter from "@/components/PythonExporter";
import AlertSettings, { AlertLogItem } from "@/components/AlertSettings";

// Type definitions
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

interface AlgoOrder {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  status: "FILLED" | "PENDING" | "REJECTED" | "CANCELLED";
  submittedAt: string;
  strategyTag: string;
  type: "MARKET" | "LIMIT";
}

interface AlgoFill {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  pnlImpact: number;
  filledAt: string;
}

interface DailyPnlItem {
  time: string;
  realizedPnl: number;
  unrealizedPnl: number;
  equity: number;
  maxDrawdown: number;
}

interface RiskLogItem {
  id: string;
  timestamp: string;
  symbol: string;
  action: string;
  passed: boolean;
  details: string;
}

export default function Page() {
  // Mode selection: "mock" or "real"
  const [mode, setMode] = useState<"mock" | "real">("real");

  // Real credentials from localStorage
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("apca_api_key") || "";
      } catch (e) {
        console.error("Local storage read error for apiKey:", e);
      }
    }
    return "";
  });
  const [apiSecret, setApiSecret] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("apca_api_secret") || "";
      } catch (e) {
        console.error("Local storage read error for apiSecret:", e);
      }
    }
    return "";
  });
  const [isPaper, setIsPaper] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("apca_is_paper") !== "false";
      } catch (e) {
        console.error("Local storage read error for isPaper:", e);
      }
    }
    return true;
  });
  const [showSecret, setShowSecret] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Save to localStorage when changed
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("apca_api_key", apiKey);
        localStorage.setItem("apca_api_secret", apiSecret);
        localStorage.setItem("apca_is_paper", String(isPaper));
      } catch (e) {
        console.error("Local storage save error:", e);
      }
    }
  }, [apiKey, apiSecret, isPaper]);

  // Sentry limits State
  const [warningThreshold, setWarningThreshold] = useState(25); // Target safe limit
  const [criticalThreshold, setCriticalThreshold] = useState(80); // Liquidation threat limit

  // CORE PORTFOLIO ENGINE STATES
  const startOfDayEquity = 120975.0;
  const [equity, setEquity] = useState(120975.0);
  
  const [cash, setCashState] = useState(44775.0);
  const cashRef = useRef(44775.0);
  const setCash = (val: number | ((prev: number) => number)) => {
    if (typeof val === "function") {
      setCashState((prev) => {
        const next = val(prev);
        cashRef.current = next;
        return next;
      });
    } else {
      cashRef.current = val;
      setCashState(val);
    }
  };

  const [maintenanceMargin, setMaintenanceMargin] = useState(25972.5);
  const [initialMargin, setInitialMargin] = useState(31500.0);
  const [dayTradingBP, setDayTradingBP] = useState(483900.0);
  const [regTBP, setRegTBP] = useState(241950.0);
  const [pdtCount, setPdtCount] = useState(2);
  const [multiplier, setMultiplier] = useState("4");
  const [isPdt, setIsPdt] = useState(true);

  // Portfolio Accounting variables
  const [totalRealizedPnl, setTotalRealizedPnlState] = useState(1250.0);
  const totalRealizedPnlRef = useRef(1250.0);
  const setTotalRealizedPnl = (val: number | ((prev: number) => number)) => {
    if (typeof val === "function") {
      setTotalRealizedPnlState((prev) => {
        const next = val(prev);
        totalRealizedPnlRef.current = next;
        return next;
      });
    } else {
      totalRealizedPnlRef.current = val;
      setTotalRealizedPnlState(val);
    }
  };

  // Position holds
  const [positions, setPositions] = useState<Position[]>([
    {
      symbol: "AAPL",
      qty: 150,
      avg_entry_price: 172.5,
      current_price: 175.0,
      market_value: 26250,
      unrealized_pl: 375,
      unrealized_plpc: 0.0145,
      side: "long",
      maintenance_margin_rate: 0.25,
      realized_pnl: 420.0,
    },
    {
      symbol: "NVDA",
      qty: 45,
      avg_entry_price: 800.0,
      current_price: 850.0,
      market_value: 38250,
      unrealized_pl: 2250,
      unrealized_plpc: 0.0625,
      side: "long",
      maintenance_margin_rate: 0.40,
      realized_pnl: 830.0,
    },
    {
      symbol: "TSLA",
      qty: 60,
      avg_entry_price: 210.0,
      current_price: 195.0,
      market_value: 11700,
      unrealized_pl: -900,
      unrealized_plpc: -0.0714,
      side: "long",
      maintenance_margin_rate: 0.35,
      realized_pnl: 0.0,
    },
  ]);

  // AUTOMATED TRADING LOGIC CONFIGS
  const [autoTradingActive, setAutoTradingActive] = useState(false);
  const [autoTradingStatus, setAutoTradingStatus] = useState<"RUNNING" | "PAUSED" | "HALTED">("PAUSED");
  const [selectedStrategy, setSelectedStrategy] = useState("MOMENTUM_TRADER_V4");
  const [watchlist, setWatchlist] = useState<string[]>(["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"]);
  const [maxCapitalPerTradePct, setMaxCapitalPerTradePct] = useState(15);
  const [stopLossPct, setStopLossPct] = useState(3.0);
  const [takeProfitPct, setTakeProfitPct] = useState(6.0);
  const [maxOpenPositions, setMaxOpenPositions] = useState(5);
  const [strategyEnabled, setStrategyEnabled] = useState(true);

  // RISK PROTECTIONS SLIDERS
  const [maxDailyLossPct, setMaxDailyLossPct] = useState(4.0);
  const [maxLeverage, setMaxLeverage] = useState(3.5);
  const [maxPositionSizePct, setMaxPositionSizePct] = useState(25);
  const [riskCheckLog, setRiskCheckLog] = useState<RiskLogItem[]>([
    {
      id: "risk-init",
      timestamp: new Date().toLocaleTimeString(),
      symbol: "SYS",
      action: "INIT_SECURITIES",
      passed: true,
      details: "Sentry Core protection engine online. Margin limits verified.",
    },
    {
      id: "risk-init-lev",
      timestamp: new Date().toLocaleTimeString(),
      symbol: "SYS",
      action: "LEVERAGE_GUIDE",
      passed: true,
      details: "Current leverage is 1.45x, within target max limit coefficient.",
    },
  ]);

  // Real-time market state arrays to simulate standard SMA values
  const [tickerPrices, setTickerPrices] = useState<{ [symbol: string]: number }>({
    AAPL: 175.0,
    NVDA: 850.0,
    TSLA: 195.0,
    MSFT: 420.0,
    AMZN: 180.0,
  });

  const [priceHistories, setPriceHistories] = useState<{ [symbol: string]: number[] }>(() => {
    const initial: { [symbol: string]: number[] } = {};
    const bases: { [sym: string]: number } = {
      AAPL: 175.0,
      NVDA: 850.0,
      TSLA: 195.0,
      MSFT: 420.0,
      AMZN: 180.0,
    };
    Object.keys(bases).forEach((sym) => {
      let price = bases[sym];
      const arr: number[] = [];
      for (let i = 0; i < 60; i++) {
        price = price + Math.sin(i / 4) * 1.5 + (Math.random() - 0.48) * 0.5;
        arr.push(Number(price.toFixed(2)));
      }
      initial[sym] = arr;
    });
    return initial;
  });

  // Orders and executions tracking list
  const [orders, setOrders] = useState<AlgoOrder[]>([
    {
      id: "ord-initial-1",
      symbol: "NVDA",
      side: "BUY",
      qty: 45,
      price: 800.0,
      status: "FILLED",
      submittedAt: "09:32:15",
      strategyTag: "MOMENTUM_TRADER_V4",
      type: "MARKET",
    },
    {
      id: "ord-initial-2",
      symbol: "MSFT",
      side: "SELL",
      qty: 40,
      price: 410.0,
      status: "FILLED",
      submittedAt: "10:14:50",
      strategyTag: "MOMENTUM_TRADER_V4",
      type: "MARKET",
    },
  ]);

  const [recentFills, setRecentFills] = useState<AlgoFill[]>([
    {
      id: "fill-initial-1",
      symbol: "NVDA",
      side: "BUY",
      qty: 45,
      price: 800.0,
      pnlImpact: 0,
      filledAt: "09:32:15",
    },
    {
      id: "fill-initial-2",
      symbol: "MSFT",
      side: "SELL",
      qty: 40,
      price: 418.5,
      pnlImpact: 340.0,
      filledAt: "10:14:50",
    },
  ]);

  // HISTORICAL CHARTS FOR RECHARTS
  const [history, setHistory] = useState<any[]>(() => {
    const now = new Date();
    return Array.from({ length: 15 }).map((_, i) => {
      const timeStr = new Date(now.getTime() - (15 - i) * 10000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const fluctuator = Math.sin(i / 2) * 1200;
      return {
        time: timeStr,
        equity: 120975.0 + fluctuator,
        maintenanceMargin: 25972.5 + fluctuator * 0.15,
        cushion: 120975.0 + fluctuator - (25972.5 + fluctuator * 0.15),
      };
    });
  });

  const [dailyPnlHistory, setDailyPnlHistory] = useState<DailyPnlItem[]>(() => {
    const now = new Date();
    return Array.from({ length: 15 }).map((_, i) => {
      const timeStr = new Date(now.getTime() - (15 - i) * 10000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return {
        time: timeStr,
        realizedPnl: 1000.0 + i * 20,
        unrealizedPnl: Math.sin(i / 2) * 500,
        equity: 120000.0 + i * 100 + Math.sin(i / 2) * 400,
        maxDrawdown: 0.15,
      };
    });
  });

  // Alert Sentry Logs List
  const [alerts, setAlerts] = useState<AlertLogItem[]>([]);

  // TABS SWAP
  const [activeTab, setActiveTab] = useState<"positions" | "executions" | "analysis" | "python" | "settings">("positions");

  const [lastRefreshed, setLastRefreshed] = useState<string>(() => new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Prevent multiple redundant trigger alert checks
  const cooldownRef = useRef<{ [key: string]: number }>({});

  const addRiskLog = (symbol: string, action: string, passed: boolean, details: string) => {
    const newItem: RiskLogItem = {
      id: `risk-item-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      symbol,
      action,
      passed,
      details,
    };
    setRiskCheckLog((prev) => [newItem, ...prev].slice(0, 100));
  };

  // RECALCULATE GLOBAL portfolio metrics (reactive helper)
  const recalculateMetrics = (currentPositions: Position[]) => {
    let totalPValue = 0;
    let totalMM = 0;
    let totalPL = 0;

    currentPositions.forEach((pos) => {
      totalPValue += pos.market_value;
      totalMM += pos.market_value * pos.maintenance_margin_rate;
      totalPL += pos.unrealized_pl;
    });

    const currentCash = cashRef.current;
    const currentRealizedPnl = totalRealizedPnlRef.current;
    const freshEquity = currentCash + totalPValue;
    setEquity(freshEquity);
    setMaintenanceMargin(totalMM);
    setInitialMargin(totalMM * 1.25);
    setDayTradingBP(Math.max(0, 4 * (freshEquity - totalMM * 0.8)));
    setRegTBP(Math.max(0, 2 * freshEquity));

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // Update Sentry cushion flow
    setHistory((prev) => {
      const nextHist = [...prev, {
        time: nowStr,
        equity: freshEquity,
        maintenanceMargin: totalMM,
        cushion: freshEquity - totalMM
      }];
      if (nextHist.length > 20) {
        nextHist.shift();
      }
      return nextHist;
    });

    // Update P&L history
    setDailyPnlHistory((prev) => {
      const nextHist = [...prev, {
        time: nowStr,
        realizedPnl: currentRealizedPnl,
        unrealizedPnl: totalPL,
        equity: freshEquity,
        maxDrawdown: Math.max(0, ((startOfDayEquity - freshEquity) / startOfDayEquity) * 100),
      }];
      if (nextHist.length > 20) {
        nextHist.shift();
      }
      return nextHist;
    });

    setLastRefreshed(new Date().toLocaleTimeString());
  };

  // Math SMA computer helper
  const getSMAs = (prices: number[]) => {
    if (prices.length < 50) return { sma20: 0, sma50: 0, sma20Prev: 0 };
    const last20 = prices.slice(-20);
    const sma20 = last20.reduce((sum, p) => sum + p, 0) / 20;

    const prev20 = prices.slice(-21, -1);
    const sma20Prev = prev20.reduce((sum, p) => sum + p, 0) / 20;

    const last50 = prices.slice(-50);
    const sma50 = last50.reduce((sum, p) => sum + p, 0) / 50;

    return { sma20, sma50, sma20Prev };
  };

  // CORE HEARTBEAT ENGINE EFFECT REFS (to prevent interval stutters on hooks mutation!)
  const engineStateRef = useRef({
    tickerPrices,
    priceHistories,
    positions,
    autoTradingActive,
    autoTradingStatus,
    watchlist,
    maxCapitalPerTradePct,
    stopLossPct,
    takeProfitPct,
    maxOpenPositions,
    strategyEnabled,
    selectedStrategy,
    maxDailyLossPct,
    maxLeverage,
    maxPositionSizePct,
    cash,
    equity,
    maintenanceMargin,
    orders,
    recentFills,
    totalRealizedPnl,
  });

  useEffect(() => {
    engineStateRef.current = {
      tickerPrices,
      priceHistories,
      positions,
      autoTradingActive,
      autoTradingStatus,
      watchlist,
      maxCapitalPerTradePct,
      stopLossPct,
      takeProfitPct,
      maxOpenPositions,
      strategyEnabled,
      selectedStrategy,
      maxDailyLossPct,
      maxLeverage,
      maxPositionSizePct,
      cash,
      equity,
      maintenanceMargin,
      orders,
      recentFills,
      totalRealizedPnl,
    };
  });

  // Ticks standard random fluctuation / live polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Defer execution references to the thread ref to prevent react stale hooks
      const state = engineStateRef.current;

      const nextPrices = { ...state.tickerPrices };
      const nextHistories = { ...state.priceHistories };

      // Fluctuate watchlist
      Object.keys(nextPrices).forEach((sym) => {
        const curPrice = nextPrices[sym];
        const wave = Math.sin(Date.now() / 30000) * 0.12; // Natural trend vector
        const changePct = (Math.random() - 0.49) * 0.007 + wave * 0.003;
        let nextPrice = curPrice * (1 + changePct);
        if (nextPrice <= 0) nextPrice = 1.0;
        nextPrice = Number(nextPrice.toFixed(2));

        nextPrices[sym] = nextPrice;

        const historyArr = [...(nextHistories[sym] || [])];
        historyArr.push(nextPrice);
        if (historyArr.length > 60) {
          historyArr.shift();
        }
        nextHistories[sym] = historyArr;
      });

      setTickerPrices(nextPrices);
      setPriceHistories(nextHistories);

      // Reconcile position market valuations based on fresh prices ticks
      let updatedPositions = state.positions.map((pos) => {
        const currentSymbolPrice = nextPrices[pos.symbol];
        if (currentSymbolPrice !== undefined) {
          const newMarketValue = pos.qty * currentSymbolPrice;
          const purchaseCost = pos.qty * pos.avg_entry_price;
          const freshPL = pos.side === "long"
            ? (newMarketValue - purchaseCost)
            : (purchaseCost - newMarketValue);
          return {
            ...pos,
            current_price: currentSymbolPrice,
            market_value: newMarketValue,
            unrealized_pl: freshPL,
            unrealized_plpc: purchaseCost > 0 ? (freshPL / purchaseCost) : 0,
          };
        }
        return pos;
      });

      // Run automated strategy if RUNNING
      if (state.autoTradingActive && state.autoTradingStatus === "RUNNING") {
        const nextOrders = [...state.orders];
        const nextRecentFills = [...state.recentFills];
        let nextCash = state.cash;
        let realizedDelta = 0;

        state.watchlist.forEach((sym) => {
          const posIdx = updatedPositions.findIndex((p) => p.symbol === sym);
          const hasPos = posIdx > -1;
          const prices = nextHistories[sym] || [];
          const { sma20, sma50, sma20Prev } = getSMAs(prices);
          const currentPrice = nextPrices[sym];
          const prevPrice = prices[prices.length - 2] || currentPrice;

          if (hasPos) {
            // Check liquidations triggers
            const position = updatedPositions[posIdx];
            const slHit = currentPrice <= position.avg_entry_price * (1 - state.stopLossPct / 100);
            const tpHit = currentPrice >= position.avg_entry_price * (1 + state.takeProfitPct / 100);
            const crossUnder = currentPrice < sma20;

            if (slHit || tpHit || crossUnder) {
              const reason = slHit
                ? "Stop-Loss Limit Reached"
                : tpHit
                ? "Take-Profit Limit Reached"
                : "SMA(20) Crossover Exit Strategy";

              const proceeds = position.market_value;
              const realization = position.unrealized_pl;

              nextCash += proceeds;
              realizedDelta += realization;

              nextOrders.unshift({
                id: `ord-auto-${Date.now()}-${sym}`,
                symbol: sym,
                side: "SELL",
                qty: position.qty,
                price: currentPrice,
                status: "FILLED",
                submittedAt: new Date().toLocaleTimeString(),
                strategyTag: state.selectedStrategy,
                type: "MARKET",
              });

              nextRecentFills.unshift({
                id: `fill-auto-${Date.now()}-${sym}`,
                symbol: sym,
                side: "SELL",
                qty: position.qty,
                price: currentPrice,
                pnlImpact: realization,
                filledAt: new Date().toLocaleTimeString(),
              });

              // Apply Removal
              updatedPositions = updatedPositions.filter((p) => p.symbol !== sym);

              addRiskLog(
                sym,
                "ORDER_EXECUTED_SELL",
                true,
                `Auto-exit condition met [${reason}]. Realized: $${realization.toFixed(2)}`
              );
            }
          } else {
            // Check crossover buying momentum triggers
            const crossAbove = prevPrice <= sma20Prev && currentPrice > sma20 && sma20 > sma50;
            if (crossAbove && updatedPositions.length < state.maxOpenPositions && state.strategyEnabled) {
              // Allocate capital math
              const proposedCapital = (state.maxCapitalPerTradePct * state.equity) / 100;
              const capLimit = Math.min(proposedCapital, nextCash);
              const qtyToBuy = Math.floor(capLimit / currentPrice);

              if (qtyToBuy > 0) {
                const cost = qtyToBuy * currentPrice;

                // Live safety checks
                const currentDrawdownVal = Math.max(0, startOfDayEquity - state.equity);
                const dailyLossLimitPassed = currentDrawdownVal < (startOfDayEquity * state.maxDailyLossPct / 100);
                const projectedMM = state.maintenanceMargin + (cost * 0.3); // Est. 30% MM rate
                const leverageCheckPassed = (projectedMM / state.equity) <= state.maxLeverage;
                const positionSizeCheckPassed = cost <= (state.maxPositionSizePct * state.equity / 100);

                if (!dailyLossLimitPassed) {
                  addRiskLog(sym, "AUTO_BUY_REJECT", false, "Halted: Peak loss circuit breaker breached! Autotrading suspended.");
                  setAutoTradingStatus("HALTED");
                  return;
                }

                if (!leverageCheckPassed) {
                  addRiskLog(sym, "AUTO_BUY_REJECT", false, `Rejected: Multiplier risk exceeds safe leverage cap limit (${state.maxLeverage}x)`);
                  return;
                }

                if (!positionSizeCheckPassed) {
                  addRiskLog(sym, "AUTO_BUY_REJECT", false, `Rejected: Proposed cost exceeds maximum position limit constraint (${state.maxPositionSizePct}%)`);
                  return;
                }

                // Execute trade acquisition
                nextCash -= cost;

                nextOrders.unshift({
                  id: `ord-auto-${Date.now()}-${sym}`,
                  symbol: sym,
                  side: "BUY",
                  qty: qtyToBuy,
                  price: currentPrice,
                  status: "FILLED",
                  submittedAt: new Date().toLocaleTimeString(),
                  strategyTag: state.selectedStrategy,
                  type: "MARKET",
                });

                nextRecentFills.unshift({
                  id: `fill-auto-${Date.now()}-${sym}`,
                  symbol: sym,
                  side: "BUY",
                  qty: qtyToBuy,
                  price: currentPrice,
                  pnlImpact: 0,
                  filledAt: new Date().toLocaleTimeString(),
                });

                // Compute volatility standard MM coefficients
                let rate = 0.25;
                if (["NVDA", "TSLA"].includes(sym)) rate = 0.40;
                else if (sym === "BTC/USD") rate = 0.50;

                updatedPositions.push({
                  symbol: sym,
                  qty: qtyToBuy,
                  avg_entry_price: currentPrice,
                  current_price: currentPrice,
                  market_value: cost,
                  unrealized_pl: 0,
                  unrealized_plpc: 0,
                  side: "long",
                  maintenance_margin_rate: rate,
                  realized_pnl: 0,
                });

                addRiskLog(
                  sym,
                  "ORDER_EXECUTED_BUY",
                  true,
                  `Momentum Crossover triggers BUY. Acquired ${qtyToBuy} Shares at $${currentPrice.toFixed(2)}.`
                );
              }
            }
          }
        });

        if (realizedDelta !== 0) {
          setTotalRealizedPnl((prev) => prev + realizedDelta);
        }
        setOrders(nextOrders);
        setRecentFills(nextRecentFills);
        setCash(nextCash);
      }

      setPositions(updatedPositions);
      recalculateMetrics(updatedPositions);

    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handle live data fetch
  const fetchLiveData = async () => {
    if (!apiKey || !apiSecret) {
      setErrorText("API credentials are not configured. Enter details under the integration key module.");
      return;
    }
    setIsRefreshing(true);
    setErrorText(null);

    try {
      const response = await fetch("/api/alpaca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret, isPaper }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to communicate with Alpaca API endpoint.");
      }

      const data = await response.json();
      const account = data.account;
      const originalPositions = data.positions;

      const mappedPositions: Position[] = originalPositions.map((pos: any) => {
        const symbol = pos.symbol;
        let rate = 0.25;
        if (["NVDA", "TSLA", "COIN", "BTC/USD"].includes(symbol)) {
          rate = 0.40;
        } else if (pos.asset_class === "crypto") {
          rate = 0.50;
        }

        return {
          symbol,
          qty: Math.abs(Number(pos.qty)),
          avg_entry_price: Number(pos.avg_entry_price),
          current_price: Number(pos.current_price),
          market_value: Number(pos.market_value),
          unrealized_pl: Number(pos.unrealized_pl),
          unrealized_plpc: Number(pos.unrealized_plpc),
          side: pos.side as "long" | "short",
          maintenance_margin_rate: rate,
          realized_pnl: 0,
        };
      });

      setPositions(mappedPositions);
      setEquity(Number(account.equity));
      setCash(Number(account.cash));
      setMaintenanceMargin(Number(account.maintenance_margin));
      setInitialMargin(Number(account.initial_margin));
      setDayTradingBP(Number(account.daytrading_buying_power));
      setRegTBP(Number(account.regt_buying_power));
      setMultiplier(account.multiplier);
      setIsPdt(account.pattern_day_trader);
      setPdtCount(account.daytrade_count);
      setIsConnected(true);
      setLastRefreshed(new Date().toLocaleTimeString());
      addRiskLog("ALPACA", "METRICS_FETCHED", true, "Retrieved live account parameters, boundaries, and active positions.");
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "An unexpected error occurred. Verify credentials validity.");
      setIsConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Poll Alpaca in real mode
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mode === "real" && isConnected) {
      timer = setInterval(() => {
        fetchLiveData();
      }, 7000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isConnected, apiKey, apiSecret, isPaper]);

  // Auto-connect once on mount if saved credentials are loaded
  const autoConnectedRef = useRef(false);
  useEffect(() => {
    if (apiKey && apiSecret && !isConnected && !autoConnectedRef.current) {
      autoConnectedRef.current = true;
      const initialTimer = setTimeout(() => {
        fetchLiveData();
      }, 500);
      return () => clearTimeout(initialTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, apiSecret, isConnected]);

  // Command control buttons
  const handleToggleAutoTrading = () => {
    if (autoTradingStatus === "HALTED") {
      alert("Halted! Engine is locked under safety circuit protection. Resolve risks parameters or clear manually.");
      return;
    }
    const nextState = !autoTradingActive;
    setAutoTradingActive(nextState);
    setAutoTradingStatus(nextState ? "RUNNING" : "PAUSED");
    addRiskLog("SYS", nextState ? "ENGINE_START" : "ENGINE_PAUSED", true, nextState ? "Automated system enforcemer active. Watchlist monitored." : "Algorithmic loop paused.");
  };

  const handleKillSwitch = () => {
    setAutoTradingActive(false);
    setAutoTradingStatus("HALTED");

    // Cancel all mock orders and close open holdings
    if (positions.length > 0) {
      let liquidationSalesTotal = 0;
      let realizedLoses = 0;
      const nextRecent = [...recentFills];
      const nextOrders = [...orders];

      positions.forEach((pos) => {
        liquidationSalesTotal += pos.market_value;
        realizedLoses += pos.unrealized_pl;

        nextOrders.unshift({
          id: `kill-${Date.now()}-${pos.symbol}`,
          symbol: pos.symbol,
          side: "SELL",
          qty: pos.qty,
          price: pos.current_price,
          status: "FILLED",
          submittedAt: new Date().toLocaleTimeString(),
          strategyTag: "KILL_SWITCH",
          type: "MARKET",
        });

        nextRecent.unshift({
          id: `kill-fill-${Date.now()}-${pos.symbol}`,
          symbol: pos.symbol,
          side: "SELL",
          qty: pos.qty,
          price: pos.current_price,
          pnlImpact: pos.unrealized_pl,
          filledAt: new Date().toLocaleTimeString(),
        });
      });

      setCash((c) => c + liquidationSalesTotal);
      setTotalRealizedPnl((prev) => prev + realizedLoses);
      setOrders(nextOrders);
      setRecentFills(nextRecent);
      setPositions([]);
      setTimeout(() => recalculateMetrics([]), 50);
    }

    addRiskLog("SYS", "EMERGENCY_KILL", false, "KILL SWITCH DEPLOYED: Closed out all positions, cancelled orders and locked the engine.");
  };

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const handlePlaceRealOrder = async (
    symbol: string,
    qty: number,
    side: "long" | "short"
  ) => {
    if (!apiKey || !apiSecret) {
      alert("Alpaca credentials are not configured. Enter details under the integration key module.");
      return;
    }
    setIsPlacingOrder(true);
    try {
      const response = await fetch("/api/alpaca/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          isPaper,
          symbol: symbol.toUpperCase(),
          qty,
          side: side === "long" ? "buy" : "sell",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Alpaca rejected order execution.");
      }

      const orderData = await response.json();
      addRiskLog(
        symbol.toUpperCase(),
        `REAL_TRADE_${side === "long" ? "BUY" : "SELL"}_SUCCESS`,
        true,
        `Executed real trade for ${qty} shares: Order ID ${orderData.id}, Status: ${orderData.status || "Accepted"}.`
      );
      
      const orderId = orderData.id || `real-${Date.now()}-${symbol}`;
      setOrders((o) => [
        {
          id: orderId,
          symbol: symbol.toUpperCase(),
          side: side === "long" ? "BUY" : "SELL",
          qty,
          price: orderData.filled_avg_price ? Number(orderData.filled_avg_price) : 0,
          status: orderData.status?.toUpperCase() || "FILLED",
          submittedAt: new Date().toLocaleTimeString(),
          strategyTag: "MANUAL_TERMINAL",
          type: "MARKET",
        },
        ...o,
      ]);

      alert(`Trade placed successfully on Alpaca! Order ID: ${orderData.id}`);
      await fetchLiveData();
    } catch (err: any) {
      console.error(err);
      addRiskLog(
        symbol.toUpperCase(),
        "REAL_TRADE_FAILED",
        false,
        err.message || "An unexpected error occurred during execution."
      );
      alert(`Failed to place live trade: ${err.message || "Unknown error"}`);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePlaceLiveOrder = async (
    symbol: string,
    qty: number,
    side: "buy" | "sell"
  ): Promise<{ error?: string; success?: boolean; data?: any }> => {
    if (!apiKey || !apiSecret) {
      return { error: "Alpaca credentials are not configured below." };
    }
    try {
      const response = await fetch("/api/alpaca/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          isPaper,
          symbol: symbol.toUpperCase(),
          qty,
          side,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { error: errData.error || "Alpaca rejected live order execution." };
      }

      const orderData = await response.json();
      addRiskLog(
        symbol.toUpperCase(),
        `LIVE_ORDER_${side.toUpperCase()}_SUCCESS`,
        true,
        `Executed real order for ${qty} shares: Order id ${orderData.id}, Status: ${orderData.status || "Submitted"}.`
      );

      const orderId = orderData.id || `live-${Date.now()}-${symbol}`;
      setOrders((o) => [
        {
          id: orderId,
          symbol: symbol.toUpperCase(),
          side: side === "buy" ? "BUY" : "SELL",
          qty,
          price: orderData.filled_avg_price ? Number(orderData.filled_avg_price) : 0,
          status: orderData.status?.toUpperCase() || "ACCEPTED",
          submittedAt: new Date().toLocaleTimeString(),
          strategyTag: "MANUAL_TERMINAL",
          type: "MARKET",
        },
        ...o,
      ]);

      // Soft trigger data refresh
      setTimeout(() => {
        fetchLiveData();
      }, 1500);

      return { success: true, data: orderData };
    } catch (err: any) {
      console.error(err);
      addRiskLog(
        symbol.toUpperCase(),
        "LIVE_ORDER_FAILED",
        false,
        err.message || "An unexpected error occurred during live order execution."
      );
      return { error: err.message || "An unexpected order transmission error occurred." };
    }
  };

  // Mock Trade Trigger (Interactive Widget)
  const handleAddMockPosition = (
    symbol: string,
    qty: number,
    price: number,
    side: "long" | "short",
    mmRate: number
  ) => {
    if (mode === "real") {
      handlePlaceRealOrder(symbol, qty, side);
      return;
    }
    const cost = qty * price;
    if (cash < cost && side === "long") {
      alert("Insufficient buying power (cash buffer deficit) to place this simulated trade.");
      return;
    }

    // Safety checks before mock placing
    const sizeCheck = cost <= (maxPositionSizePct * equity / 100);
    if (!sizeCheck) {
      addRiskLog(symbol, "MANUAL_TRADE_REFUSED", false, `Order cost exceeds maximum allocation limit constraint (${maxPositionSizePct}%)`);
      alert(`Manual trade rejected: Position value is ${((cost / equity) * 100).toFixed(1)}% of your equity. Limit is ${maxPositionSizePct}%.`);
      return;
    }

    setPositions((prev) => {
      const existingIdx = prev.findIndex((p) => p.symbol === symbol && p.side === side);
      let updated = [...prev];

      if (existingIdx > -1) {
        const item = prev[existingIdx];
        const newQty = item.qty + qty;
        const newMarketValue = newQty * price;
        const newPL = (price - item.avg_entry_price) * newQty * (side === "long" ? 1 : -1);

        updated[existingIdx] = {
          ...item,
          qty: newQty,
          current_price: price,
          market_value: newMarketValue,
          unrealized_pl: newPL,
          unrealized_plpc: newPL / (item.avg_entry_price * newQty),
        };
      } else {
        updated.push({
          symbol,
          qty,
          avg_entry_price: price,
          current_price: price,
          market_value: cost,
          unrealized_pl: 0,
          unrealized_plpc: 0,
          side,
          maintenance_margin_rate: mmRate,
          realized_pnl: 0,
        });
      }

      if (side === "long") {
        setCash((c) => c - cost);
      } else {
        setCash((c) => c + cost);
      }

      // Record Order Logs
      const orderId = `man-${Date.now()}-${symbol}`;
      setOrders((o) => [
        {
          id: orderId,
          symbol,
          side: side === "long" ? "BUY" : "SELL",
          qty,
          price,
          status: "FILLED",
          submittedAt: new Date().toLocaleTimeString(),
          strategyTag: "MANUAL_TERMINAL",
          type: "MARKET",
        },
        ...o,
      ]);

      setRecentFills((f) => [
        {
          id: `fill-man-${Date.now()}-${symbol}`,
          symbol,
          side: side === "long" ? "BUY" : "SELL",
          qty,
          price,
          pnlImpact: 0,
          filledAt: new Date().toLocaleTimeString(),
        },
        ...f,
      ]);

      addRiskLog(symbol, "MANUAL_BUY", true, `Acquired ${qty} shs manually at $${price.toFixed(2)}. Total value: $${cost.toFixed(2)}.`);
      setTimeout(() => recalculateMetrics(updated), 50);
      return updated;
    });
  };

  const handleRemovePosition = (symbol: string) => {
    const item = positions.find((p) => p.symbol === symbol);
    if (!item) return;

    setPositions((prev) => {
      const filtered = prev.filter((p) => p.symbol !== symbol);
      if (item.side === "long") {
        setCash((c) => c + item.market_value);
      } else {
        setCash((c) => c - item.market_value);
      }

      setTotalRealizedPnl((prevPnl) => prevPnl + item.unrealized_pl);

      setOrders((o) => [
        {
          id: `man-exit-${Date.now()}-${symbol}`,
          symbol,
          side: "SELL",
          qty: item.qty,
          price: item.current_price,
          status: "FILLED",
          submittedAt: new Date().toLocaleTimeString(),
          strategyTag: "MANUAL_TERMINAL",
          type: "MARKET",
        },
        ...o,
      ]);

      setRecentFills((f) => [
        {
          id: `fill-exit-${Date.now()}-${symbol}`,
          symbol,
          side: "SELL",
          qty: item.qty,
          price: item.current_price,
          pnlImpact: item.unrealized_pl,
          filledAt: new Date().toLocaleTimeString(),
        },
        ...f,
      ]);

      addRiskLog(symbol, "MANUAL_CLOSE", true, `Liquidated holdings of ${symbol}. Realized P&L: $${item.unrealized_pl.toFixed(2)}`);
      setTimeout(() => recalculateMetrics(filtered), 50);
      return filtered;
    });
  };

  const handleSimulateMarketDrop = (pct: number) => {
    setPositions((prev) => {
      const crashed = prev.map((pos) => {
        const crashFactor = pos.side === "long" ? (1 - pct) : (1 + pct);
        const newPrice = pos.current_price * crashFactor;
        const newMarketValue = pos.qty * newPrice;
        const purchaseCost = pos.qty * pos.avg_entry_price;
        const freshPL = pos.side === "long"
          ? (newMarketValue - purchaseCost)
          : (purchaseCost - newMarketValue);

        return {
          ...pos,
          current_price: newPrice,
          market_value: newMarketValue,
          unrealized_pl: freshPL,
          unrealized_plpc: purchaseCost > 0 ? (freshPL / purchaseCost) : 0,
        };
      });

      addRiskLog("SYS", "CRASH_TRIGGERED", false, `Simulated external drop of ${(pct * 100).toFixed(0)}% across holdings.`);
      setTimeout(() => recalculateMetrics(crashed), 50);
      return crashed;
    });
  };

  const handleResetSimulation = () => {
    setCash(44775.0);
    setTotalRealizedPnl(1250.0);
    const defaults: Position[] = [
      {
        symbol: "AAPL",
        qty: 150,
        avg_entry_price: 172.5,
        current_price: 175.0,
        market_value: 26250,
        unrealized_pl: 375,
        unrealized_plpc: 0.0145,
        side: "long",
        maintenance_margin_rate: 0.25,
        realized_pnl: 0,
      },
      {
        symbol: "NVDA",
        qty: 45,
        avg_entry_price: 800.0,
        current_price: 850.0,
        market_value: 38250,
        unrealized_pl: 2250,
        unrealized_plpc: 0.0625,
        side: "long",
        maintenance_margin_rate: 0.40,
        realized_pnl: 0,
      },
      {
        symbol: "TSLA",
        qty: 60,
        avg_entry_price: 210.0,
        current_price: 195.0,
        market_value: 11700,
        unrealized_pl: -900,
        unrealized_plpc: -0.0714,
        side: "long",
        maintenance_margin_rate: 0.35,
        realized_pnl: 0,
      },
    ];
    setPositions(defaults);
    setOrders([
      {
        id: "ord-initial-1",
        symbol: "NVDA",
        side: "BUY",
        qty: 45,
        price: 800.0,
        status: "FILLED",
        submittedAt: "09:32:15",
        strategyTag: "MOMENTUM_TRADER_V4",
        type: "MARKET",
      },
      {
        id: "ord-initial-2",
        symbol: "MSFT",
        side: "SELL",
        qty: 40,
        price: 410.0,
        status: "FILLED",
        submittedAt: "10:14:50",
        strategyTag: "MOMENTUM_TRADER_V4",
        type: "MARKET",
      }
    ]);
    setRecentFills([
      {
        id: "fill-initial-1",
        symbol: "NVDA",
        side: "BUY",
        qty: 45,
        price: 800.0,
        pnlImpact: 0,
        filledAt: "09:32:15",
      },
      {
        id: "fill-initial-2",
        symbol: "MSFT",
        side: "SELL",
        qty: 40,
        price: 418.5,
        pnlImpact: 340.0,
        filledAt: "10:14:50",
      }
    ]);
    addRiskLog("SYS", "SIMULATION_RESET", true, "Cleared transaction database and reset sandbox matrices to default state.");
    setTimeout(() => recalculateMetrics(defaults), 50);
  };

  const handleLiquidateAll = () => {
    if (positions.length === 0) {
      alert("No active positions to liquidate.");
      return;
    }

    let liquidationSalesTotal = 0;
    let realizedPnlDelta = 0;
    const nextRecent = [...recentFills];
    const nextOrders = [...orders];

    positions.forEach((pos) => {
      liquidationSalesTotal += pos.market_value;
      realizedPnlDelta += pos.unrealized_pl;

      nextOrders.unshift({
        id: `liq-${Date.now()}-${pos.symbol}`,
        symbol: pos.symbol,
        side: pos.side === "long" ? "SELL" : "BUY",
        qty: pos.qty,
        price: pos.current_price,
        status: "FILLED",
        submittedAt: new Date().toLocaleTimeString(),
        strategyTag: "MANUAL_LIQUIDATE",
        type: "MARKET",
      });

      nextRecent.unshift({
        id: `liq-fill-${Date.now()}-${pos.symbol}`,
        symbol: pos.symbol,
        side: pos.side === "long" ? "SELL" : "BUY",
        qty: pos.qty,
        price: pos.current_price,
        pnlImpact: pos.unrealized_pl,
        filledAt: new Date().toLocaleTimeString(),
      });
    });

    let nextCash = cash;
    positions.forEach((pos) => {
      if (pos.side === "long") {
        nextCash += pos.market_value;
      } else {
        nextCash -= pos.market_value;
      }
    });

    setCash(nextCash);
    setTotalRealizedPnl((prev) => prev + realizedPnlDelta);
    setOrders(nextOrders);
    setRecentFills(nextRecent);
    setPositions([]);
    addRiskLog("SYS", "LIQUIDATE_ALL", true, "Initiated emergency manual liquidation of all asset holdings.");
    setTimeout(() => recalculateMetrics([]), 50);
  };

  const handleResetPaperSettings = () => {
    setCash(44775.0);
    setTotalRealizedPnl(1250.0);
    setWarningThreshold(25);
    setCriticalThreshold(80);
    setMaxCapitalPerTradePct(15);
    setStopLossPct(3.0);
    setTakeProfitPct(6.0);
    setMaxOpenPositions(5);
    setStrategyEnabled(true);
    setAutoTradingActive(false);
    setAutoTradingStatus("PAUSED");

    const defaults: Position[] = [
      {
        symbol: "AAPL",
        qty: 150,
        avg_entry_price: 172.5,
        current_price: 175.0,
        market_value: 26250,
        unrealized_pl: 375,
        unrealized_plpc: 0.0145,
        side: "long",
        maintenance_margin_rate: 0.25,
        realized_pnl: 0,
      },
      {
        symbol: "NVDA",
        qty: 45,
        avg_entry_price: 800.0,
        current_price: 850.0,
        market_value: 38250,
        unrealized_pl: 2250,
        unrealized_plpc: 0.0625,
        side: "long",
        maintenance_margin_rate: 0.40,
        realized_pnl: 0,
      },
      {
        symbol: "TSLA",
        qty: 60,
        avg_entry_price: 210.0,
        current_price: 195.0,
        market_value: 11700,
        unrealized_pl: -900,
        unrealized_plpc: -0.0714,
        side: "long",
        maintenance_margin_rate: 0.35,
        realized_pnl: 0,
      },
    ];
    setPositions(defaults);
    setOrders([
      {
        id: "ord-initial-1",
        symbol: "NVDA",
        side: "BUY",
        qty: 45,
        price: 800.0,
        status: "FILLED",
        submittedAt: "09:32:15",
        strategyTag: "MOMENTUM_TRADER_V4",
        type: "MARKET",
      },
      {
        id: "ord-initial-2",
        symbol: "MSFT",
        side: "SELL",
        qty: 40,
        price: 410.0,
        status: "FILLED",
        submittedAt: "10:14:50",
        strategyTag: "MOMENTUM_TRADER_V4",
        type: "MARKET",
      }
    ]);
    setRecentFills([
      {
        id: "fill-initial-1",
        symbol: "NVDA",
        side: "BUY",
        qty: 45,
        price: 800.0,
        pnlImpact: 0,
        filledAt: "09:32:15",
      },
      {
        id: "fill-initial-2",
        symbol: "MSFT",
        side: "SELL",
        qty: 40,
        price: 418.5,
        pnlImpact: 340.0,
        filledAt: "10:14:50",
      }
    ]);

    addRiskLog("SYS", "PAPER_SETTINGS_RESET", true, "All paper accounts, risk limits, and simulation variables have been reset to factory defaults.");
    setTimeout(() => recalculateMetrics(defaults), 50);
  };

  const marginUtilizationRatio = equity > 0 ? (maintenanceMargin / equity) * 100 : 0;
  const cushionAmount = equity - maintenanceMargin;
  const cushionPct = equity > 0 ? (cushionAmount / equity) * 100 : 0;

  // Track Floating margins alerts
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    const cooldownPeriod = 30 * 1000;

    if (marginUtilizationRatio >= criticalThreshold) {
      const now = Date.now();
      if (!cooldownRef.current["critical"] || now - cooldownRef.current["critical"] > cooldownPeriod) {
        const freshAlert: AlertLogItem = {
          id: `crit-${now}`,
          timestamp,
          title: "🚨 CRITICAL LIQUIDATION PRE-EMPTIVE THREAT",
          message: `Margin utilization is at high-danger level ${marginUtilizationRatio.toFixed(1)}%! Safety cushion remaining: $${cushionAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${cushionPct.toFixed(1)}%). Consider closing positions immediately.`,
          type: "critical",
        };
        setAlerts((prev) => [freshAlert, ...prev].slice(0, 50));
        cooldownRef.current["critical"] = now;
      }
    } else if (marginUtilizationRatio >= warningThreshold) {
      const now = Date.now();
      if (!cooldownRef.current["warning"] || now - cooldownRef.current["warning"] > cooldownPeriod) {
        const freshAlert: AlertLogItem = {
          id: `warn-${now}`,
          timestamp,
          title: "⚠️ MARGIN UTILIZATION EXCEEDS SAFETY BOUNDS",
          message: `Portfolio margin usage is at ${marginUtilizationRatio.toFixed(1)}% (Target safeguard limit: < ${warningThreshold}%). Safety cushion: $${cushionAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${cushionPct.toFixed(1)}%).`,
          type: "warning",
        };
        setAlerts((prev) => [freshAlert, ...prev].slice(0, 50));
        cooldownRef.current["warning"] = now;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marginUtilizationRatio, warningThreshold, criticalThreshold, equity, maintenanceMargin]);

  const handleDisconnect = () => {
    setIsConnected(false);
    setMode("mock");
  };

  // Capital calculations
  const totalInvestedCapital = positions.reduce((sum, p) => sum + (p.qty * p.avg_entry_price), 0);
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealized_pl, 0);
  const totalPnl = totalRealizedPnl + totalUnrealizedPnl;
  const totalPnlPct = (totalPnl / startOfDayEquity) * 100;
  const currentDrawdownVal = Math.max(0, startOfDayEquity - equity);
  const currentDrawdownPct = startOfDayEquity > 0 ? (currentDrawdownVal / startOfDayEquity) * 100 : 0;

  return (
    <div id="page-wrapper" className="min-h-screen bg-brand-bg font-sans text-gray-300 flex flex-col selection:bg-brand-green/30 selection:text-brand-green">
      
      {/* Upper WARNING Status banner if limits breached */}
      {marginUtilizationRatio >= criticalThreshold && (
        <div className="bg-brand-red/15 border-b border-brand-red/35 px-4 py-2 text-center text-brand-red text-xs font-semibold flex items-center justify-center gap-2 animate-pulse" id="global-danger-bar">
          <AlertTriangle className="w-4 h-4 text-brand-red" />
          <span>PORTFOLIO LIQUID RISK REACHED: Margin Utilization is currently {marginUtilizationRatio.toFixed(1)}%. Account safety cushion has fallen below critical boundaries!</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-brand-border bg-brand-bg/85 backdrop-blur px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-brand-green shadow-[0_0_8px_#2ecc71] animate-pulse"></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
              Alpaca <span className="text-gray-500 font-light">Automated Trading Console</span>
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5 font-mono">FRAMEWORK: MOMENTUM SYSTEM ENGINE V4</p>
          </div>
        </div>

        {/* Credentials / Sandbox State buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-brand-card px-3 py-1.5 rounded-lg border border-brand-border text-xs text-[#ff9f43] font-bold font-mono uppercase tracking-wider items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f43] animate-ping" />
            Alpaca Real Integration Active
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={mode === "real" ? fetchLiveData : () => recalculateMetrics(positions)}
              disabled={isRefreshing || (mode === "real" && (!apiKey || !apiSecret))}
              className="p-2 bg-brand-card border border-brand-border hover:bg-brand-bg text-gray-400 hover:text-gray-200 disabled:opacity-40 rounded-lg transition cursor-pointer"
              title="Manual Fetch Limits"
              id="manual-refresh-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-brand-green" : ""}`} />
            </button>

            <div className="text-right text-[11px] font-mono">
              <div className="text-gray-500 uppercase">SYS API STATUS</div>
              <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                <div className={`w-2 h-2 rounded-full ${mode === "mock" ? "bg-brand-yellow shadow-[0_0_6px_#f1c40f]" : isConnected ? "bg-brand-green shadow-[0_0_6px_#2ecc71]" : "bg-brand-red animate-pulse shadow-[0_0_6px_#e74c3c]"}`} />
                <span className={mode === "mock" ? "text-brand-yellow font-bold text-[10px]" : isConnected ? "text-brand-green font-bold text-[10px]" : "text-brand-red font-bold text-[10px]"}>
                  {mode === "mock" ? "SIMULATED_SANDBOX" : isConnected ? "LIVE_ALPACA_TRADING" : "KEYS_DISCONNECTED"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TOP COMPREHENSIVE KPI BAND STRIP */}
      <section className="bg-[#0b0c10] border-b border-brand-border p-4 md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch justify-between gap-6">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            
            {/* Capital Deployed */}
            <div className="bg-brand-card border border-brand-border rounded-lg p-3.5 text-left flex flex-col justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Capital Deployed</span>
              <span className="text-sm font-bold font-mono text-white leading-tight">
                ${totalInvestedCapital?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-gray-500 mt-1 block">Active Cost Basis</span>
            </div>

            {/* Cash Available */}
            <div className="bg-brand-card border border-brand-border rounded-lg p-3.5 text-left flex flex-col justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Cash Available</span>
              <span className="text-sm font-bold font-mono text-brand-green leading-tight">
                ${cash?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-gray-500 mt-1 block">Liquidity Reserve</span>
            </div>

            {/* Net Liquidation Value */}
            <div className="bg-brand-card border border-brand-border rounded-lg p-3.5 text-left flex flex-col justify-between ring-1 ring-brand-green/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Net Liquidation Value</span>
              <span className="text-sm font-bold font-mono text-white leading-tight">
                ${equity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-brand-green font-bold uppercase mt-1 flex items-center gap-0.5">
                <Target className="w-2.5 h-2.5" /> Live Net Worth
              </span>
            </div>

            {/* Realized P&L */}
            <div className="bg-brand-card border border-brand-border rounded-lg p-3.5 text-left flex flex-col justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Realized P&L Today</span>
              <span className={`text-sm font-bold font-mono leading-tight ${totalRealizedPnl >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                {totalRealizedPnl >= 0 ? "+" : ""}${totalRealizedPnl?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-gray-500 mt-1 block">Completed Trades</span>
            </div>

            {/* Unrealized P&L */}
            <div className="bg-brand-card border border-brand-border rounded-lg p-3.5 text-left flex flex-col justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Unrealized P&L</span>
              <span className={`text-sm font-bold font-mono leading-tight ${totalUnrealizedPnl >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                {totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-gray-500 mt-1 block">Floating Positions</span>
            </div>

            {/* Total P&L Pct */}
            <div className="bg-brand-card border border-brand-border rounded-lg p-3.5 text-left flex flex-col justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Total Performance %</span>
              <span className={`text-sm font-bold font-mono leading-tight ${totalPnl >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                {totalPnl >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
              </span>
              <span className="text-[9px] text-gray-500 mt-1 block">Relative trading profit</span>
            </div>

          </div>

          {/* ENGINE CONTROLS BOX MODULE */}
          <div className="bg-[#121319] border border-brand-border rounded-lg p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-5 shrink-0 xl:w-[410px]">
            <div className="text-left">
              <span className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">AUTO-TRADING CONTROL</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${autoTradingStatus === "RUNNING" ? "bg-brand-green shadow-[0_0_8px_#2ecc71] animate-pulse" : autoTradingStatus === "PAUSED" ? "bg-brand-yellow animate-bounce" : "bg-brand-red"}`} />
                <span className={`text-xs font-black font-mono tracking-wider ${autoTradingStatus === "RUNNING" ? "text-brand-green" : autoTradingStatus === "PAUSED" ? "text-brand-yellow" : "text-brand-red"}`}>
                  ENGINE {autoTradingStatus}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleToggleAutoTrading}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  autoTradingActive
                    ? "bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow border-brand-yellow/30"
                    : "bg-brand-green text-black hover:bg-brand-green/95 font-black border-transparent"
                }`}
              >
                {autoTradingActive ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" /> PAUSE AUTO
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> AUTO-TRADE ON
                  </>
                )}
              </button>

              <button
                onClick={handleKillSwitch}
                className="px-4 py-2.5 bg-brand-red text-white hover:bg-brand-red/90 text-xs font-black rounded-lg transition border border-transparent shadow-lg shadow-brand-red/10 cursor-pointer flex items-center gap-1.5"
              >
                <Skull className="w-3.5 h-3.5" /> KILL SWITCH
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Single-Screen Content Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative" id="layout-grid">
        
        {/* LEFT / TOP COLUMN: Overall Gauges and Integration metrics */}
        <section className="lg:col-span-4 flex flex-col gap-6" id="left-sidebar-metrics">
          
          {/* Sentry API access or Paper badge warning warnings */}
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 text-left">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3.5 flex items-center justify-between">
              <span>{mode === "mock" ? "SYSTEM PAPER trading sandbox" : "ALPACA LIVE API integration"}</span>
              <span className={`w-2 h-2 rounded-full ${mode === "real" && isConnected ? "bg-[#ff9f43] shadow-[0_0_6px_#ff9f43]" : "bg-brand-yellow"}`} />
            </h3>

            {mode === "mock" ? (
              <div className="space-y-3.5">
                <div className="p-3.5 bg-brand-yellow/5 border border-brand-yellow/20 rounded-lg text-xs leading-relaxed font-sans text-gray-300">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-brand-yellow">
                    <Info className="w-3.5 h-3.5" />
                    SIMULATED ENVIRONMENT
                  </div>
                  Continuous loop auto-trading is active using mock random-walk generators. Switch to LIVE mode to plug Alpaca API credentials.
                </div>
                <button
                  onClick={() => setMode("real")}
                  className="w-full text-center py-2 bg-brand-bg hover:bg-brand-card text-gray-300 text-xs font-semibold rounded-lg transition border border-brand-border cursor-pointer font-sans"
                  id="switch-keys-form"
                >
                  Configure Alpaca Live keys
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {errorText && (
                  <div className="p-3 bg-brand-red/10 border border-brand-red/30 rounded-lg flex items-start gap-2.5">
                    <AlertTriangle className="text-brand-red w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="text-xs text-brand-red leading-snug font-mono">{errorText}</span>
                  </div>
                )}

                <div className="p-3 bg-[#e67e22]/10 border border-[#e67e22]/30 rounded-lg text-xs leading-relaxed text-[#e67e22] font-semibold flex flex-col gap-1.5 font-sans mb-3 text-left">
                  <span>⚠️ WARNING: live trading operations involve severe capital hazards.</span>
                  <span>Ensure your API boundaries limits and automated algorithms are fully auditioned in paper simulation mode before scaling configurations.</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 font-mono">API Key ID</label>
                    <input
                      type="text"
                      className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-white font-mono placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green"
                      placeholder="APCA-API-KEY-ID"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 flex justify-between items-center font-mono">
                      <span>Secret Key</span>
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-gray-500 hover:text-gray-300 flex items-center gap-0.5 lowercase font-normal cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showSecret ? "hide" : "show"}
                      </button>
                    </label>
                    <input
                      type={showSecret ? "text" : "password"}
                      className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-white font-mono placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green"
                      placeholder="APCA-API-SECRET-KEY"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 font-mono">Broker endpoint</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setIsPaper(true)}
                        className={`py-1.5 rounded-lg border text-[10px] font-bold font-mono transition cursor-pointer ${
                          isPaper
                            ? "bg-brand-bg border-brand-border text-brand-yellow"
                            : "bg-brand-card border-brand-border text-gray-500"
                        }`}
                      >
                        PAPER APCA
                      </button>
                      <button
                        onClick={() => setIsPaper(false)}
                        className={`py-1.5 rounded-lg border text-[10px] font-bold font-mono transition cursor-pointer ${
                          !isPaper
                            ? "bg-brand-bg border-brand-border text-brand-green"
                            : "bg-brand-card border-brand-border text-gray-500"
                        }`}
                      >
                        LIVE ALPACA
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={fetchLiveData}
                    disabled={isRefreshing || !apiKey || !apiSecret}
                    className="flex-1 bg-[#ff9f43] hover:bg-[#ff9f43]/95 disabled:bg-brand-card text-black disabled:text-gray-600 font-bold text-xs py-2 rounded-lg transition duration-200 cursor-pointer text-center"
                    id="connect-alpaca-btn"
                  >
                    {isRefreshing ? "Retesting API..." : "Verify & Inject Keys"}
                  </button>
                  {isConnected && (
                    <button
                      onClick={handleDisconnect}
                      className="p-2 border border-brand-red bg-brand-red/10 hover:bg-brand-red/20 text-brand-red text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Close API
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Margin Utilization Radial Gauge */}
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 text-center relative overflow-hidden flex flex-col justify-between" id="utilization-gauge-card">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left font-mono">Consolidated Margin usage</div>
            
            <div className="my-6 relative flex flex-col items-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#14151a"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f1c40f"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - warningThreshold / 100)}`}
                    className="opacity-20"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={
                      marginUtilizationRatio >= criticalThreshold
                        ? "#e74c3c"
                        : marginUtilizationRatio >= warningThreshold
                        ? "#f1c40f"
                        : "#2ecc71"
                    }
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(100, marginUtilizationRatio) / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-white font-mono leading-none">
                    {marginUtilizationRatio.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-gray-500 mt-1.5 font-bold font-mono tracking-wider">
                    {marginUtilizationRatio >= criticalThreshold
                      ? "CRITICAL"
                      : marginUtilizationRatio >= warningThreshold
                      ? "WARNING"
                      : "SECURE"}
                  </span>
                </div>
              </div>

              {marginUtilizationRatio >= warningThreshold && (
                <div className="mt-3 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-brand-yellow animate-pulse" />
                  <span className="text-[10px] text-brand-yellow font-bold uppercase tracking-wide font-mono">
                    {marginUtilizationRatio >= criticalThreshold ? "Near Forced Liquidation" : "Safe buffers compressed"}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-brand-border flex justify-between text-xs text-gray-400 font-mono">
              <div>
                <span className="text-[9px] text-gray-500 uppercase block">Total MM</span>
                <span className="font-bold text-gray-300">${maintenanceMargin?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] text-gray-500 uppercase block">Cushion %</span>
                <span className={`font-bold ${cushionPct < 25 ? "text-brand-red animate-pulse" : "text-brand-green"}`}>
                  {cushionPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-500 uppercase block">Total Equity</span>
                <span className="font-bold text-gray-300">${equity?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Performance charts, Control panels & Main switchboard */}
        <section className="lg:col-span-8 flex flex-col gap-6" id="right-center-panel">
          
          {/* Dual Charts block displaying Cushion flow AND P&L Equity curve over time (Bento Panel) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="bento-charts-block">
            
            {/* Cushion Flow Chart */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 text-left">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <Activity className="w-3.5 h-3.5 text-brand-green" />
                    Margin cushion flow
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Sentry margin room tracker</p>
                </div>
                <div className="flex gap-3 font-mono text-[9px]">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-brand-green/20 border border-brand-green rounded-full" />
                    <span className="text-gray-400">Net Cushion</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-brand-red/20 border border-brand-red rounded-full" />
                    <span className="text-gray-400">Maint. Margin</span>
                  </div>
                </div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cushGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2ecc71" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="maintGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e74c3c" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#e74c3c" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#475569" fontSize={8} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={8} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111216", borderColor: "#1f2937", color: "#F1F5F9", fontSize: 10 }}
                      formatter={(v: any) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`]}
                    />
                    <Area type="monotone" dataKey="cushion" stroke="#2ecc71" strokeWidth={1.5} fillOpacity={1} fill="url(#cushGrad)" />
                    <Area type="monotone" dataKey="maintenanceMargin" stroke="#e74c3c" strokeWidth={1} fillOpacity={1} fill="url(#maintGrad)" />
                    <ReferenceLine y={equity * (warningThreshold / 100)} stroke="#f1c40f" strokeDasharray="3 3" label={{ value: "Warning limit", position: "top", fill: "#f1c40f", fontSize: 8 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* P&L Terminal Performance Chart (Daily Equity Curve & Realized P&L Tracker) */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 text-left">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <TrendingUp className="w-3.5 h-3.5 text-[#2ecc71]" />
                    P&L History Performance
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Real-time equity yield vs realized results</p>
                </div>
                <div className="flex gap-3 font-mono text-[9px]">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-brand-green border border-brand-green rounded-full" />
                    <span className="text-gray-400">Equity Curve</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#ff9f43] border border-[#ff9f43] rounded-full" />
                    <span className="text-gray-400">Realized P&L</span>
                  </div>
                </div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyPnlHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="time" stroke="#475569" fontSize={8} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#2ecc71" fontSize={8} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#ff9f43" fontSize={8} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111216", borderColor: "#1f2937", color: "#F1F5F9", fontSize: 10 }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="equity" stroke="#2ecc71" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="realizedPnl" stroke="#ff9f43" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* LOWER SWITCHBOARD SWITCHER BLOCK */}
          <div className="flex flex-col flex-1">
            <div className="flex border-b border-brand-border text-xs font-sans mb-5 font-medium gap-1.5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab("positions")}
                className={`pb-2.5 px-3 border-b-2 text-left shrink-0 transition-all cursor-pointer ${
                  activeTab === "positions"
                    ? "border-brand-green text-brand-green font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                Positions & Simulator
              </button>
              
              <button
                onClick={() => setActiveTab("executions")}
                className={`pb-2.5 px-3 border-b-2 text-left shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "executions"
                    ? "border-brand-green text-brand-green font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                Orders & Executions
                <span className="bg-brand-border text-gray-300 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                  {orders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("analysis")}
                className={`pb-2.5 px-3 border-b-2 text-left shrink-0 transition-all cursor-pointer ${
                  activeTab === "analysis"
                    ? "border-brand-green text-brand-green font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                AI Risk Audit
              </button>
              <button
                onClick={() => setActiveTab("python")}
                className={`pb-2.5 px-3 border-b-2 text-left shrink-0 transition-all cursor-pointer ${
                  activeTab === "python"
                    ? "border-brand-green text-brand-green font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                Python Code Exporter
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`pb-2.5 px-3 border-b-2 text-left shrink-0 transition-all cursor-pointer ${
                  activeTab === "settings"
                    ? "border-brand-green text-brand-green font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                Sentry Limits
              </button>
            </div>

            {/* TAB SCREENS */}
            <div className="flex-1 min-h-[400px]">
              {activeTab === "positions" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left block - Positions Table */}
                  <div className="lg:col-span-8 flex flex-col gap-6">
                    <PositionsTable
                      positions={positions}
                      isMock={mode === "mock"}
                      onAddPosition={handleAddMockPosition}
                      onRemovePosition={handleRemovePosition}
                      onSimulateMarketDrop={handleSimulateMarketDrop}
                      onResetSimulation={handleResetSimulation}
                      onLiquidateAll={handleLiquidateAll}
                      onResetPaperSettings={handleResetPaperSettings}
                      isConnected={isConnected}
                      isPlacingOrder={isPlacingOrder}
                      onPlaceLiveOrder={handlePlaceLiveOrder}
                      isPaper={isPaper}
                    />
                  </div>

                  {/* Right side - Trading Control sidebar (Trade settings & Watchlist) */}
                  <div className="lg:col-span-4 flex flex-col gap-6">
                    
                    {/* Strategy Control Panel */}
                    <div className="bg-brand-card border border-brand-border rounded-xl p-5 text-left">
                      <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-1.5 font-mono">
                        <Sliders className="w-3.5 h-3.5 text-brand-green" />
                        Strategy control
                      </h4>
                      <p className="text-[10px] text-gray-500 mb-4 leading-relaxed font-sans">
                        Configure rulesets parameters for algorithmic trades logic execution. High constraints lower concentration risks.
                      </p>

                      <div className="space-y-4 text-xs font-sans">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 font-mono">CORE ALGORITHM</label>
                          <select
                            value={selectedStrategy}
                            onChange={(e) => setSelectedStrategy(e.target.value)}
                            className="w-full bg-brand-bg border border-brand-border rounded-lg text-white font-bold p-2 focus:outline-none"
                          >
                            <option value="MOMENTUM_TRADER_V4">MOMENTUM_TRADER_V4 (SMA cross)</option>
                            <option value="MEAN_REVERSION_V1" disabled>MEAN_REVERSION_V1 (RSI indicators)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 font-mono">Watchlist targets</label>
                          <div className="flex flex-wrap gap-1.5 p-1.5 bg-brand-bg border border-brand-border rounded-lg">
                            {watchlist.map((sym) => (
                              <span
                                key={sym}
                                className="px-2 py-0.5 bg-brand-border rounded text-[10px] font-mono font-bold text-gray-300 flex items-center gap-1"
                              >
                                {sym}
                                <span className="text-[8px] text-brand-green">
                                  ${tickerPrices[sym]?.toFixed(1)}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 font-mono">Capital allocation %</label>
                            <input
                              type="number"
                              value={maxCapitalPerTradePct}
                              onChange={(e) => setMaxCapitalPerTradePct(Math.max(1, Number(e.target.value)))}
                              className="w-full bg-brand-bg border border-brand-border rounded-lg text-white font-mono p-2 text-center"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 font-mono">Max hold trades</label>
                            <input
                              type="number"
                              value={maxOpenPositions}
                              onChange={(e) => setMaxOpenPositions(Math.max(1, Number(e.target.value)))}
                              className="w-full bg-brand-bg border border-brand-border rounded-lg text-white font-mono p-2 text-center"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 text-red-400 font-mono">Stop-loss %</label>
                            <input
                              type="number"
                              step="0.5"
                              value={stopLossPct}
                              onChange={(e) => setStopLossPct(Math.max(0.1, Number(e.target.value)))}
                              className="w-full bg-brand-bg border border-brand-border rounded-lg text-white font-mono p-2 text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 text-green-400 font-mono">Take profit %</label>
                            <input
                              type="number"
                              step="0.5"
                              value={takeProfitPct}
                              onChange={(e) => setTakeProfitPct(Math.max(0.1, Number(e.target.value)))}
                              className="w-full bg-brand-bg border border-brand-border rounded-lg text-white font-mono p-2 text-center"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-brand-bg border border-brand-border rounded-lg mt-2">
                          <span className="text-[11px] font-bold text-gray-400">Enable Strategies Module</span>
                          <input
                            type="checkbox"
                            checked={strategyEnabled}
                            onChange={(e) => {
                              setStrategyEnabled(e.target.checked);
                              addRiskLog("SYS", "STRAT_TOGGLE", e.target.checked, `Strategies signals processing set to ${e.target.checked}`);
                            }}
                            className="accent-brand-green w-4 h-4 cursor-pointer"
                          />
                        </div>

                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ORDERS & EXECUTIONS TAB SCREEN */}
              {activeTab === "executions" && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-fadeIn">
                  
                  {/* Left: Open Orders list */}
                  <div className="xl:col-span-7 bg-brand-card border border-brand-border rounded-xl p-5 text-left">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-mono">
                      <Terminal className="text-brand-green w-4 h-4" />
                      Algorithmic terminal open orders
                    </h3>
                    
                    <div className="overflow-x-auto">
                      {orders.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-xs">No active orders queued.</div>
                      ) : (
                        <table className="w-full text-xs font-sans text-left">
                          <thead>
                            <tr className="border-b border-brand-border text-gray-500 font-mono">
                              <th className="pb-2.5">Symbol</th>
                              <th className="pb-2.5">Side</th>
                              <th className="pb-2.5 text-right">Qty</th>
                              <th className="pb-2.5 text-right">Execution Price</th>
                              <th className="pb-2.5">Status</th>
                              <th className="pb-2.5">Time</th>
                              <th className="pb-2.5">Strategy</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-border/45">
                            {orders.map((ord) => (
                              <tr key={ord.id} className="hover:bg-brand-bg/40 transition">
                                <td className="py-2.5 font-bold text-white">{ord.symbol}</td>
                                <td className="py-2.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${ord.side === "BUY" ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red"}`}>
                                    {ord.side}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-mono text-gray-300">{ord.qty}</td>
                                <td className="py-2.5 text-right font-mono text-gray-300">${ord.price?.toFixed(2)}</td>
                                <td className="py-2.5 font-mono">
                                  <span className="text-brand-green font-bold text-[10px] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-brand-green rounded-full shadow-[0_0_4px_#2ecc71] animate-pulse" />
                                    FILLED
                                  </span>
                                </td>
                                <td className="py-2.5 font-mono text-gray-500 text-[10px]">{ord.submittedAt}</td>
                                <td className="py-2.5 text-[10px] text-gray-400 font-mono">{ord.strategyTag}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Right: Recent Fill transactions logs */}
                  <div className="xl:col-span-5 bg-brand-card border border-brand-border rounded-xl p-5 text-left">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-mono">
                      <Sliders className="text-brand-yellow w-4 h-4" />
                      Recent fills & realized gains impact
                    </h3>
                    
                    <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                      {recentFills.map((fill) => (
                        <div key={fill.id} className="p-3 bg-[#0c0d11]/80 rounded-lg border border-brand-border flex items-center justify-between">
                          <div className="text-left font-sans">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{fill.symbol}</span>
                              <span className={`text-[8.5px] font-mono px-1 py-0.2 rounded font-bold ${fill.side === "BUY" ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red"}`}>
                                {fill.side === "BUY" ? "BUY_ENTRY" : "SELL_LIQUIDATE"}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono mt-1">
                              Filled {fill.qty} shs @ ${fill.price?.toFixed(2)} | {fill.filledAt}
                            </div>
                          </div>

                          <div className="text-right">
                            {fill.side === "SELL" ? (
                              <div className="font-mono text-xs font-bold text-left">
                                <div className="text-[9px] text-gray-550 uppercase">REALIZED P&L</div>
                                <span className={fill.pnlImpact >= 0 ? "text-brand-green" : "text-brand-red"}>
                                  {fill.pnlImpact >= 0 ? "+" : ""}${fill.pnlImpact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ) : (
                              <div className="text-[9px] text-gray-600 font-mono">RECONCILED</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {activeTab === "analysis" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
                  
                  {/* Left Column: AI Audit */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    <RiskAnalysis
                      accountData={{
                        equity,
                        maintenance_margin: maintenanceMargin,
                        initial_margin: initialMargin,
                        daytrading_buying_power: dayTradingBP,
                        regt_buying_power: regTBP,
                        multiplier,
                        pattern_day_trader: isPdt,
                      }}
                      positionsData={positions}
                    />
                  </div>

                  {/* Right Column: Dynamic Risk Controls widgets & sliders */}
                  <div className="lg:col-span-5 bg-brand-card border border-brand-border rounded-xl p-5 text-left space-y-6">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                        <ShieldCheck className="text-brand-green w-4 h-4" />
                        Interactive Risk Safeguard Controls
                      </h3>
                      <p className="text-[10px] text-gray-500 mt-1">Configure limits parameters, automatic circuit-breakers and logs triggers.</p>
                    </div>

                    {/* Sized Limits settings */}
                    <div className="space-y-4 text-xs font-sans">
                      
                      {/* Daily Loss limit */}
                      <div className="p-3 bg-brand-bg border border-brand-border rounded-lg text-left">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-400">Max daily drawdown limit %</span>
                          <span className="font-mono text-brand-red font-bold">{maxDailyLossPct}%</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="15"
                          step="0.5"
                          value={maxDailyLossPct}
                          onChange={(e) => setMaxDailyLossPct(Number(e.target.value))}
                          className="w-full accent-brand-red h-1.5 rounded-lg cursor-pointer bg-brand-border"
                        />
                        
                        <div className="mt-3.5 pt-2.5 border-t border-brand-border flex items-center justify-between text-[11px]">
                          <span className="text-gray-550 header-title">Current Day Loss Trajectory</span>
                          <span className="font-mono text-gray-400 font-bold">${currentDrawdownVal.toFixed(2)} ({currentDrawdownPct.toFixed(2)}%)</span>
                        </div>
                        <div className="w-full bg-brand-border h-2 rounded mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded transition-all duration-300 ${currentDrawdownPct >= maxDailyLossPct ? "bg-brand-red shadow-[0_0_5px_#e74c3c]" : "bg-gradient-to-r from-brand-green to-brand-yellow"}`}
                            style={{ width: `${Math.min(100, (currentDrawdownPct / maxDailyLossPct) * 100)}%` }}
                          />
                        </div>
                        {currentDrawdownPct >= maxDailyLossPct && (
                          <div className="text-[9px] text-brand-red font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-brand-red animate-pulse" /> Drawdown safety exceeded. Trading frozen.
                          </div>
                        )}
                      </div>

                      {/* Max leverage */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-400">Maximum leverage multiplier limit</span>
                          <span className="font-mono text-brand-yellow font-bold">{maxLeverage}x</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="4"
                          step="0.1"
                          value={maxLeverage}
                          onChange={(e) => setMaxLeverage(Number(e.target.value))}
                          className="w-full accent-brand-yellow h-1.5 rounded-lg cursor-pointer bg-brand-border"
                        />
                      </div>

                      {/* Max position size */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-400">Max size allocation limit per trade</span>
                          <span className="font-mono text-brand-green font-bold">{maxPositionSizePct}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          value={maxPositionSizePct}
                          onChange={(e) => setMaxPositionSizePct(Number(e.target.value))}
                          className="w-full accent-brand-green h-1.5 rounded-lg cursor-pointer bg-brand-border"
                        />
                        <span className="text-[9px] text-gray-500 mt-1 block font-mono">Guideline restricts manual or automated ticket sizing.</span>
                      </div>

                    </div>

                    {/* Risk event Sentry Log */}
                    <div className="pt-4 border-t border-brand-border">
                      <div className="flex items-center justify-between mb-3 font-mono">
                        <span className="text-[10px] font-bold text-gray-550 uppercase tracking-widest">Sentry Live Check log</span>
                        <span className="text-[9px] text-brand-green animate-pulse">● RUNNING LOGS</span>
                      </div>
                      
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {riskCheckLog.map((log) => (
                          <div key={log.id} className="p-2.5 bg-[#0a0b0d]/70 border border-brand-border/60 rounded font-mono text-[10px] flex items-start gap-2 text-left leading-relaxed">
                            <span className={log.passed ? "text-brand-green shrink-0 font-bold" : "text-brand-red shrink-0 font-bold"}>
                              {log.passed ? "[OK]" : "[FAIL]"}
                            </span>
                            <div className="flex-1">
                              <span className="text-gray-550 font-semibold mr-1">[{log.timestamp}]</span>
                              <span className="text-gray-400 mr-1">[{log.symbol}] {log.action}:</span>
                              <span className="text-gray-300">{log.details}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {activeTab === "python" && (
                <div className="animate-fadeIn">
                  <PythonExporter
                    warningThreshold={warningThreshold}
                    criticalThreshold={criticalThreshold}
                    isPaper={isPaper}
                  />
                </div>
              )}

              {activeTab === "settings" && (
                <div className="animate-fadeIn">
                  <AlertSettings
                    warningThreshold={warningThreshold}
                    setWarningThreshold={setWarningThreshold}
                    criticalThreshold={criticalThreshold}
                    setCriticalThreshold={setCriticalThreshold}
                    alerts={alerts}
                    clearAlerts={() => setAlerts([])}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-brand-border bg-[#0a0b0d] px-6 py-4 text-center text-[11px] text-gray-600 flex flex-col sm:flex-row items-center justify-between gap-2.5 font-mono">
        <div className="flex gap-4">
          <span>STRATEGY: MOMENTUM_TRADER_V4</span>
          <span>HEARTBEAT RATE: 5s TICK</span>
          <span>DAILY LOSS MARGINS: {maxDailyLossPct}%</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></div>
          <span className="uppercase tracking-tighter text-gray-400">Terminals limits compliant</span>
        </div>
      </footer>
    </div>
  );
}
