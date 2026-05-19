"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { settings as store, useSettings, useIsClient } from "@/lib/store";

type Toast = { kind: "ok" | "err"; msg: string } | null;

function useToast() {
  const [toast, setToast] = useState<Toast>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, setToast };
}

function ToastView({ toast }: { toast: Toast }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`text-xs px-2 py-1 rounded-md inline-flex ${toast.kind === "ok" ? "text-green-400" : "text-red-400"}`}
      style={{ background: "var(--bg-elev)" }}
    >
      {toast.msg}
    </div>
  );
}

function randomLocal(len = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += chars[buf[i] % chars.length];
  return s;
}

const DOMAIN_RE = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const LOCAL_RE = /^[a-z0-9._+-]{1,64}$/;

function PollingSection() {
  const s = useSettings();
  const [val, setVal] = useState<string>(String(s.pollIntervalSec));
  const { toast, setToast } = useToast();
  useEffect(() => { setVal(String(s.pollIntervalSec)); }, [s.pollIntervalSec]);

  const dirty = val.trim() !== String(s.pollIntervalSec);

  function save() {
    const trimmed = val.trim();
    if (trimmed === "") { setToast({ kind: "err", msg: "Inserisci un numero" }); return; }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) { setToast({ kind: "err", msg: "Deve essere un intero" }); return; }
    if (n < 5) { setToast({ kind: "err", msg: "Minimo 5 secondi" }); return; }
    if (n > 3600) { setToast({ kind: "err", msg: "Massimo 3600 secondi" }); return; }
    store.setInterval(n);
    setToast({ kind: "ok", msg: "Salvato" });
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium mb-1">Polling</h2>
      <p className="text-xs muted mb-3">Intervallo aggiornamento (5–3600 s). Catchmail consente max 1 req/s.</p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          inputMode="numeric"
          className="input max-w-[120px]"
          value={val}
          onChange={e => setVal(e.target.value.replace(/[^\d]/g, ""))}
        />
        <span className="text-sm muted">secondi</span>
        <button className="btn btn-primary ml-auto" onClick={save} disabled={!dirty}>Salva</button>
        <ToastView toast={toast} />
      </div>
    </section>
  );
}

function DomainsSection() {
  const s = useSettings();
  const [list, setList] = useState<string[]>(s.domains);
  const [input, setInput] = useState("");
  const { toast, setToast } = useToast();
  useEffect(() => { setList(s.domains); }, [s.domains]);

  const dirty = JSON.stringify(list) !== JSON.stringify(s.domains);

  function add() {
    const v = input.trim().toLowerCase().replace(/^@/, "");
    if (!v) { setToast({ kind: "err", msg: "Inserisci un dominio" }); return; }
    if (!DOMAIN_RE.test(v)) { setToast({ kind: "err", msg: "Dominio non valido" }); return; }
    if (list.includes(v)) { setToast({ kind: "err", msg: "Già presente" }); return; }
    setList([...list, v]);
    setInput("");
  }

  function save() {
    if (list.length === 0) { setToast({ kind: "err", msg: "Serve almeno un dominio" }); return; }
    store.setDomains(list);
    setToast({ kind: "ok", msg: "Salvato" });
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium mb-1">Domini</h2>
      <p className="text-xs muted mb-3">Domini su cui creare caselle. Il primo è il predefinito.</p>
      <ul className="flex flex-col gap-1 mb-3">
        {list.map(d => (
          <li key={d} className="flex items-center justify-between text-sm px-3 py-2 rounded-md" style={{ background: "var(--bg-elev)" }}>
            <span>{d}</span>
            <button className="btn btn-danger" onClick={() => setList(list.filter(x => x !== d))}>Rimuovi</button>
          </li>
        ))}
        {list.length === 0 && <li className="text-xs muted">Nessun dominio.</li>}
      </ul>
      <div className="flex gap-2">
        <input className="input" placeholder="es. mail.example.com" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} />
        <button className="btn" onClick={add}>Aggiungi</button>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button className="btn btn-primary" onClick={save} disabled={!dirty}>Salva</button>
        <ToastView toast={toast} />
      </div>
    </section>
  );
}

