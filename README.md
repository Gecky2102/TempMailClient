# TempMailClient

Client web minimale per [Catchmail](https://catchmail.io) — leggi le caselle temporanee di posta tramite la sua API pubblica, in un'unica interfaccia, senza dover andare ogni volta sul loro sito.

Single-user, pensato per essere deployato su Vercel in pochi minuti.

## Caratteristiche

### Posta
- **Inbox unificata** che aggrega i messaggi di tutte le caselle attive, più una vista per singola casella.
- **Notifiche desktop e suono** quando arrivano nuove mail (toggle separati nelle Impostazioni).
- **Stato letto/non letto** sincronizzato tra i dispositivi, badge unread per casella nella sidebar e nel titolo della tab.
- **Pin dei messaggi** rilevanti: rimangono in cima alla lista.
- **Ricerca rapida** su mittente, oggetto, casella + **filtro per casella** nell'inbox unificata.
- **Paginazione** della lista (10/25/50/100 per pagina).
- **Auto-refresh quando torni sulla tab** e **polling adattivo** (intervallo ×3 quando la tab è in background) per ridurre richieste all'API.
- **Eliminazione messaggi** supportata.
- **Export** del messaggio in `.eml` (apribile da qualunque client) o `.json` (con allegati e header completi).
- **Header raw** espandibili per debugging.

### Caselle
- **Domini multipli**: imposta i tuoi domini, scegli il predefinito, suggerimento automatico del nome casella.
- **Toggle attiva/disattiva** per casella: solo quelle attive vengono interrogate (risparmi richieste API).
- **Etichette** modificabili inline.
- **Copia indirizzo** con un click dalla sidebar.

### Sicurezza dei messaggi
- **Login protetto** con credenziali singole impostate via environment variable, sessione su cookie HMAC firmato.
- **HTML email sanificato lato server** con DOMPurify e renderizzato in un `iframe` completamente sandboxato — gli script delle email non vengono mai eseguiti.
- **Allegati** scaricabili tramite proxy server-side (host whitelisted, solo HTTPS, limite 25 MB, niente redirect).

### Interfaccia
- **Mobile-first**, responsive, design dark minimale con font di sistema.
- **Sincronizzazione cross-device** delle impostazioni e dello stato letto/non letto via Vercel KV (opzionale, free tier).
- **Badge stato sincronizzazione** in alto a sinistra (sync / locale / errore).

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
- Vercel KV / Upstash Redis per la sincronizzazione (opzionale)
- Persistenza fallback in `localStorage`

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

| Variabile           | Descrizione                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| `AUTH_EMAIL`        | Email per il login al pannello.                                            |
| `AUTH_PASSWORD`     | Password per il login al pannello.                                         |
| `SESSION_SECRET`    | Segreto per firmare il cookie di sessione, almeno 32 caratteri casuali.    |
| `KV_REST_API_URL`   | (Opzionale) URL Vercel KV / Upstash Redis per la sincronizzazione cross-device. |
| `KV_REST_API_TOKEN` | (Opzionale) Token Vercel KV / Upstash Redis.                               |

Genera il `SESSION_SECRET` con:

```bash
openssl rand -hex 32
```

## Deploy su Vercel

1. Fork o push della repo su GitHub.
2. Importa il progetto su [vercel.com](https://vercel.com).
3. Imposta le environment variable `AUTH_EMAIL`, `AUTH_PASSWORD`, `SESSION_SECRET`.
4. Deploy. Nessuna configurazione aggiuntiva richiesta.

### Sincronizzazione tra dispositivi (gratis con Upstash)

Senza KV le impostazioni e i pin restano sul singolo browser (badge **locale** nell'header). Per sincronizzarle su tutti i dispositivi:

1. Dashboard Vercel → **Storage** → **Marketplace** → **Upstash** → **Redis**.
2. Piano **Free**, regione vicina, **Create**.
3. Connetti lo store al progetto: Vercel inietta automaticamente `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
4. Redeploy. L'app rileva le variabili, idrata lo stato dal cloud al login e salva ogni modifica (debounce 2 s, dedup, flush via `sendBeacon` allo unload).

Il free tier di Upstash basta abbondantemente per single-user (10 000 comandi/giorno).

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

Tutti gli endpoint sono chiamati attraverso un **proxy server-side** dell'app per centralizzare validazione, cache e gestione errori. L'inbox-store è condiviso fra sidebar e lista messaggi, quindi le richieste non vengono mai duplicate sulla stessa pagina.

L'invio di email non è supportato da Catchmail e quindi nemmeno da questo client.

## Limiti noti

- Il rate-limit del login è in-memory e si resetta a ogni cold-start della funzione serverless. Per una protezione persistente serve un backend (Vercel KV/Redis).
- Single-user by design: nessuna registrazione, nessun reset password, nessuna multi-tenancy.
- Senza KV configurato, impostazioni e stato letto/non letto restano solo sul dispositivo corrente.

## Licenza

MIT
