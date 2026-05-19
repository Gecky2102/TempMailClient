import { NextResponse } from "next/server";
import { checkCredentials, setSession } from "@/lib/auth";
import { checkLoginRate, clearLoginRate, clientKey, recordLoginFailure } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = clientKey(req);
  const rate = checkLoginRate(key);
  if (!rate.ok) {
    return NextResponse.json(
      { error: `Troppi tentativi. Riprova tra ${Math.ceil(rate.retryAfterSec / 60)} minuti.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  let email = "", password = "";
  try {
    const body = await req.json();
    if (typeof body?.email === "string") email = body.email;
    if (typeof body?.password === "string") password = body.password;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (email.length > 256 || password.length > 256) {
    return NextResponse.json({ error: "input troppo lungo" }, { status: 400 });
  }

  if (!checkCredentials(email, password)) {
    recordLoginFailure(key);
    await new Promise(r => setTimeout(r, 400));
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }
  clearLoginRate(key);
  await setSession();
  return NextResponse.json({ ok: true });
}
