import { NextResponse } from "next/server";
import { deleteMessage, getMessage } from "@/lib/catchmail";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const mailbox = searchParams.get("mailbox");
  if (!id || !mailbox) return NextResponse.json({ error: "id/mailbox mancanti" }, { status: 400 });
  try {
    const data = await getMessage(id, mailbox);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "errore";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const mailbox = searchParams.get("mailbox");
  if (!id || !mailbox) return NextResponse.json({ error: "id/mailbox mancanti" }, { status: 400 });
  try {
    await deleteMessage(id, mailbox);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "errore";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