function CreateMailboxSection() {
  const s = useSettings();
  const [local, setLocal] = useState("");
  const [domain, setDomain] = useState(s.domains[0] || "");
  const [label, setLabel] = useState("");
  const { toast, setToast } = useToast();
  useEffect(() => { if (!s.domains.includes(domain) && s.domains[0]) setDomain(s.domains[0]); }, [s.domains, domain]);

  function suggest() {
    setLocal(randomLocal());
    if (!domain && s.domains[0]) setDomain(s.domains[0]);
  }

  function save() {
    const l = local.trim().toLowerCase();
    if (!l) { setToast({ kind: "err", msg: "Inserisci il nome locale" }); return; }
    if (!LOCAL_RE.test(l)) { setToast({ kind: "err", msg: "Nome locale non valido" }); return; }
    if (!domain) { setToast({ kind: "err", msg: "Seleziona un dominio" }); return; }
    const addr = `${l}@${domain}`;
    if (s.mailboxes.some(m => m.address.toLowerCase() === addr)) {
      setToast({ kind: "err", msg: "Casella già esistente" });
      return;
    }
    store.addMailbox(addr, label.trim() || undefined);
    setLocal(""); setLabel("");
    setToast({ kind: "ok", msg: `Creata ${addr}` });
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium mb-1">Crea casella</h2>
      <p className="text-xs muted mb-3">&quot;Suggerisci&quot; genera un nome casuale sul dominio predefinito.</p>
      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <input className="input" placeholder="nome-locale" value={local} onChange={e => setLocal(e.target.value.toLowerCase())} />
        <span className="text-center muted">@</span>
        <select className="input" value={domain} onChange={e => setDomain(e.target.value)} disabled={s.domains.length === 0}>
          {s.domains.length === 0 && <option value="">— nessun dominio —</option>}
          {s.domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <input className="input mt-2" placeholder="Etichetta (opzionale)" value={label} onChange={e => setLabel(e.target.value)} />
      <div className="flex gap-2 mt-3 items-center">
        <button className="btn" onClick={suggest}>Suggerisci</button>
        <button className="btn btn-primary ml-auto" onClick={save}>Salva</button>
        <ToastView toast={toast} />
      </div>
    </section>
  );
}

function MailboxesSection() {
  const s = useSettings();
  const [draft, setDraft] = useState(s.mailboxes);
  const { toast, setToast } = useToast();
  useEffect(() => { setDraft(s.mailboxes); }, [s.mailboxes]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(s.mailboxes);

  function save() {
    store.set(prev => ({ ...prev, mailboxes: draft }));
    setToast({ kind: "ok", msg: "Salvato" });
  }

  return (
    <section className="card p-4">
      <div className="flex items-center mb-3">
        <h2 className="text-sm font-medium">Caselle ({draft.length})</h2>
        <button className="btn btn-primary ml-auto" onClick={save} disabled={!dirty}>Salva</button>
      </div>
      <div className="mb-2"><ToastView toast={toast} /></div>
      {draft.length === 0 && <div className="text-sm muted">Nessuna casella.</div>}
      <ul className="flex flex-col gap-2">
        {draft.map(m => (
          <li key={m.address} className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-md" style={{ background: "var(--bg-elev)" }}>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={m.active}
                onChange={() => setDraft(draft.map(x => x.address === m.address ? { ...x, active: !x.active } : x))}
              />
              <span className={m.active ? "" : "muted"}>{m.label ? `${m.label} — ` : ""}{m.address}</span>
            </label>
            <span className="text-[10px] muted ml-auto">{m.active ? "attiva" : "disattivata"}</span>
            <button
              className="btn btn-danger"
              onClick={() => { if (confirm(`Rimuovere ${m.address} dalla lista? (salva per confermare)`)) setDraft(draft.filter(x => x.address !== m.address)); }}
            >Rimuovi</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SettingsPage() {
  const isClient = useIsClient();
  if (!isClient) return <Shell><div className="p-4 muted text-sm">Caricamento…</div></Shell>;
  return (
    <Shell>
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-base font-medium">Impostazioni</h1>
      </div>
      <div className="p-4 grid gap-6 max-w-3xl">
        <PollingSection />
        <DomainsSection />
        <CreateMailboxSection />
        <MailboxesSection />
      </div>
    </Shell>
  );
}
