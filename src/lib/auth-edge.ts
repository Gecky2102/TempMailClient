async function hmac(secret: string, payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const b = new Uint8Array(sig);
  let hex = "";
  for (let i = 0; i < b.length; i++) hex += b[i].toString(16).padStart(2, "0");
  return hex;
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyTokenEdge(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = await hmac(secret, payload);
  return safeEqual(parts[2], expected);
}

export const COOKIE_NAME = "tmc_session";
