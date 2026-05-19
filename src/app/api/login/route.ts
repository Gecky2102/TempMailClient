import { NextResponse } from "next/server";
import { checkCredentials, setSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({ email: "", password: "" }));
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!checkCredentials(email, password)) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }
  await setSession();
  return NextResponse.json({ ok: true });
}
