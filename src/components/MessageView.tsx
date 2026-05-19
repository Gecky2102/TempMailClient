"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import type { MessageDetail } from "@/lib/catchmail";

function fmt(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("it-IT");
}

export default function MessageView({ mailbox, id }: { mailbox: string; id: string }) {
  const router = useRouter();
  const [data, setData] = useState<MessageDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"html" | "text">("html");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/message?id=${encodeURIComponent(id)}&mailbox=${encodeURIComponent(mailbox)}`, { cache: "no-store" });
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) { setErr(j.error || "errore"); return; }
        setData(j as MessageDetail);
        if (!j.body?.html) setMode("text");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "errore");
      }
    })();
    return () => { cancelled = true; };
  }, [id, mailbox]);

  useEffect(() => {
    if (mode !== "html" || !data?.body?.html || !iframeRef.current) return;
    const clean = DOMPurify.sanitize(data.body.html, {
      WHOLE_DOCUMENT: true,
      FORBID_TAGS: ["script", "form", "object", "embed", "iframe", "base"],
      FORBID_ATTR: ["onerror", "onload", "onclick"],
    });
    const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
      body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#fff;padding:16px;line-height:1.5;font-size:14px;}
      img{max-width:100%;height:auto;}
      a{color:#1a4fb0;}
      table{max-width:100%;}
    </style></head><body>${clean}</body></html>`;
    iframeRef.current.srcdoc = doc;
  }, [mode, data]);

  async function onDelete() {
    if (!confirm("Eliminare definitivamente questo messaggio?")) return;
    const r = await fetch(`/api/message?id=${encodeURIComponent(id)}&mailbox=${encodeURIComponent(mailbox)}`, { method: "DELETE" });
    if (r.ok) router.back();
    else alert("Errore eliminazione");
  }

  if (err) return <div className="p-4 text-sm text-red-400">Errore: {err}</div>;
  if (!data) return <div className="p-4 text-sm muted">Caricamento…</div>;

  const hasHtml = !!data.body?.html;
  const hasText = !!data.body?.text;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-start gap-2">
          <button className="btn" onClick={() => router.back()}>← Indietro</button>
          <button className="btn btn-danger ml-auto" onClick={onDelete}>Elimina</button>
        </div>
        <h1 className="text-base font-medium break-words">{data.subject || "(nessun oggetto)"}</h1>
        <div className="text-xs muted flex flex-col gap-0.5">
          <div><span className="muted">Da:</span> {data.from}</div>
          <div><span className="muted">A:</span> {(data.to || []).join(", ")}</div>
          <div><span className="muted">Casella:</span> {data.mailbox}</div>
          <div><span className="muted">Data:</span> {fmt(data.date)}</div>
          {data.security_badge && (
            <div><span className="muted">Sicurezza:</span> {data.security_badge.label}</div>
          )}
        </div>
      </div>

      {data.attachments && data.attachments.length > 0 && (
        <div className="border-b px-4 py-3 flex flex-wrap gap-2" style={{ borderColor: "var(--border)" }}>
          <span className="text-xs muted w-full">Allegati</span>
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

      {(hasHtml || hasText) && (
        <div className="border-b px-4 py-2 flex gap-2 text-xs" style={{ borderColor: "var(--border)" }}>
          {hasHtml && (
            <button className={`btn ${mode === "html" ? "btn-primary" : ""}`} onClick={() => setMode("html")}>HTML</button>
          )}
          {hasText && (
            <button className={`btn ${mode === "text" ? "btn-primary" : ""}`} onClick={() => setMode("text")}>Testo</button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {mode === "html" && hasHtml ? (
          <iframe
            ref={iframeRef}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
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
