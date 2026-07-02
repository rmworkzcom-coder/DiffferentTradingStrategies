import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dir = path.resolve(process.cwd(), "OPERATIONAL");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "autopilot_blocked_detailed.jsonl");
    fs.appendFileSync(file, JSON.stringify(body) + "\n");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("operational log error", e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) });
  }
}
