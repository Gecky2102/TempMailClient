import { NextResponse } from "next/server";
import DOMPurify from "isomorphic-dompurify";
import { getMessage } from "@/lib/catchmail";
import { isValidEmail, isValidId } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const mailbox = searchParams.get("mailbox");
  if (!isValidId(id) || !isValidEmail(mailbox)) {
    return NextResponse.json({ error: "parametri invalidi" }, { status: 400 });
  }
  try {
    const data = await getMessage(id, mailbox);
    if (data.body?.html) {
      data.body.html = DOMPurify.sanitize(data.body.html, {
        WHOLE_DOCUMENT: true,
        FORBID_TAGS: ["script", "form", "object", "embed", "iframe", "base", "meta", "link"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
      }) as string;
    }
    return NextResponse.json(data, { headers: { "cache-control": "private, no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "errore";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
