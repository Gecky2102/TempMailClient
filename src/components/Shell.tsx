"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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

  const navItem = (href: string, label: string, active?: boolean) => (
    <Link
      key={href}
      href={href}
      onClick={() => setOpen(false)}
      className={`block px-3 py-2 rounded-md text-sm ${pathname === href ? "bg-[var(--bg-elev)] text-white" : "muted hover:bg-[var(--bg-elev)] hover:text-white"} ${active === false ? "opacity-50" : ""}`}
    >
      {label}
    </Link>
  );

  const sidebar = (
    <nav className="flex flex-col gap-1 p-3 h-full">
      <div className="px-3 py-3 text-sm font-medium tracking-tight">TempMail</div>
      <div className="px-3 pt-2 pb-1 text-[11px] uppercase muted">Inbox</div>
      {navItem("/inbox", "Tutte le caselle")}
      <div className="px-3 pt-4 pb-1 text-[11px] uppercase muted">Caselle</div>
      {isClient && settings.mailboxes.length === 0 && (
        <div className="px-3 py-2 text-xs muted">Nessuna casella. Creane una.</div>
      )}
      {isClient && settings.mailboxes.map(m =>
        navItem(`/mailbox/${encodeURIComponent(m.address)}`, m.label || m.address, m.active)
      )}
      <div className="mt-auto flex flex-col gap-1 pt-3">
        {navItem("/settings", "Impostazioni")}
        <button onClick={logout} className="block text-left px-3 py-2 rounded-md text-sm muted hover:bg-[var(--bg-elev)] hover:text-white">
          Esci
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-sm font-medium">TempMail</span>
        <button className="btn" onClick={() => setOpen(o => !o)} aria-label="menu">
          {open ? "Chiudi" : "Menu"}
        </button>
      </header>
      <aside className={`${open ? "block" : "hidden"} md:block md:w-64 md:border-r`} style={{ borderColor: "var(--border)" }}>
        {sidebar}
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
