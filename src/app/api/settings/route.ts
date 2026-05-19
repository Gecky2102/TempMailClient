import { NextResponse } from "next/server";
import { kvAvailable, kvGet, kvSet } from "@/lib/kv";

export const runtime = "nodejs";

const KEY = "tmc:settings";
const MAX_BYTES = 200_000;

export async function GET() {
  if (!kvAvailable()) return NextResponse.json({ available: false });
  try {
    const raw = await kvGet(KEY);
    return NextResponse.json({
      available: true,
      data: raw ? JSON.parse(raw) : null,
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json({ available: false, error: e instanceof Error ? e.message : "errore" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!kvAvailable()) return NextResponse.json({ available: false });
  const body = await req.text();
  if (body.length > MAX_BYTES) return NextResponse.json({ error: "payload troppo grande" }, { status: 413 });
  try { JSON.parse(body); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  try {
    await kvSet(KEY, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "errore" }, { status: 502 });
  }
}
