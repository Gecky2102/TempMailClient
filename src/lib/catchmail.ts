const BASE = "https://api.catchmail.io/api/v1";

export type MessageSummary = {
  id: string;
  mailbox: string;
  from: string;
  subject: string;
  date: string;
  size: number;
};

export type MailboxListResponse = {
  address: string;
  page: number;
  page_size: number;
  messages: MessageSummary[];
  count: number;
};

export type Attachment = {
  filename?: string;
  content_type?: string;
  size?: number;
  url?: string;
  download_url?: string;
  id?: string;
  [k: string]: unknown;
};

export type MessageDetail = {
  id: string;
  mailbox: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  size: number;
  headers: Record<string, string[]>;
  body: { text?: string; html?: string };
  attachments: Attachment[];
  security?: unknown;
  security_badge?: { label: string; color: string; icon: string };
};

async function req<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`catchmail ${r.status}: ${text || r.statusText}`);
  }
  return r.json() as Promise<T>;
}

export function listMailbox(address: string, page = 1, pageSize = 50) {
  const q = new URLSearchParams({ address, page: String(page), page_size: String(pageSize) });
  return req<MailboxListResponse>(`/mailbox?${q.toString()}`);
}

export function getMessage(id: string, mailbox: string) {
  const q = new URLSearchParams({ mailbox });
  return req<MessageDetail>(`/message/${encodeURIComponent(id)}?${q.toString()}`);
}

export async function deleteMessage(id: string, mailbox: string) {
  const q = new URLSearchParams({ mailbox });
  const r = await fetch(`${BASE}/message/${encodeURIComponent(id)}?${q.toString()}`, {
    method: "DELETE",
    cache: "no-store",
  });
  if (!r.ok && r.status !== 204) {
    throw new Error(`catchmail delete ${r.status}`);
  }
}
