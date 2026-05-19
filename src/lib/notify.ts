export function notifySupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notifySupported()) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  return await Notification.requestPermission();
}

export function showNotification(title: string, body: string, tag?: string) {
  if (!notifySupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, tag, icon: "/icon.svg" });
    setTimeout(() => n.close(), 8000);
  } catch {}
}

let audioCtx: AudioContext | null = null;
export function playBeep() {
  if (typeof window === "undefined") return;
  try {
    if (!audioCtx) {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      audioCtx = new AC();
    }
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {}
}
