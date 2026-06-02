import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, apiSecret, isPaper } = await req.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Alpaca API Key and Secret are required." },
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

    // Fetch account and positions in parallel
    const [accountRes, positionsRes] = await Promise.all([
      fetch(`${baseUrl}/v2/account`, { headers, method: "GET" }).catch((err) => {
        console.error("Fetch account error:", err);
        return null;
      }),
      fetch(`${baseUrl}/v2/positions`, { headers, method: "GET" }).catch((err) => {
        console.error("Fetch positions error:", err);
        return null;
      }),
    ]);

    if (!accountRes || !positionsRes) {
      return NextResponse.json(
        { error: "Failed to connect to Alpaca API servers." },
        { status: 502 }
      );
    }

    if (accountRes.status === 401 || positionsRes.status === 401) {
      return NextResponse.json(
        { error: "Invalid Alpaca API Key or Secret. Clarify your credentials." },
        { status: 401 }
      );
    }

    if (!accountRes.ok) {
      const errorText = await accountRes.text();
      return NextResponse.json(
        { error: `Alpaca Account Error: ${errorText || accountRes.statusText}` },
        { status: accountRes.status }
      );
    }

    if (!positionsRes.ok) {
      const errorText = await positionsRes.text();
      return NextResponse.json(
        { error: `Alpaca Positions Error: ${errorText || positionsRes.statusText}` },
        { status: positionsRes.status }
      );
    }

    const account = await accountRes.json();
    const positions = await positionsRes.json();

    return NextResponse.json({
      account,
      positions,
    });
  } catch (error: any) {
    console.error("Alpaca API Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while communicating with Alpaca." },
      { status: 500 }
    );
  }
}
