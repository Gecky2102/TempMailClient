"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, ShieldAlert, Paperclip, Trash2, Download, ChevronDown, ChevronRight } from "lucide-react";
import type { MessageDetail } from "@/lib/catchmail";
import { settings as store, pinKey } from "@/lib/store";

function fmt(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("it-IT");
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildEml(d: MessageDetail): string {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const [k, vs] of Object.entries(d.headers || {})) {
    for (const v of vs) { lines.push(`${k}: ${v}`); seen.add(k.toLowerCase()); }
  }
  if (!seen.has("from")) lines.push(`From: ${d.from}`);
  if (!seen.has("to") && d.to?.length) lines.push(`To: ${d.to.join(", ")}`);
  if (!seen.has("subject")) lines.push(`Subject: ${d.subject || ""}`);
  if (!seen.has("date")) lines.push(`Date: ${d.date}`);
  if (d.body?.html) {
    lines.push("Content-Type: text/html; charset=utf-8", "", d.body.html);
  } else {
    lines.push("Content-Type: text/plain; charset=utf-8", "", d.body?.text || "");
  }
  return lines.join("\r\n");
}

export default function MessageView({ mailbox, id }: { mailbox: string; id: string }) {
  const router = useRouter();
  const [data, setData] = useState<MessageDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);
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
    store.markRead(pinKey(mailbox, id));
  }, [mailbox, id]);

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
  const safeName = (data.subject || "messaggio").replace(/[^\w.-]+/g, "_").slice(0, 60) || "messaggio";

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn" onClick={() => router.back()}>
            <ArrowLeft size={14} className="mr-1.5" /> Indietro
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn" onClick={() => downloadBlob(`${safeName}.eml`, buildEml(data), "message/rfc822")} title="Scarica come .eml">
              <Download size={14} className="mr-1.5" /> .eml
            </button>
            <button className="btn" onClick={() => downloadBlob(`${safeName}.json`, JSON.stringify(data, null, 2), "application/json")} title="Scarica come .json">
              <Download size={14} className="mr-1.5" /> .json
            </button>
            <button className="btn btn-danger" onClick={onDelete} disabled={deleting}>
              <Trash2 size={14} className="mr-1.5" /> {deleting ? "Elimino…" : "Elimina"}
            </button>
          </div>
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

        {data.headers && Object.keys(data.headers).length > 0 && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setShowHeaders(v => !v)}
              className="text-xs muted hover:text-white flex items-center gap-1"
            >
              {showHeaders ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Header raw
            </button>
            {showHeaders && (
              <pre
                className="text-[11px] mt-2 p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-all"
                style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
              >
                {Object.entries(data.headers).flatMap(([k, vs]) => vs.map(v => `${k}: ${v}`)).join("\n")}
              </pre>
            )}
          </div>
        )}
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
