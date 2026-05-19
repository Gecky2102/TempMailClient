"use client";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Plus, Wand2, Save, Check, AlertCircle } from "lucide-react";
import Shell from "@/components/Shell";
import { settings as store, useSettings, useIsClient, type Mailbox, type Settings } from "@/lib/store";

const DOMAIN_RE = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const LOCAL_RE = /^[a-z0-9._+-]{1,64}$/;

function randomLocal(len = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const buf = new Uint8Array(len); crypto.getRandomValues(buf);
  let s = ""; for (let i = 0; i < len; i++) s += chars[buf[i] % chars.length];
  return s;
}

type Draft = {
  pollSec: string;
  domains: string[];
  mailboxes: Mailbox[];
};

function toDraft(s: Settings): Draft {
  return { pollSec: String(s.pollIntervalSec), domains: [...s.domains], mailboxes: s.mailboxes.map(m => ({ ...m })) };
}

function deepEq(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }

export default function SettingsPage() {
  const isClient = useIsClient();
  const s = useSettings();
  const initial = useMemo(() => toDraft(s), [s]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [savedTick, setSavedTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [domainInput, setDomainInput] = useState("");
  const [newLocal, setNewLocal] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => { setDraft(toDraft(s)); }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!draft.domains.includes(newDomain) && draft.domains[0]) setNewDomain(draft.domains[0]);
  }, [draft.domains, newDomain]);

  const dirty = !deepEq(draft, initial);

  function validate(): string | null {
    const trimmed = draft.pollSec.trim();
    if (trimmed === "") return "Polling: inserisci un numero";
    const n = Number(trimmed);
    if (!Number.isInteger(n)) return "Polling: deve essere un intero";
    if (n < 5) return "Polling: minimo 5 secondi";
    if (n > 3600) return "Polling: massimo 3600 secondi";
    if (draft.domains.length === 0) return "Serve almeno un dominio";
    for (const d of draft.domains) if (!DOMAIN_RE.test(d)) return `Dominio non valido: ${d}`;
    const seen = new Set<string>();
    for (const m of draft.mailboxes) {
      const a = m.address.toLowerCase();
      if (seen.has(a)) return `Casella duplicata: ${a}`;
      seen.add(a);
    }
    return null;
  }

  function save() {
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    const n = Number(draft.pollSec.trim());
    store.set(prev => ({ ...prev, pollIntervalSec: n, domains: [...draft.domains], mailboxes: draft.mailboxes.map(m => ({ ...m })) }));
    setSavedTick(t => t + 1);
  }

  useEffect(() => {
    if (!savedTick) return;
    const t = setTimeout(() => setSavedTick(0), 2200);
    return () => clearTimeout(t);
  }, [savedTick]);

  function addDomain() {
    const v = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!v) return;
    if (draft.domains.includes(v)) { setError("Dominio già presente"); return; }
    if (!DOMAIN_RE.test(v)) { setError("Dominio non valido"); return; }
    setError(null);
    setDraft(d => ({ ...d, domains: [...d.domains, v] }));
    setDomainInput("");
  }

  function addMailbox() {
    const l = newLocal.trim().toLowerCase();
    const dom = newDomain || draft.domains[0];
    if (!l) { setError("Nome locale mancante"); return; }
    if (!LOCAL_RE.test(l)) { setError("Nome locale non valido"); return; }
    if (!dom) { setError("Seleziona un dominio"); return; }
    const addr = `${l}@${dom}`;
    if (draft.mailboxes.some(m => m.address.toLowerCase() === addr)) { setError("Casella già esistente"); return; }
    setError(null);
    setDraft(d => ({ ...d, mailboxes: [...d.mailboxes, { address: addr, label: newLabel.trim() || undefined, active: true, createdAt: Date.now() }] }));
    setNewLocal(""); setNewLabel("");
  }

  if (!isClient) return <Shell><div className="p-4 muted text-sm">Caricamento…</div></Shell>;

  return (
    <Shell>
      <div className="border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
        <h1 className="text-base font-medium">Impostazioni</h1>
        {error && (
          <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {error}</span>
        )}
        {savedTick > 0 && !dirty && (
          <span className="text-xs text-green-400 flex items-center gap-1"><Check size={12} /> Salvato</span>
        )}
        {dirty && (
          <button onClick={save} className="btn btn-primary ml-auto">
            <Save size={14} className="mr-1.5" /> Salva
          </button>
        )}
      </div>

      <div className="p-4 grid gap-6 max-w-3xl">
        <section className="card p-4">
          <h2 className="text-sm font-medium mb-1">Polling</h2>
          <p className="text-xs muted mb-3">Intervallo aggiornamento (5–3600 s). Catchmail consente max 1 req/s.</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              className="input max-w-[120px]"
              value={draft.pollSec}
              onChange={e => setDraft(d => ({ ...d, pollSec: e.target.value.replace(/[^\d]/g, "") }))}
            />
            <span className="text-sm muted">secondi</span>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-medium mb-1">Domini</h2>
          <p className="text-xs muted mb-3">Il primo è il predefinito.</p>
          <ul className="flex flex-col gap-1 mb-3">
            {draft.domains.map(d => (
              <li key={d} className="flex items-center justify-between text-sm px-3 py-2 rounded-md" style={{ background: "var(--bg-elev)" }}>
                <span>{d}</span>
                <button className="btn btn-danger" onClick={() => setDraft(x => ({ ...x, domains: x.domains.filter(y => y !== d) }))}>
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
            {draft.domains.length === 0 && <li className="text-xs muted">Nessun dominio.</li>}
          </ul>
          <div className="flex gap-2">
            <input className="input" placeholder="es. mail.example.com" value={domainInput} onChange={e => setDomainInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDomain())} />
            <button className="btn" onClick={addDomain}><Plus size={12} className="mr-1" /> Aggiungi</button>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-medium mb-1">Crea casella</h2>
          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <input className="input" placeholder="nome-locale" value={newLocal} onChange={e => setNewLocal(e.target.value.toLowerCase())} />
            <span className="text-center muted">@</span>
            <select className="input" value={newDomain || draft.domains[0] || ""} onChange={e => setNewDomain(e.target.value)} disabled={draft.domains.length === 0}>
              {draft.domains.length === 0 && <option value="">— nessun dominio —</option>}
              {draft.domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <input className="input mt-2" placeholder="Etichetta (opzionale)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
          <div className="flex gap-2 mt-3">
            <button className="btn" onClick={() => { setNewLocal(randomLocal()); if (!newDomain && draft.domains[0]) setNewDomain(draft.domains[0]); }}>
              <Wand2 size={12} className="mr-1" /> Suggerisci
            </button>
            <button className="btn" onClick={addMailbox}><Plus size={12} className="mr-1" /> Aggiungi</button>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-medium mb-3">Caselle ({draft.mailboxes.length})</h2>
          {draft.mailboxes.length === 0 && <div className="text-sm muted">Nessuna casella.</div>}
          <ul className="flex flex-col gap-2">
            {draft.mailboxes.map(m => (
              <li key={m.address} className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-md" style={{ background: "var(--bg-elev)" }}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.active}
                    onChange={() => setDraft(d => ({ ...d, mailboxes: d.mailboxes.map(x => x.address === m.address ? { ...x, active: !x.active } : x) }))}
                  />
                  <span className={m.active ? "" : "muted"}>{m.label ? `${m.label} — ` : ""}{m.address}</span>
                </label>
                <span className="text-[10px] muted ml-auto">{m.active ? "attiva" : "disattivata"}</span>
                <button
                  className="btn btn-danger"
                  onClick={() => setDraft(d => ({ ...d, mailboxes: d.mailboxes.filter(x => x.address !== m.address) }))}
                  aria-label="rimuovi"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
