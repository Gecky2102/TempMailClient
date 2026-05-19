import { NextResponse } from "next/server";
import { listMailbox } from "@/lib/catchmail";
import { isValidEmail } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const page = Math.max(1, Math.min(1000, Number(searchParams.get("page") || "1")));
  const pageSize = Math.max(1, Math.min(100, Number(searchParams.get("page_size") || "50")));
  if (!isValidEmail(address)) return NextResponse.json({ error: "address invalido" }, { status: 400 });
  try {
    const data = await listMailbox(address, page, pageSize);
    return NextResponse.json(data, { headers: { "cache-control": "private, no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "errore";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
