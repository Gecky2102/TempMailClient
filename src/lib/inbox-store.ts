"use client";
import { useSyncExternalStore } from "react";
import { settings as s, pinKey, subscribeSettings } from "@/lib/store";
import { showNotification, playBeep } from "@/lib/notify";
import type { MessageSummary } from "@/lib/catchmail";

export type Row = MessageSummary & { _mailbox: string };

type State = {
  byBox: Record<string, Row[]>;
  errors: Record<string, string>;
  loading: boolean;
  lastFetch: number | null;
};

let state: State = { byBox: {}, errors: {}, loading: false, lastFetch: null };
type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach(l => l()); }
function setState(p: Partial<State>) { state = { ...state, ...p }; emit(); }

const seenIds = new Set<string>();
let firstFetchDone = false;
let aborter: AbortController | null = null;
let inflight = false;
let interval: ReturnType<typeof setInterval> | null = null;

export function getInboxState(): State { return state; }
export function subscribeInbox(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }

export function useInbox(): State {
  return useSyncExternalStore(subscribeInbox, getInboxState, () => state);
}

export async function refreshInbox() {
  if (inflight) return;
  inflight = true;
  aborter?.abort();
  const ac = new AbortController();
  aborter = ac;
  const settings = s.get();
  const targets = settings.mailboxes.filter(m => m.active);
  if (targets.length === 0) {
    setState({ byBox: {}, errors: {}, loading: false });
    inflight = false;
    return;
  }
  setState({ loading: true });
  const newRows: Row[] = [];
  try {
    for (const m of targets) {
      if (ac.signal.aborted) return;
      try {
        const r = await fetch(`/api/mailbox?address=${encodeURIComponent(m.address)}`, { cache: "no-store", signal: ac.signal });
        const j = await r.json();
        if (!r.ok) {
          setState({ errors: { ...state.errors, [m.address]: j.error || "errore" } });
          continue;
        }
        const fresh: Row[] = (j.messages as MessageSummary[]).map(x => ({ ...x, _mailbox: m.address }));
        for (const row of fresh) {
          const k = pinKey(row._mailbox, row.id);
          if (!seenIds.has(k)) newRows.push(row);
        }
        const newErrors = { ...state.errors }; delete newErrors[m.address];
        setState({ byBox: { ...state.byBox, [m.address]: fresh }, errors: newErrors });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setState({ errors: { ...state.errors, [m.address]: e instanceof Error ? e.message : "errore" } });
      }
      if (targets.length > 1) await new Promise(res => setTimeout(res, 1100));
    }
    if (ac.signal.aborted) return;
    setState({ lastFetch: Date.now() });

    if (firstFetchDone && newRows.length > 0) {
      const readSet = new Set(s.get().read);
      const unread = newRows.filter(r => !readSet.has(pinKey(r._mailbox, r.id)));
      if (unread.length > 0) {
        const cur = s.get();
        if (cur.notifications) {
          if (unread.length === 1) {
            const r = unread[0];
            showNotification(`Nuova mail da ${r.from}`, r.subject || "(nessun oggetto)", r._mailbox);
          } else {
            showNotification(`${unread.length} nuove mail`, unread.map(r => r.from).slice(0, 3).join(", "), "batch");
          }
        }
        if (cur.sound) playBeep();
      }
    }
    for (const r of newRows) seenIds.add(pinKey(r._mailbox, r.id));
    firstFetchDone = true;
  } finally {
    if (!ac.signal.aborted) setState({ loading: false });
    inflight = false;
  }
}

let started = false;
export function startInboxPolling() {
  if (started || typeof window === "undefined") return;
  started = true;

  const restart = () => {
    if (interval) clearInterval(interval);
    const base = Math.max(5, s.get().pollIntervalSec);
    const ms = (document.hidden ? base * 3 : base) * 1000;
    interval = setInterval(refreshInbox, ms);
  };

  let lastPoll = s.get().pollIntervalSec;
  let lastActives = s.get().mailboxes.filter(m => m.active).map(m => m.address).join("|");
  const unsub = subscribeSettings(() => {
    const cur = s.get();
    const actives = cur.mailboxes.filter(m => m.active).map(m => m.address).join("|");
    if (cur.pollIntervalSec !== lastPoll) { lastPoll = cur.pollIntervalSec; restart(); }
    if (actives !== lastActives) {
      lastActives = actives;
      seenIds.clear();
      firstFetchDone = false;
      refreshInbox();
    }
  });

  const onVis = () => { if (!document.hidden) refreshInbox(); restart(); };
  const onFocus = () => { refreshInbox(); };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("focus", onFocus);

  refreshInbox();
  restart();

  window.addEventListener("beforeunload", () => {
    if (interval) clearInterval(interval);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("focus", onFocus);
    unsub();
  });
}
