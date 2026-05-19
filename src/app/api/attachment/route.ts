import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url mancante" }, { status: 400 });
  let target: URL;
  try { target = new URL(url); } catch { return NextResponse.json({ error: "url invalido" }, { status: 400 }); }
  if (target.protocol !== "https:") return NextResponse.json({ error: "https richiesto" }, { status: 400 });
  if (target.host !== "api.catchmail.io") return NextResponse.json({ error: "host non consentito" }, { status: 400 });

  const r = await fetch(target.toString(), { cache: "no-store", redirect: "error" });
  if (!r.ok) return NextResponse.json({ error: `upstream ${r.status}` }, { status: 502 });

  const len = Number(r.headers.get("content-length") || "0");
  if (len > MAX_BYTES) return NextResponse.json({ error: "allegato troppo grande" }, { status: 413 });

  const headers = new Headers();
  const ct = r.headers.get("content-type") || "application/octet-stream";
  headers.set("content-type", ct);
  const cd = r.headers.get("content-disposition");
  headers.set("content-disposition", cd && /^attachment/i.test(cd) ? cd : "attachment");
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "private, no-store");
  return new Response(r.body, { headers });
}
