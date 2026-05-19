const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function kvAvailable() { return !!(URL && TOKEN); }

async function cmd(args: (string | number)[]): Promise<unknown> {
  if (!URL || !TOKEN) throw new Error("KV non configurato");
  const r = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`KV ${r.status}: ${await r.text().catch(() => "")}`);
  const j = (await r.json()) as { result?: unknown; error?: string };
  if (j.error) throw new Error(j.error);
  return j.result;
}

export async function kvGet(key: string): Promise<string | null> {
  const r = await cmd(["GET", key]);
  return typeof r === "string" ? r : null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  await cmd(["SET", key, value]);
}
