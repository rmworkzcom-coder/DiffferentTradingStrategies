import crypto from "crypto";

const DEFAULT_RECV_WINDOW = "15000";

let serverTimeOffsetMs = 0;
let serverTimeSyncedAt = 0;

function sign(query: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

export function isBinanceTimestampError(message: string): boolean {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("-1021") ||
    normalized.includes("timestamp for this request is outside of the recvwindow") ||
    normalized.includes("recvwindow")
  );
}

export async function syncBinanceServerTimeOffset(force = false): Promise<number> {
  const now = Date.now();
  if (!force && serverTimeSyncedAt > 0 && now - serverTimeSyncedAt < 60000) {
    return serverTimeOffsetMs;
  }

  const endpoints = [
    "https://fapi.binance.com/fapi/v1/time",
    "https://api.binance.com/api/v3/time",
  ];

  for (const endpoint of endpoints) {
    try {
      const startedAt = Date.now();
      const response = await fetch(endpoint, {
        headers: { "User-Agent": "TradeTerminal/1.0" },
        cache: "no-store",
      });
      const completedAt = Date.now();
      if (!response.ok) continue;

      const payload: any = await response.json().catch(() => null);
      const serverTime = Number(payload?.serverTime || 0);
      if (!Number.isFinite(serverTime) || serverTime <= 0) continue;

      const roundTripMs = Math.max(0, completedAt - startedAt);
      const estimatedSampleTime = startedAt + Math.round(roundTripMs / 2);
      serverTimeOffsetMs = serverTime - estimatedSampleTime;
      serverTimeSyncedAt = completedAt;
      return serverTimeOffsetMs;
    } catch {
      // Fall through to next endpoint.
    }
  }

  return serverTimeOffsetMs;
}

export async function buildBinanceSignedQuery(
  apiSecret: string,
  params: Record<string, string | number | boolean | undefined>,
  options?: { forceTimeSync?: boolean }
): Promise<{ queryString: string; signature: string }> {
  const offsetMs = await syncBinanceServerTimeOffset(options?.forceTimeSync === true);

  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query.set(key, String(value));
  });

  if (!query.get("recvWindow")) {
    query.set("recvWindow", DEFAULT_RECV_WINDOW);
  }
  query.set("timestamp", String(Date.now() + offsetMs));

  const queryString = query.toString();
  const signature = sign(queryString, apiSecret);
  return { queryString, signature };
}
