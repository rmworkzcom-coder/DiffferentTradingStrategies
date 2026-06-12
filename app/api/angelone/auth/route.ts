import { NextResponse } from "next/server";
import fetch from "node-fetch";

export const dynamic = "force-dynamic";

// Auth-only endpoint that attempts a login to AngelOne SmartAPI using server
// credentials when ANGEL_USE_SERVER_CREDS=true. It does not place orders.
// Use this to validate server-side login works. POST body may include
// { useServerCreds: true } to override client preference.

async function serverLogin() {
  const apiKey = process.env.ANGEL_API_KEY;
  const clientCode = process.env.ANGEL_CLIENT_CODE;
  const mpin = process.env.ANGEL_MPIN;
  const base = process.env.ANGEL_API_BASE || "https://apiconnect.angelone.in";
  if (!apiKey || !clientCode || !mpin) return { ok: false, reason: "missing_env" };

  const loginUrl = `${base}/publisher-webapi/api/v1/user/login/v5`;
  try {
    const resp = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({ clientcode: clientCode, mpin }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, reason: "login_failed", status: resp.status, data };
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, reason: "network", error: err?.message || String(err) };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const useServer = body?.useServerCreds || process.env.ANGEL_USE_SERVER_CREDS === "true";
    if (!useServer) return NextResponse.json({ ok: false, reason: "client_only" });

    const res = await serverLogin();
    if (!res.ok) return NextResponse.json(res, { status: 400 });
    return NextResponse.json({ ok: true, msg: "server_auth_success", info: res.data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", info: "POST to this endpoint to test server-side AngelOne auth (requires env vars)." });
}
