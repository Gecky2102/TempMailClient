type Entry = { count: number; firstAt: number; lockedUntil: number };
const buckets = new Map<string, Entry>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

export function checkLoginRate(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const e = buckets.get(key);
  if (!e) return { ok: true };
  if (e.lockedUntil > now) return { ok: false, retryAfterSec: Math.ceil((e.lockedUntil - now) / 1000) };
  if (now - e.firstAt > WINDOW_MS) buckets.delete(key);
  return { ok: true };
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const e = buckets.get(key);
  if (!e || now - e.firstAt > WINDOW_MS) {
    buckets.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  e.count += 1;
  if (e.count >= MAX_ATTEMPTS) e.lockedUntil = now + LOCK_MS;
}

export function clearLoginRate(key: string) { buckets.delete(key); }

export function clientKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
