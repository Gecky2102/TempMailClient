import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "tmc_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET mancante o troppo corto");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function makeToken() {
  const payload = `v1.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload);
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAuthed() {
  const c = await cookies();
  return verifyToken(c.get(COOKIE)?.value);
}

export async function setSession() {
  const c = await cookies();
  c.set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSession() {
  const c = await cookies();
  c.delete(COOKIE);
}

export function checkCredentials(email: string, password: string) {
  const e = process.env.AUTH_EMAIL || "";
  const p = process.env.AUTH_PASSWORD || "";
  if (!e || !p) return false;
  return email === e && password === p;
}

export const COOKIE_NAME = COOKIE;
