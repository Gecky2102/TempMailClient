"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Inbox, Mail, Settings as SettingsIcon, LogOut, Menu, X } from "lucide-react";
import { useSettings, useIsClient } from "@/lib/store";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const settings = useSettings();
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }

  const itemCls = (active: boolean, dim?: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${active ? "bg-[var(--bg-elev)] text-white" : "muted hover:bg-[var(--bg-elev)] hover:text-white"} ${dim ? "opacity-50" : ""}`;

  const sidebar = (
    <nav className="flex flex-col gap-1 p-3 h-full">
      <div className="px-3 py-3 text-sm font-medium tracking-tight flex items-center gap-2">
        <Mail size={16} /> TempMail
      </div>
      <div className="px-3 pt-2 pb-1 text-[11px] uppercase muted">Inbox</div>
      <Link href="/inbox" onClick={() => setOpen(false)} prefetch className={itemCls(pathname === "/inbox")}>
        <Inbox size={14} /> Tutte le caselle
      </Link>
      <div className="px-3 pt-4 pb-1 text-[11px] uppercase muted">Caselle</div>
      {isClient && settings.mailboxes.length === 0 && (
        <div className="px-3 py-2 text-xs muted">Nessuna casella. Creane una.</div>
      )}
      {isClient && settings.mailboxes.map(m => {
        const href = `/mailbox/${encodeURIComponent(m.address)}`;
        return (
          <Link key={m.address} href={href} onClick={() => setOpen(false)} prefetch className={itemCls(pathname === href, !m.active)}>
            <Mail size={14} />
            <span className="truncate">{m.label || m.address}</span>
          </Link>
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
        <span className="text-sm font-medium flex items-center gap-2"><Mail size={14} /> TempMail</span>
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
