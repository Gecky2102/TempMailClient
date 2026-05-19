"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, ShieldAlert, Paperclip, Trash2 } from "lucide-react";
import type { MessageDetail } from "@/lib/catchmail";

function fmt(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("it-IT");
}

export default function MessageView({ mailbox, id }: { mailbox: string; id: string }) {
  const router = useRouter();
  const [data, setData] = useState<MessageDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  async function onDelete() {
    if (!confirm("Eliminare definitivamente questo messaggio?")) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/message?id=${encodeURIComponent(id)}&mailbox=${encodeURIComponent(mailbox)}`, { method: "DELETE" });
      if (r.ok) router.back();
      else { const j = await r.json().catch(() => ({})); alert(j.error || "Errore eliminazione"); }
    } finally { setDeleting(false); }
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch(`/api/message?id=${encodeURIComponent(id)}&mailbox=${encodeURIComponent(mailbox)}`, { cache: "no-store", signal: ac.signal });
        const j = await r.json();
        if (!r.ok) { setErr(j.error || "errore"); return; }
        setData(j as MessageDetail);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setErr(e instanceof Error ? e.message : "errore");
      }
    })();
    return () => ac.abort();
  }, [id, mailbox]);

  const hasHtml = !!data?.body?.html;
  const hasText = !!data?.body?.text;

  useEffect(() => {
    if (!hasHtml || !iframeRef.current || !data) return;
    const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
      body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#fff;padding:16px;line-height:1.5;font-size:14px;margin:0;}
      img{max-width:100%;height:auto;}
      a{color:#1a4fb0;}
      table{max-width:100%;}
      pre{white-space:pre-wrap;word-wrap:break-word;}
    </style></head><body>${data.body.html}</body></html>`;
    iframeRef.current.srcdoc = doc;
  }, [hasHtml, data]);

  if (err) return <div className="p-4 text-sm text-red-400">Errore: {err}</div>;
  if (!data) return <div className="p-4 text-sm muted">Caricamento…</div>;

  const verified = (data.security as { verified?: boolean } | undefined)?.verified === true;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => router.back()}>
            <ArrowLeft size={14} className="mr-1.5" /> Indietro
          </button>
          <button className="btn btn-danger ml-auto" onClick={onDelete} disabled={deleting}>
            <Trash2 size={14} className="mr-1.5" /> {deleting ? "Elimino…" : "Elimina"}
          </button>
        </div>
        <h1 className="text-base font-medium break-words">{data.subject || "(nessun oggetto)"}</h1>
        <div className="text-xs muted flex flex-col gap-0.5">
          <div><span className="muted">Da:</span> {data.from}</div>
          <div><span className="muted">A:</span> {(data.to || []).join(", ")}</div>
          <div><span className="muted">Casella:</span> {data.mailbox}</div>
          <div><span className="muted">Data:</span> {fmt(data.date)}</div>
          {data.security_badge && (
            <div className="flex items-center gap-1">
              {verified ? <ShieldCheck size={12} className="text-green-400" /> : <ShieldAlert size={12} className="text-yellow-500" />}
              <span>{data.security_badge.label}</span>
            </div>
          )}
        </div>
      </div>

      {data.attachments && data.attachments.length > 0 && (
        <div className="border-b px-4 py-3 flex flex-wrap gap-2 items-center" style={{ borderColor: "var(--border)" }}>
          <span className="text-xs muted w-full flex items-center gap-1">
            <Paperclip size={12} /> Allegati
          </span>
          {data.attachments.map((a, i) => {
            const url = a.url || a.download_url;
            const proxied = url ? `/api/attachment?url=${encodeURIComponent(url)}` : undefined;
            return (
              <a
                key={i}
                href={proxied || "#"}
                target="_blank"
                rel="noopener"
                className="btn text-xs"
              >
                {a.filename || `allegato-${i + 1}`} {a.size ? `(${Math.round(a.size / 1024)} KB)` : ""}
              </a>
            );
          })}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {hasHtml ? (
          <iframe
            ref={iframeRef}
            sandbox=""
            referrerPolicy="no-referrer"
            className="w-full h-[70vh] bg-white"
            title="messaggio"
          />
        ) : hasText ? (
          <pre className="p-4 text-sm whitespace-pre-wrap break-words">{data.body.text}</pre>
        ) : (
          <div className="p-4 text-sm muted">Nessun contenuto.</div>
        )}
      </div>
    </div>
  );
}
