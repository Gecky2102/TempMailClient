"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Mail, RefreshCw, AlertCircle, Search, X, Pin, PinOff, ChevronLeft, ChevronRight, CheckCheck } from "lucide-react";
import { useSettings, settings as store, pinKey } from "@/lib/store";
import { useInbox, refreshInbox } from "@/lib/inbox-store";

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
  const inbox = useInbox();
  const [query, setQuery] = useState("");
  const [boxFilter, setBoxFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const targets = useMemo(
    () => filterAddress
      ? settings.mailboxes.filter(m => m.address === filterAddress)
      : settings.mailboxes.filter(m => m.active),
    [filterAddress, settings.mailboxes]
  );

  const pinnedSet = useMemo(() => new Set(settings.pinned), [settings.pinned]);
  const readSet = useMemo(() => new Set(settings.read), [settings.read]);

  const allRows = useMemo(() => {
    const allowed = new Set(targets.map(t => t.address));
    const acc = [] as typeof inbox.byBox[string];
    for (const [addr, list] of Object.entries(inbox.byBox)) {
      if (!allowed.has(addr)) continue;
      acc.push(...list);
    }
    return acc;
  }, [inbox.byBox, targets]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = allRows.filter(r => {
      if (boxFilter && r._mailbox !== boxFilter) return false;
      if (!q) return true;
      return (
        r.from.toLowerCase().includes(q) ||
        (r.subject || "").toLowerCase().includes(q) ||
        r._mailbox.toLowerCase().includes(q)
      );
    });
    filtered.sort((a, b) => {
      const pa = pinnedSet.has(pinKey(a._mailbox, a.id)) ? 1 : 0;
      const pb = pinnedSet.has(pinKey(b._mailbox, b.id)) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    return filtered;
  }, [allRows, query, boxFilter, pinnedSet]);

  const unreadCount = useMemo(
    () => allRows.reduce((n, r) => readSet.has(pinKey(r._mailbox, r.id)) ? n : n + 1, 0),
    [allRows, readSet]
  );

  useEffect(() => { setPage(1); }, [query, boxFilter, filterAddress, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => rows.slice((safePage - 1) * pageSize, safePage * pageSize), [rows, safePage, pageSize]);

  const errors = inbox.errors;
  const loading = inbox.loading;
  const lastFetch = inbox.lastFetch;

  function markAllRead() {
    store.markManyRead(allRows.map(r => pinKey(r._mailbox, r.id)));
  }

  const visibleErrors = useMemo(() => {
    const allowed = new Set(targets.map(t => t.address));
    return Object.entries(errors).filter(([a]) => allowed.has(a));
  }, [errors, targets]);

  return (
    <div className="flex flex-col">
      <div className="px-4 py-2 border-b flex flex-col sm:flex-row gap-2 sm:items-center" style={{ borderColor: "var(--border)" }}>
        <div className="relative flex-1 max-w-md">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 muted pointer-events-none" />
          <input
            type="search"
            placeholder="Cerca per mittente, oggetto, casella…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input !pl-7 !pr-7 !py-1.5 text-xs"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 muted hover:text-white p-1" aria-label="pulisci">
              <X size={12} />
            </button>
          )}
        </div>
        {!filterAddress && targets.length > 1 && (
          <select
            className="input !py-1.5 !w-auto text-xs"
            value={boxFilter}
            onChange={e => setBoxFilter(e.target.value)}
            aria-label="filtra casella"
          >
            <option value="">tutte le caselle</option>
            {targets.map(t => <option key={t.address} value={t.address}>{t.label || t.address}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {unreadCount > 0 && (
            <button className="btn !py-1 !px-2 text-xs" onClick={markAllRead} title="Segna tutto come letto">
              <CheckCheck size={12} className="mr-1" /> {unreadCount}
            </button>
          )}
          <button className="btn !py-1 !px-2" onClick={refreshInbox} disabled={loading} aria-label="aggiorna">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2 border-b text-xs muted" style={{ borderColor: "var(--border)" }}>
        <span>{rows.length} {query || boxFilter ? "risultati" : "messaggi"}</span>
        {unreadCount > 0 && <span className="text-green-400">· {unreadCount} non letti</span>}
        {lastFetch && <span>· ultimo aggiornamento {new Date(lastFetch).toLocaleTimeString("it-IT")}</span>}
        <span className="ml-auto">{targets.length} attive</span>
      </div>

      {visibleErrors.length > 0 && (
        <div className="px-4 py-2 text-xs text-red-400 border-b flex flex-col gap-1" style={{ borderColor: "var(--border)" }}>
          {visibleErrors.map(([a, e]) => (
            <div key={a} className="flex items-center gap-1"><AlertCircle size={12} /> {a}: {e}</div>
          ))}
        </div>
      )}

      {rows.length === 0 && !loading && (
        <div className="p-8 text-center text-sm muted flex flex-col items-center gap-2">
          <Mail size={24} />
          {query || boxFilter ? "Nessun risultato." : "Nessun messaggio."}
        </div>
      )}

      <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
        {pageRows.map(r => {
          const key = pinKey(r._mailbox, r.id);
          const pinned = pinnedSet.has(key);
          const read = readSet.has(key);
          return (
            <li key={`${r._mailbox}:${r.id}`} className="flex items-stretch" style={{ background: pinned ? "var(--bg-soft)" : undefined }}>
              <Link
                prefetch={false}
                href={`/message/${encodeURIComponent(r._mailbox)}/${encodeURIComponent(r.id)}`}
                className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3 hover:bg-[var(--bg-soft)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!read && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--text)" }} aria-label="non letto" />}
                    {pinned && <Pin size={10} className="muted shrink-0" fill="currentColor" />}
                    <span className={`text-sm truncate ${read ? "muted" : ""}`}>{r.from}</span>
                    <span className="text-[10px] muted truncate">{r._mailbox}</span>
                  </div>
                  <div className={`text-sm truncate ${read ? "muted" : ""}`}>{r.subject || "(nessun oggetto)"}</div>
                </div>
                <div className="text-xs muted shrink-0">{formatDate(r.date)}</div>
              </Link>
              <button
                onClick={() => store.togglePin(key)}
                className="px-3 muted hover:text-white"
                aria-label={pinned ? "rimuovi pin" : "pinna"}
                title={pinned ? "Rimuovi pin" : "Pinna in alto"}
              >
                {pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
            </li>
          );
        })}
      </ul>

      {rows.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 border-t text-xs" style={{ borderColor: "var(--border)" }}>
          <span className="muted">
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rows.length)} di {rows.length}
          </span>
          <select
            className="input !py-1 !px-2 !w-auto text-xs"
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            aria-label="messaggi per pagina"
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}/pag</option>)}
          </select>
          <div className="ml-auto flex items-center gap-1">
            <button
              className="btn !py-1 !px-2"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="pagina precedente"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="muted px-2">{safePage} / {totalPages}</span>
            <button
              className="btn !py-1 !px-2"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="pagina successiva"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
