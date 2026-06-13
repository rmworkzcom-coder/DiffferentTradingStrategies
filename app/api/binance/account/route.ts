import { NextResponse } from "next/server";
import { buildBinanceSignedQuery, isBinanceTimestampError } from "../_lib/binanceSignedQuery";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const apiKey =
      process.env.BINANCE_LIVE_API_KEY ||
      process.env.BINANCE_KEY ||
      process.env.EXCH_BINANCE_KEY;
    const apiSecret =
      process.env.BINANCE_LIVE_API_SECRET ||
      process.env.BINANCE_SECRET ||
      process.env.EXCH_BINANCE_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "BINANCE API credentials missing on server." }, { status: 200 });
    }

    let res: Response | null = null;
    let data: any = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const { queryString, signature } = await buildBinanceSignedQuery(apiSecret, {}, { forceTimeSync: attempt > 0 });
      res = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
        method: "GET",
        headers: { "X-MBX-APIKEY": apiKey },
        cache: "no-store",
      });

      const txtAttempt = await res.text();
      try {
        data = JSON.parse(txtAttempt);
      } catch {
        return NextResponse.json({ error: `Binance returned non-JSON: ${txtAttempt.slice(0, 200)}` }, { status: 200 });
      }

      if (res.ok) {
        break;
      }

      if (attempt === 0 && isBinanceTimestampError(data?.msg || txtAttempt)) {
        continue;
      }

      break;
    }

    if (!res) {
      return NextResponse.json({ error: "Binance account query failed before request dispatch." }, { status: 200 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: data?.msg || 'Binance account query rejected', raw: data }, { status: 200 });
    }

    return NextResponse.json({ account: data });
  } catch (err: any) {
    console.error('Binance account proxy error', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 200 });
  }
}
