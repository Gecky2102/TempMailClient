"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error || "Errore");
        return;
      }
      router.replace("/inbox");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-medium">TempMail</h1>
          <p className="text-sm muted">Accedi per gestire le caselle</p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="muted text-xs">Email</span>
          <input className="input" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="muted text-xs">Password</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {err && <div className="text-xs text-red-400">{err}</div>}
        <button disabled={loading} className="btn btn-primary" type="submit">
          {loading ? "Accesso…" : "Accedi"}
        </button>
      </form>
    </div>
  );
}
