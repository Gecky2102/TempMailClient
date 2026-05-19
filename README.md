# TempMailClient

Client web minimale per [Catchmail](https://catchmail.io) — leggi le caselle temporanee di posta tramite la sua API pubblica, in un'unica interfaccia, senza dover andare ogni volta sul loro sito.

Single-user, pensato per essere deployato su Vercel in pochi minuti.

## Caratteristiche

- **Login protetto** con credenziali singole impostate via environment variable, sessione su cookie HMAC firmato.
- **Inbox unificata** che aggrega i messaggi di tutte le caselle attive, più una vista per singola casella.
- **Polling configurabile** (intervallo personalizzabile, 5–3600 s) che interroga solo le caselle marcate come attive — risparmi richieste API quando non ti servono.
- **Domini multipli**: imposta i tuoi domini, scegli il predefinito, suggerimento automatico del nome casella.
- **Pin dei messaggi** rilevanti: rimangono in cima alla lista (memorizzato localmente, l'API Catchmail non offre questa funzione).
- **Ricerca e paginazione** della lista messaggi.
- **HTML email sanificato** lato server con DOMPurify e renderizzato in un `iframe` completamente sandboxato — gli script delle email non vengono mai eseguiti.
- **Allegati** scaricabili tramite proxy server-side (host whitelisted, limite di dimensione).
- **Eliminazione messaggi** supportata (la API Catchmail accetta `DELETE`).
- **Mobile-first**, responsive, design dark minimale con font di sistema.

## Sicurezza

- CSP stringente, `X-Frame-Options DENY`, HSTS, `Referrer-Policy no-referrer`, Permissions-Policy, COOP/CORP.
- Brute-force protection sul login: 5 tentativi / 15 min, lock 15 min, confronto credenziali in tempo costante.
- CSRF: origin check su tutti i metodi non-GET delle API interne.
- SSRF: proxy attachment con whitelist host `api.catchmail.io`, solo HTTPS, niente redirect, limite 25 MB.
- XSS: HTML sanitizzato server-side + iframe `sandbox=""` (no scripts, no forms, no top-level navigation).

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [lucide-react](https://lucide.dev/) per le icone
- [isomorphic-dompurify](https://github.com/kkomelin/isomorphic-dompurify) (server-side)
- Persistenza impostazioni in `localStorage` (single-user, niente DB)

## Setup locale

```bash
git clone https://github.com/Gecky2102/TempMailClient.git
cd TempMailClient
cp .env.example .env.local
# imposta AUTH_EMAIL, AUTH_PASSWORD, SESSION_SECRET (>= 32 caratteri)
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

### Variabili d'ambiente

| Variabile         | Descrizione                                                                |
| ----------------- | -------------------------------------------------------------------------- |
| `AUTH_EMAIL`      | Email per il login al pannello.                                            |
| `AUTH_PASSWORD`   | Password per il login al pannello.                                         |
| `SESSION_SECRET`  | Segreto per firmare il cookie di sessione, almeno 32 caratteri casuali.    |

Genera il `SESSION_SECRET` con:

```bash
openssl rand -hex 32
```

## Deploy su Vercel

1. Fork o push della repo su GitHub.
2. Importa il progetto su [vercel.com](https://vercel.com).
3. Imposta le environment variable `AUTH_EMAIL`, `AUTH_PASSWORD`, `SESSION_SECRET`.
4. Deploy. Nessuna configurazione aggiuntiva richiesta.

## Collegare un dominio personalizzato a Catchmail

Per ricevere posta su un tuo dominio (es. `mail.tuosito.com`), aggiungi un record MX nel pannello DNS del tuo provider:

| Campo            | Valore                |
| ---------------- | --------------------- |
| Tipo             | `MX`                  |
| Nome / Host      | `mail` (o `@` per la root) |
| Server di posta  | `smtp.catchmail.io`   |
| Priorità         | `10`                  |
| TTL              | Auto / 3600           |

Se usi Cloudflare disattiva il proxy (Solo DNS, nuvoletta grigia). Attendi la propagazione (`dig MX mail.tuosito.com`), poi aggiungi il dominio dalla pagina **Impostazioni** dell'app.

Le stesse istruzioni sono disponibili in-app espandendo il pannello "Come collegare un dominio a Catchmail".

## Endpoint Catchmail utilizzati

- `GET  /api/v1/mailbox?address={addr}` — lista messaggi.
- `GET  /api/v1/message/{id}?mailbox={addr}` — dettaglio (headers, body text/html, allegati, badge sicurezza).
- `DELETE /api/v1/message/{id}?mailbox={addr}` — eliminazione.
- Rate limit ufficiale: 1 richiesta/secondo per IP (anonimo).

L'invio di email non è supportato da Catchmail e quindi nemmeno da questo client.

## Limiti noti

- Le impostazioni e i pin sono salvati in `localStorage`: cambiando browser o profilo non vengono sincronizzati.
- Il rate-limit del login è in-memory e si resetta a ogni cold-start della funzione serverless. Per una protezione persistente serve un backend (Vercel KV/Redis).
- Single-user by design: nessuna registrazione, nessun reset password, nessuna multi-tenancy.

## Licenza

MIT
