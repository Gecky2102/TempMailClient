import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url mancante" }, { status: 400 });
  let target: URL;
  try { target = new URL(url); } catch { return NextResponse.json({ error: "url invalido" }, { status: 400 }); }
  if (target.host !== "api.catchmail.io") {
    return NextResponse.json({ error: "host non consentito" }, { status: 400 });
  }
  const r = await fetch(target.toString(), { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: `upstream ${r.status}` }, { status: 502 });
  const headers = new Headers();
  const ct = r.headers.get("content-type"); if (ct) headers.set("content-type", ct);
  const cd = r.headers.get("content-disposition"); if (cd) headers.set("content-disposition", cd);
  return new Response(r.body, { headers });
}
