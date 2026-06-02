import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const { accountData, positionsData } = await req.json();

    if (!accountData) {
      return NextResponse.json(
        { error: "Account data is required for analysis." },
        { status: 400 }
      );
    }

    const systemInstruction = `You are an elite hedge fund risk manager and expert in margin rules and the Alpaca Intraday Margin Framework.
Your goal is to analyze the user's current Alpaca portfolio and margin metrics, assess their risk under the new Intraday Margin Framework parameters (4x leverage limit, 25% margin minimum thresholds, real-time liquidation thresholds), and provide an actionable, highly professional risk audit report.
Provide the output in strict JSON matching the given schema. Maintain a calm, objective, analytical, and highly structured tone. Do not use hyperbolic language.`;

    const promptText = `
Analyze the following account and position metrics:

Account Metrics:
- Total Equity: $${accountData.equity}
- Margin Utilization Ratio (Maintenance Margin / Equity): ${((Number(accountData.maintenance_margin) / Number(accountData.equity)) * 100).toFixed(2)}%
- Maintenance Margin: $${accountData.maintenance_margin}
- Initial Margin Requirement: $${accountData.initial_margin}
- Day Trading Buying Power: $${accountData.daytrading_buying_power}
- Reg T Buying Power: $${accountData.regt_buying_power}
- Outstanding Leverage Multiplier: ${accountData.multiplier}x
- Is Pattern Day Trader (PDT): ${accountData.pattern_day_trader ? "Yes" : "No"}

Positions:
${
  positionsData && positionsData.length > 0
    ? positionsData
        .map(
          (pos: any) =>
            `- Symbol: ${pos.symbol} | Qty: ${pos.qty} | Value: $${pos.market_value} | Avg Price: $${pos.avg_entry_price} | Current Price: $${pos.current_price} | Unrealized P&L: $${pos.unrealized_pl} (${(Number(pos.unrealized_plpc) * 100).toFixed(2)}%)`
        )
        .join("\n")
    : "No open positions. Pure cash buffer."
}

Please calculate and provide:
1. An overall Risk Score from 0 (no risk) to 100 (critical risk of margin call/liquidation).
2. A Risk Level ("Low", "Medium", "High", "Critical").
3. A detailed analysis text addressing portfolio concentration, margin cushion robustness under 4x intraday limit, and if any PDT rules apply.
4. Liquidation stress test scenarios (-10%, -20%, -30% market moves on the positions, how much equity would remain, and if maintenance margin would be breached causing a liquidation).
5. Highly concrete, defensive risk management recommendations to reduce margin exposure.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: {
              type: Type.INTEGER,
              description: "Corporate portfolio risk score from 0 to 100 based on margin leverage and security volatility.",
            },
            riskLevel: {
              type: Type.STRING,
              description: "The level of risk: Low, Medium, High, or Critical.",
            },
            analysisText: {
              type: Type.STRING,
              description: "A professional markdown-compatible paragraph analysis of margin utilization, intraday volatility exposure, concentration, and PDT status.",
            },
            stressTests: {
              type: Type.ARRAY,
              description: "Stress test evaluations under market crash conditions.",
              items: {
                type: Type.OBJECT,
                properties: {
                  scenario: { type: Type.STRING, description: "Scenario description, e.g., '10% Market Drop'" },
                  projectedEquity: { type: Type.NUMBER, description: "Projected portfolio equity after scenario." },
                  marginCallStatus: { type: Type.STRING, description: "Whether a margin call is triggered ('Safe', 'Warning', 'Breached/Liquidated')" },
                  explanation: { type: Type.STRING, description: "Detailed mechanics of how maintenance margin would react." }
                },
                required: ["scenario", "projectedEquity", "marginCallStatus", "explanation"]
              }
            },
            recommendations: {
              type: Type.ARRAY,
              description: "List of actionable recommendations to defend the account.",
              items: {
                type: Type.STRING,
              },
            },
          },
          required: ["riskScore", "riskLevel", "analysisText", "stressTests", "recommendations"],
        },
      },
    });

    const textResult = response.text || "{}";
    return NextResponse.json(JSON.parse(textResult.trim()));
  } catch (error: any) {
    console.error("Gemini Analyze Error:", error);
    return NextResponse.json(
      { error: error?.message || "An error occurred during risk analysis." },
      { status: 500 }
    );
  }
}
