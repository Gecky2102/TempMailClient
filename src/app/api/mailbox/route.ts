import { NextResponse } from "next/server";
import { listMailbox } from "@/lib/catchmail";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("page_size") || "50");
  if (!address) return NextResponse.json({ error: "address mancante" }, { status: 400 });
  try {
    const data = await listMailbox(address, page, pageSize);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "errore";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
