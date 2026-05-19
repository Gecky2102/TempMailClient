"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

export type Mailbox = {
  address: string;
  label?: string;
  active: boolean;
  createdAt: number;
};

export type Settings = {
  domains: string[];
  pollIntervalSec: number;
  mailboxes: Mailbox[];
};

const KEY = "tmc.settings.v1";

const defaults: Settings = {
  domains: ["mail.vantashop.tech"],
  pollIntervalSec: 30,
  mailboxes: [],
};

type Listener = () => void;
const listeners = new Set<Listener>();
let state: Settings | null = null;

function load(): Settings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      domains: Array.isArray(parsed.domains) && parsed.domains.length ? parsed.domains : defaults.domains,
      pollIntervalSec: typeof parsed.pollIntervalSec === "number" && parsed.pollIntervalSec >= 5 ? parsed.pollIntervalSec : defaults.pollIntervalSec,
      mailboxes: Array.isArray(parsed.mailboxes) ? parsed.mailboxes.filter((m): m is Mailbox => !!m && typeof m.address === "string") : [],
    };
  } catch {
    return defaults;
  }
}

function persist(s: Settings) {
  state = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  listeners.forEach(l => l());
}

function getSnapshot(): Settings {
  if (state === null) state = load();
  return state;
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }

export function useSettings() {
  return useSyncExternalStore(subscribe, getSnapshot, () => defaults);
}

export const settings = {
  get: () => getSnapshot(),
  set: (updater: (s: Settings) => Settings) => persist(updater(getSnapshot())),
  addMailbox: (address: string, label?: string) => {
    const s = getSnapshot();
    if (s.mailboxes.some(m => m.address.toLowerCase() === address.toLowerCase())) return;
    persist({ ...s, mailboxes: [...s.mailboxes, { address, label, active: true, createdAt: Date.now() }] });
  },
  removeMailbox: (address: string) => {
    const s = getSnapshot();
    persist({ ...s, mailboxes: s.mailboxes.filter(m => m.address !== address) });
  },
  toggleMailbox: (address: string) => {
    const s = getSnapshot();
    persist({ ...s, mailboxes: s.mailboxes.map(m => m.address === address ? { ...m, active: !m.active } : m) });
  },
  setDomains: (domains: string[]) => persist({ ...getSnapshot(), domains: domains.filter(Boolean) }),
  setInterval: (sec: number) => persist({ ...getSnapshot(), pollIntervalSec: Math.max(5, Math.floor(sec)) }),
};

export function useIsClient() {
  const [c, setC] = useState(false);
  useEffect(() => setC(true), []);
  return c;
}
