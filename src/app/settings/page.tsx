"use client";
import { useState } from "react";
import Shell from "@/components/Shell";
import { settings as store, useSettings, useIsClient } from "@/lib/store";

function randomLocal(len = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += chars[buf[i] % chars.length];
  return s;
}

export default function SettingsPage() {
  const s = useSettings();
  const isClient = useIsClient();
  const [domainInput, setDomainInput] = useState("");
  const [newLocal, setNewLocal] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newLabel, setNewLabel] = useState("");

  if (!isClient) return <Shell><div className="p-4 muted text-sm">Caricamento…</div></Shell>;

  const activeDomain = newDomain || s.domains[0] || "";

  function suggest() {
    setNewLocal(randomLocal());
    if (!newDomain && s.domains[0]) setNewDomain(s.domains[0]);
  }

  function createMailbox() {
    if (!newLocal || !activeDomain) return;
    const addr = `${newLocal}@${activeDomain}`.toLowerCase();
    store.addMailbox(addr, newLabel || undefined);
    setNewLocal(""); setNewLabel("");
  }

  return (
    <Shell>
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-base font-medium">Impostazioni</h1>
      </div>

      <div className="p-4 grid gap-6 max-w-3xl">
        <section className="card p-4">
          <h2 className="text-sm font-medium mb-1">Polling</h2>
          <p className="text-xs muted mb-3">Intervallo di aggiornamento delle caselle attive (min 5s, rate-limit Catchmail 1 req/s).</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              className="input max-w-[120px]"
              value={s.pollIntervalSec}
              onChange={e => store.setInterval(Number(e.target.value) || 30)}
            />
            <span className="text-sm muted">secondi</span>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-medium mb-1">Domini</h2>
          <p className="text-xs muted mb-3">Domini su cui creare caselle. Il primo è il predefinito.</p>
          <ul className="flex flex-col gap-1 mb-3">
            {s.domains.map(d => (
              <li key={d} className="flex items-center justify-between text-sm px-3 py-2 rounded-md" style={{ background: "var(--bg-elev)" }}>
                <span>{d}</span>
                <button className="btn btn-danger" onClick={() => store.setDomains(s.domains.filter(x => x !== d))}>Rimuovi</button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input className="input" placeholder="es. mail.example.com" value={domainInput} onChange={e => setDomainInput(e.target.value)} />
            <button
              className="btn btn-primary"
              onClick={() => {
                const v = domainInput.trim().toLowerCase().replace(/^@/, "");
                if (v && !s.domains.includes(v)) store.setDomains([...s.domains, v]);
                setDomainInput("");
              }}
            >Aggiungi</button>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-medium mb-1">Crea casella</h2>
          <p className="text-xs muted mb-3">Suggerimento: usa &quot;Suggerisci&quot; per generare un nome casuale sul dominio predefinito.</p>
          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <input className="input" placeholder="nome-locale" value={newLocal} onChange={e => setNewLocal(e.target.value.toLowerCase())} />
            <span className="text-center muted">@</span>
            <select className="input" value={activeDomain} onChange={e => setNewDomain(e.target.value)}>
              {s.domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <input className="input mt-2" placeholder="Etichetta (opzionale)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
          <div className="flex gap-2 mt-3">
            <button className="btn" onClick={suggest}>Suggerisci</button>
            <button className="btn btn-primary" onClick={createMailbox} disabled={!newLocal || !activeDomain}>Crea</button>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-medium mb-3">Caselle ({s.mailboxes.length})</h2>
          {s.mailboxes.length === 0 && <div className="text-sm muted">Nessuna casella.</div>}
          <ul className="flex flex-col gap-2">
            {s.mailboxes.map(m => (
              <li key={m.address} className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-md" style={{ background: "var(--bg-elev)" }}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={m.active} onChange={() => store.toggleMailbox(m.address)} />
                  <span className={m.active ? "" : "muted"}>{m.label ? `${m.label} — ` : ""}{m.address}</span>
                </label>
                <span className="text-[10px] muted ml-auto">{m.active ? "attiva" : "disattivata"}</span>
                <button className="btn btn-danger" onClick={() => { if (confirm(`Eliminare ${m.address}?`)) store.removeMailbox(m.address); }}>Rimuovi</button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
