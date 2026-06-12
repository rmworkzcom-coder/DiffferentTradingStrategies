import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// OAuth callback stub for AngelOne. When you register an app with AngelOne,
// configure the Redirect URL to point here. This route is a placeholder and
// should be extended to exchange any code/token the broker returns.
export async function GET(req: Request) {
  return NextResponse.json({ status: "ok", message: "AngelOne OAuth callback placeholder. Implement token exchange here." });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ status: "ok", received: body });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
