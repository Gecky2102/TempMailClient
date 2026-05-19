"use client";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Plus, Save, AlertCircle, X, RotateCcw, ChevronDown, ChevronRight, Info, Copy } from "lucide-react";
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

type Draft = { pollSec: string; domains: string[]; mailboxes: Mailbox[] };
const toDraft = (s: Settings): Draft => ({
  pollSec: String(s.pollIntervalSec),
  domains: [...s.domains],
  mailboxes: s.mailboxes.map(m => ({ ...m })),
});
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function CopyBtn({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch {}
      }}
      className="muted hover:text-white p-1 text-[10px]"
      aria-label="copia"
      title="copia"
    >
      {done ? <span className="text-green-400">copiato</span> : <Copy size={12} />}
    </button>
  );
}

function Toggle({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
      style={{
        background: checked ? "var(--text)" : "var(--bg-elev)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
        style={{
          background: checked ? "var(--bg)" : "var(--text-dim)",
          transform: `translateX(${checked ? "18px" : "3px"})`,
        }}
      />
    </button>
  );
}

function DomainHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Info size={12} className="muted" />
        <span>Come collegare un dominio a Catchmail</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 text-xs leading-relaxed flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="muted">
            Per ricevere posta su un tuo dominio (es. <code className="px-1 rounded" style={{ background: "var(--bg-elev)" }}>mail.example.com</code>),
            devi puntare i record MX a Catchmail dal pannello DNS del tuo provider (Cloudflare, OVH, Aruba, ecc.).
          </p>

          <div>
            <div className="font-medium mb-1">1. Scegli il sottodominio</div>
            <p className="muted">
              Consigliato un sottodominio dedicato, es. <code className="px-1 rounded" style={{ background: "var(--bg-elev)" }}>mail.tuosito.com</code>.
              Le caselle saranno del tipo <code className="px-1 rounded" style={{ background: "var(--bg-elev)" }}>qualunque@mail.tuosito.com</code>.
            </p>
          </div>

          <div>
            <div className="font-medium mb-1">2. Aggiungi il record MX</div>
            <p className="muted mb-2">Nel pannello DNS crea un nuovo record con questi valori:</p>
            <div className="rounded-md overflow-x-auto" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
              <table className="text-[11px] w-full">
                <tbody>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-1.5 muted w-32">Tipo</td>
                    <td className="px-3 py-1.5 flex items-center gap-2"><code>MX</code> <CopyBtn value="MX" /></td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-1.5 muted">Nome / Host</td>
                    <td className="px-3 py-1.5 flex items-center gap-2"><code>mail</code> <CopyBtn value="mail" /> <span className="muted">(il sottodominio, o <code>@</code> per la root)</span></td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-1.5 muted">Server di posta</td>
                    <td className="px-3 py-1.5 flex items-center gap-2"><code>smtp.catchmail.io</code> <CopyBtn value="smtp.catchmail.io" /></td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-1.5 muted">Priorità</td>
                    <td className="px-3 py-1.5 flex items-center gap-2"><code>10</code> <CopyBtn value="10" /></td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 muted">TTL</td>
                    <td className="px-3 py-1.5"><code>Auto</code> <span className="muted">(o 3600)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="muted mt-2">
              Se usi Cloudflare disattiva il proxy (nuvoletta grigia, <em>Solo DNS</em>) — i record MX non possono essere proxati.
            </p>
          </div>

          <div>
            <div className="font-medium mb-1">3. Attendi la propagazione</div>
            <p className="muted">
              Da pochi minuti fino a qualche ora. Verifica con <code className="px-1 rounded" style={{ background: "var(--bg-elev)" }}>dig MX mail.tuosito.com</code> o un controllo MX online.
            </p>
          </div>

          <div>
            <div className="font-medium mb-1">4. Aggiungi il dominio qui sotto</div>
            <p className="muted">
              Inserisci il dominio completo (es. <code className="px-1 rounded" style={{ background: "var(--bg-elev)" }}>mail.tuosito.com</code>) nel campo e premi <em>Aggiungi</em>, poi <em>Salva</em>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        {hint && <p className="text-xs muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const isClient = useIsClient();
  const s = useSettings();
  const initial = useMemo(() => toDraft(s), [s]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);

  const [domainInput, setDomainInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newLocal, setNewLocal] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => { setDraft(toDraft(s)); }, [s]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(0), 2200);
    return () => clearTimeout(t);
  }, [savedAt]);

  const dirty = !eq(draft, initial);

  function validate(): string | null {
    const t = draft.pollSec.trim();
    if (t === "") return "Polling: inserisci un numero";
    const n = Number(t);
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
    store.set(prev => ({
      ...prev,
      pollIntervalSec: Number(draft.pollSec.trim()),
      domains: [...draft.domains],
      mailboxes: draft.mailboxes.map(m => ({ ...m })),
    }));
    setSavedAt(Date.now());
  }

  function reset() { setDraft(toDraft(s)); setError(null); }

  function addDomain() {
    const v = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!v) return;
    if (draft.domains.includes(v)) { setError("Dominio già presente"); return; }
    if (!DOMAIN_RE.test(v)) { setError("Dominio non valido"); return; }
    setError(null);
    setDraft(d => ({ ...d, domains: [...d.domains, v] }));
    setDomainInput("");
  }

  function makeDefault(d: string) {
    setDraft(x => ({ ...x, domains: [d, ...x.domains.filter(y => y !== d)] }));
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
    setDraft(d => ({ ...d, mailboxes: [{ address: addr, label: newLabel.trim() || undefined, active: true, createdAt: Date.now() }, ...d.mailboxes] }));
    setNewLocal(""); setNewLabel(""); setShowCreate(false);
  }

  function commitEditLabel(addr: string) {
    const lbl = editLabel.trim() || undefined;
    setDraft(d => ({ ...d, mailboxes: d.mailboxes.map(m => m.address === addr ? { ...m, label: lbl } : m) }));
    setEditing(null);
  }

  if (!isClient) return <Shell><div className="p-4 muted text-sm">Caricamento…</div></Shell>;

  const activeCount = draft.mailboxes.filter(m => m.active).length;

  return (
    <Shell>
      <div className="sticky top-0 z-10 border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
          <h1 className="text-base font-medium">Impostazioni</h1>
          <span className="text-xs muted">{activeCount}/{draft.mailboxes.length} attive · {draft.domains.length} domini</span>
          <div className="ml-auto flex items-center gap-2">
            {error && (
              <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {error}</span>
            )}
            {!error && savedAt > 0 && !dirty && (
              <span className="text-xs text-green-400">Salvato</span>
            )}
            {dirty && (
              <>
                <button onClick={reset} className="btn" aria-label="annulla modifiche">
                  <RotateCcw size={12} className="mr-1" /> Annulla
                </button>
                <button onClick={save} className="btn btn-primary">
                  <Save size={14} className="mr-1.5" /> Salva
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl flex flex-col gap-8">

        <Section title="Polling" hint="Intervallo di aggiornamento delle caselle attive. Catchmail consente 1 richiesta al secondo.">
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              className="input max-w-[120px]"
              value={draft.pollSec}
              onChange={e => setDraft(d => ({ ...d, pollSec: e.target.value.replace(/[^\d]/g, "") }))}
              placeholder="30"
            />
            <span className="text-sm muted">secondi <span className="text-[10px]">(5–3600)</span></span>
          </div>
        </Section>

        <Section title="Domini" hint="Il primo è il predefinito quando crei una casella. Clicca su un dominio per renderlo predefinito.">
          <DomainHelp />
          {draft.domains.length > 0 && (
            <ul className="flex flex-col rounded-md overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {draft.domains.map((d, i) => (
                <li
                  key={d}
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${i > 0 ? "border-t" : ""}`}
                  style={{ borderColor: "var(--border)" }}
                >
                  <button
                    type="button"
                    onClick={() => makeDefault(d)}
                    className="flex-1 text-left truncate"
                  >
                    {d}
                  </button>
                  {i === 0 && (
                    <span className="text-[10px] uppercase tracking-wide muted">predefinito</span>
                  )}
                  <button
                    onClick={() => setDraft(x => ({ ...x, domains: x.domains.filter(y => y !== d) }))}
                    className="muted hover:text-red-400 p-1"
                    aria-label={`rimuovi ${d}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="es. mail.example.com"
              value={domainInput}
              onChange={e => setDomainInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDomain())}
            />
            <button className="btn" onClick={addDomain}><Plus size={12} className="mr-1" /> Aggiungi</button>
          </div>
        </Section>

        <Section title={`Caselle (${draft.mailboxes.length})`} hint="Solo le caselle attive vengono interrogate. Clicca l'etichetta per modificarla.">
          {!showCreate ? (
            <button className="btn self-start" onClick={() => { setShowCreate(true); setNewLocal(randomLocal()); if (!newDomain && draft.domains[0]) setNewDomain(draft.domains[0]); }}>
              <Plus size={12} className="mr-1" /> Nuova casella
            </button>
          ) : (
            <div className="card p-3 flex flex-col gap-2">
              <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <input className="input" placeholder="nome-locale" value={newLocal} onChange={e => setNewLocal(e.target.value.toLowerCase())} />
                <span className="text-center muted">@</span>
                <select className="input" value={newDomain || draft.domains[0] || ""} onChange={e => setNewDomain(e.target.value)} disabled={draft.domains.length === 0}>
                  {draft.domains.length === 0 && <option value="">— nessun dominio —</option>}
                  {draft.domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <input className="input" placeholder="Etichetta (opzionale)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
              <div className="flex gap-2 flex-wrap">
                <button className="btn" onClick={() => setNewLocal(randomLocal())}>Genera nome</button>
                <button className="btn ml-auto" onClick={() => { setShowCreate(false); setNewLocal(""); setNewLabel(""); }}>Annulla</button>
                <button className="btn btn-primary" onClick={addMailbox}>Aggiungi</button>
              </div>
            </div>
          )}

          {draft.mailboxes.length === 0 ? (
            <div className="text-sm muted">Nessuna casella.</div>
          ) : (
            <ul className="flex flex-col rounded-md overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {draft.mailboxes.map((m, i) => (
                <li
                  key={m.address}
                  className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t" : ""}`}
                  style={{ borderColor: "var(--border)", background: m.active ? "transparent" : "rgba(0,0,0,0.15)" }}
                >
                  <Toggle
                    checked={m.active}
                    onChange={() => setDraft(d => ({ ...d, mailboxes: d.mailboxes.map(x => x.address === m.address ? { ...x, active: !x.active } : x) }))}
                    ariaLabel={`attiva ${m.address}`}
                  />
                  <div className="flex-1 min-w-0">
                    {editing === m.address ? (
                      <input
                        autoFocus
                        className="input !py-1 text-sm"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onBlur={() => commitEditLabel(m.address)}
                        onKeyDown={e => {
                          if (e.key === "Enter") commitEditLabel(m.address);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        placeholder="Etichetta"
                      />
                    ) : (
                      <button
                        className="block text-left w-full"
                        onClick={() => { setEditing(m.address); setEditLabel(m.label || ""); }}
                      >
                        <div className={`text-sm truncate ${m.active ? "" : "muted"}`}>
                          {m.label || <span className="muted italic">senza etichetta</span>}
                        </div>
                        <div className="text-[11px] muted truncate">{m.address}</div>
                      </button>
                    )}
                  </div>
                  <button
                    className="muted hover:text-red-400 p-1"
                    onClick={() => setDraft(d => ({ ...d, mailboxes: d.mailboxes.filter(x => x.address !== m.address) }))}
                    aria-label="rimuovi"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </Shell>
  );
}
