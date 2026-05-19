"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Inbox, Mail, Settings as SettingsIcon, LogOut, Menu, X, Cloud, CloudOff, RefreshCw, Copy, Check } from "lucide-react";
import { useSettings, useIsClient, hydrateFromServer, subscribeSync, getSyncStatus, pinKey } from "@/lib/store";
import { useInbox, startInboxPolling } from "@/lib/inbox-store";

function useSyncStatus() {
  return useSyncExternalStore(subscribeSync, getSyncStatus, () => "idle" as const);
}

function SyncBadge() {
  const status = useSyncStatus();
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode; title: string }> = {
    idle: { label: "—", cls: "muted", icon: <Cloud size={11} />, title: "in attesa" },
    syncing: { label: "sync", cls: "muted", icon: <RefreshCw size={11} className="animate-spin" />, title: "sincronizzazione in corso" },
    saved: { label: "sync", cls: "text-green-400", icon: <Cloud size={11} />, title: "sincronizzato" },
    error: { label: "errore", cls: "text-red-400", icon: <CloudOff size={11} />, title: "errore di sincronizzazione" },
    offline: { label: "locale", cls: "muted", icon: <CloudOff size={11} />, title: "Sincronizzazione cloud non configurata. Le impostazioni restano su questo dispositivo." },
  };
  const m = map[status] || map.idle;
  return (
    <span className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded ${m.cls}`} title={m.title}>
      {m.icon} {m.label}
    </span>
  );
}

function CopyAddr({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.preventDefault(); e.stopPropagation();
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); } catch {}
      }}
      className="muted hover:text-white p-1 shrink-0"
      aria-label="copia indirizzo"
      title="copia indirizzo"
    >
      {done ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const settings = useSettings();
  const inbox = useInbox();
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);

  useEffect(() => { hydrateFromServer(); startInboxPolling(); }, []);

  const readSet = useMemo(() => new Set(settings.read), [settings.read]);

  const unreadByBox = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of settings.mailboxes) {
      if (!m.active) continue;
      const rows = inbox.byBox[m.address] || [];
      let u = 0;
      for (const r of rows) if (!readSet.has(pinKey(m.address, r.id))) u++;
      out[m.address] = u;
    }
    return out;
  }, [settings.mailboxes, inbox.byBox, readSet]);

  const totalUnread = useMemo(() => Object.values(unreadByBox).reduce((a, b) => a + b, 0), [unreadByBox]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = totalUnread > 0 ? `(${totalUnread}) TempMail` : "TempMail";
  }, [totalUnread]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }

  const itemCls = (active: boolean, dim?: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${active ? "bg-[var(--bg-elev)] text-white" : "muted hover:bg-[var(--bg-elev)] hover:text-white"} ${dim ? "opacity-50" : ""}`;

  const sidebar = (
    <nav className="flex flex-col gap-1 p-3 h-full">
      <div className="px-3 py-3 flex items-center gap-2">
        <span className="text-sm font-medium tracking-tight flex items-center gap-2"><Mail size={16} /> TempMail</span>
        <span className="ml-auto"><SyncBadge /></span>
      </div>
      <div className="px-3 pt-2 pb-1 text-[11px] uppercase muted">Inbox</div>
      <Link href="/inbox" onClick={() => setOpen(false)} prefetch className={itemCls(pathname === "/inbox")}>
        <Inbox size={14} />
        <span>Tutte le caselle</span>
        {totalUnread > 0 && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--text)", color: "var(--bg)" }}>{totalUnread}</span>
        )}
      </Link>
      <div className="px-3 pt-4 pb-1 text-[11px] uppercase muted">Caselle</div>
      {isClient && settings.mailboxes.length === 0 && (
        <div className="px-3 py-2 text-xs muted">Nessuna casella. Creane una.</div>
      )}
      {isClient && settings.mailboxes.map(m => {
        const href = `/mailbox/${encodeURIComponent(m.address)}`;
        const u = unreadByBox[m.address] || 0;
        return (
          <div key={m.address} className="group flex items-center">
            <Link href={href} onClick={() => setOpen(false)} prefetch className={itemCls(pathname === href, !m.active) + " flex-1 min-w-0"}>
              <Mail size={14} className="shrink-0" />
              <span className="truncate">{m.label || m.address}</span>
              {u > 0 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--text)", color: "var(--bg)" }}>{u}</span>
              )}
            </Link>
            <CopyAddr value={m.address} />
          </div>
        );
      })}
      <div className="mt-auto flex flex-col gap-1 pt-3">
        <Link href="/settings" onClick={() => setOpen(false)} prefetch className={itemCls(pathname === "/settings")}>
          <SettingsIcon size={14} /> Impostazioni
        </Link>
        <button onClick={logout} className={itemCls(false) + " text-left"}>
          <LogOut size={14} /> Esci
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-sm font-medium flex items-center gap-2">
          <Mail size={14} /> TempMail
          {totalUnread > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--text)", color: "var(--bg)" }}>{totalUnread}</span>}
        </span>
        <button className="btn" onClick={() => setOpen(o => !o)} aria-label="menu">
          {open ? <X size={14} /> : <Menu size={14} />}
        </button>
      </header>
      <aside className={`${open ? "block" : "hidden"} md:block md:w-64 md:border-r`} style={{ borderColor: "var(--border)" }}>
        {sidebar}
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
