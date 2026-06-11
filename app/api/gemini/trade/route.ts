import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function safeParse(req: Request) {
  try {
    const txt = await req.text();
    if (!txt) return {};
    return JSON.parse(txt);
  } catch (e) {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const body: any = await safeParse(req);
    const apiKey = process.env.GEMINI_API_KEY || body.apiKey;
    const apiSecret = process.env.GEMINI_API_SECRET || body.apiSecret;
    const isLive = body.isLive === true || body.isLive === "true";

    const symbol = (body.symbol || body.ticker || "").toUpperCase();
    const side = (body.side || "BUY").toUpperCase();
    const type = (body.type || "MARKET").toUpperCase();
    const quantity = body.quantity || body.qty || body.amount;

    if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 200 });
    if (!quantity) return NextResponse.json({ error: "Missing quantity" }, { status: 200 });

    if (!isLive) {
      const fake = {
        symbol,
        side,
        type,
        origQty: quantity,
        executedQty: quantity,
        status: "FILLED",
        price: body.price || null,
        id: `sim-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      };
      return NextResponse.json({ order: fake });
    }

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "GEMINI API credentials missing on server." }, { status: 200 });
    }

    // Gemini v1 signed API expects a base64-encoded JSON payload and an HMAC-SHA384 signature
    const payload: any = {
      request: "/v1/order/new",
      nonce: Date.now().toString(),
      symbol: symbol,
      side: side.toLowerCase(),
      "type": type === "MARKET" ? "exchange market" : "exchange limit",
    };

    if (type === "MARKET") {
      // use 'amount' for market orders (base currency amount)
      payload.amount = String(quantity);
    } else {
      payload.price = String(body.price || 0);
      payload.amount = String(quantity);
      payload.options = body.timeInForce || null;
    }

    const payloadStr = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadStr).toString("base64");
    const signature = crypto.createHmac("sha384", apiSecret).update(payloadB64).digest("hex");

    const res = await fetch("https://api.gemini.com/v1/order/new", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": String(payloadB64.length),
        "X-GEMINI-APIKEY": apiKey,
        "X-GEMINI-PAYLOAD": payloadB64,
        "X-GEMINI-SIGNATURE": signature,
      },
      body: payloadB64,
      cache: "no-store",
    });

    const txt = await res.text();
    let data: any = null;
    try { data = JSON.parse(txt); } catch (e) { return NextResponse.json({ error: `Gemini returned non-JSON: ${txt.slice(0,200)}` }, { status: 200 }); }

    if (!res.ok) {
      return NextResponse.json({ error: data?.reason || 'Gemini order rejected', raw: data }, { status: 200 });
    }

    return NextResponse.json({ order: data });
  } catch (err: any) {
    console.error('Gemini trade proxy error', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 200 });
  }
}
