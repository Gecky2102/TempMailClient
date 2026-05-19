"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, RefreshCw, AlertCircle } from "lucide-react";
import { useSettings } from "@/lib/store";
import type { MessageSummary } from "@/lib/catchmail";

type Row = MessageSummary & { _mailbox: string };

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export default function MessageList({ filterAddress }: { filterAddress?: string }) {
  const settings = useSettings();
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const aborter = useRef<AbortController | null>(null);

  const targets = useMemo(
    () => filterAddress
      ? settings.mailboxes.filter(m => m.address === filterAddress)
      : settings.mailboxes.filter(m => m.active),
    [filterAddress, settings.mailboxes]
  );

  const targetsKey = useMemo(() => targets.map(t => t.address).join("|"), [targets]);

  const fetchAll = useCallback(async () => {
    aborter.current?.abort();
    const ac = new AbortController();
    aborter.current = ac;
    if (targets.length === 0) { setRows([]); setErrors({}); return; }
    setLoading(true);
    const acc: Row[] = [];
    const errs: Record<string, string> = {};
    try {
      for (const m of targets) {
        if (ac.signal.aborted) return;
        try {
          const r = await fetch(`/api/mailbox?address=${encodeURIComponent(m.address)}`, { cache: "no-store", signal: ac.signal });
          const j = await r.json();
          if (!r.ok) { errs[m.address] = j.error || "errore"; continue; }
          for (const msg of j.messages as MessageSummary[]) acc.push({ ...msg, _mailbox: m.address });
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          errs[m.address] = e instanceof Error ? e.message : "errore";
        }
        if (targets.length > 1) await new Promise(res => setTimeout(res, 1100));
      }
      acc.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (!ac.signal.aborted) {
        setRows(acc);
        setErrors(errs);
        setLastFetch(Date.now());
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [targetsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, Math.max(5, settings.pollIntervalSec) * 1000);
    return () => { clearInterval(iv); aborter.current?.abort(); };
  }, [fetchAll, settings.pollIntervalSec]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b text-xs muted" style={{ borderColor: "var(--border)" }}>
        <span>{rows.length} messaggi</span>
        {lastFetch && !loading && <span>· {new Date(lastFetch).toLocaleTimeString("it-IT")}</span>}
        <span className="ml-auto">{targets.length} attive</span>
        <button className="btn !py-1 !px-2" onClick={fetchAll} disabled={loading} aria-label="aggiorna">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {Object.entries(errors).length > 0 && (
        <div className="px-4 py-2 text-xs text-red-400 border-b flex flex-col gap-1" style={{ borderColor: "var(--border)" }}>
          {Object.entries(errors).map(([a, e]) => (
            <div key={a} className="flex items-center gap-1"><AlertCircle size={12} /> {a}: {e}</div>
          ))}
        </div>
      )}
      {rows.length === 0 && !loading && (
        <div className="p-8 text-center text-sm muted flex flex-col items-center gap-2">
          <Mail size={24} />
          Nessun messaggio.
        </div>
      )}
      <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
        {rows.map(r => (
          <li key={`${r._mailbox}:${r.id}`}>
            <Link
              prefetch={false}
              href={`/message/${encodeURIComponent(r._mailbox)}/${encodeURIComponent(r.id)}`}
              className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3 hover:bg-[var(--bg-soft)]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm truncate">{r.from}</span>
                  <span className="text-[10px] muted truncate">{r._mailbox}</span>
                </div>
                <div className="text-sm muted truncate">{r.subject || "(nessun oggetto)"}</div>
              </div>
              <div className="text-xs muted shrink-0">{formatDate(r.date)}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
