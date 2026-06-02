import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, apiSecret, isPaper, symbol, qty, side, type = "market", timeInForce = "day" } = await req.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Alpaca API Key and Secret are required to execute dynamic trades." },
        { status: 400 }
      );
    }

    if (!symbol || !qty || !side) {
      return NextResponse.json(
        { error: "Symbol, qty, and side are required for order execution." },
        { status: 400 }
      );
    }

    const baseUrl = isPaper
      ? "https://paper-api.alpaca.markets"
      : "https://api.alpaca.markets";

    const headers = {
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": apiSecret,
      "Content-Type": "application/json",
    };

    // Construct Alpaca Order Payload
    const payload = {
      symbol: symbol.toUpperCase(),
      qty: String(qty),
      side: side.toLowerCase(),
      type: type.toLowerCase(),
      time_in_force: timeInForce.toLowerCase(),
    };

    const response = await fetch(`${baseUrl}/v2/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Alpaca execution rejected: ${errorText || response.statusText}` },
        { status: response.status }
      );
    }

    const orderData = await response.json();
    return NextResponse.json(orderData);
  } catch (error: any) {
    console.error("Alpaca Order Proxy Error:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred during execution." },
      { status: 500 }
    );
  }
}
