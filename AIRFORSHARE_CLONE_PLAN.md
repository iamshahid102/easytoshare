# AirForShare.com — Full-Stack Clone Plan

> **Target:** a pixel-faithful, production-grade clone of **https://airforshare.com**
> **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4
> **Author perspective:** Senior Full-Stack Engineer (15+ years) — architecture, delivery, and risk view
> **Document status:** Planning / pre-implementation
> **Repo:** `air-for-share` (existing `create-next-app` scaffold, Next `16.2.10`, React `19.2.4`)

---

## 0. TL;DR (read this first)

- **What the original is:** a "Virtual Desktop for your Wi-Fi". You open one URL on every device in the same network and your text/files appear on all of them. No app, no install, no signup.
- **What it is NOT:** it is **not** WebRTC / peer-to-peer / local-network discovery. There is no LAN socket, no mDNS, no QR pairing.
- **How "same IP address" transfer actually works:** the server **buckets every clipboard by the caller's *public exit IP address*** (`$_SERVER['REMOTE_ADDR']`-style). Devices on one Wi-Fi share one public IP because of NAT, so they all land in the same bucket. Content is **relayed and temporarily stored on the server**, then fetched over plain HTTP. A random `ownerHash` cookie lets the server tag *which* items were uploaded by *this* device (so "my" uploads render differently from "received" items).
- **Transfer mechanism:** HTTP **pull/polling** + multipart upload + a small JSON state endpoint. No WebSocket, no SSE, no push.
- **Original tech (as scanned, 2026-10-09):** AngularJS **1.6.6** SPA (`ng-app="afs"`), jQuery + Sizzle, `ng-file-upload 12.2.13`, `angular-elastic`, `ngclipboard`; a single `dist/js/index.js` bundle (≈336 KB) and `assets/css/all.css` (≈63 KB); **PHP 5.5.9 on Apache 2.4.7 + Phusion Passenger 6.0.2 (Ubuntu)**, REST-ish `apiv3/*.php` endpoints; Google Analytics (gtag `G-HFY16H4KQT`); Open Sans via Google WebFont loader.
- **Our clone:** rebuild the same UX with a modern, typed, maintainable stack, and **fix the original's security weakness** (plain IP bucketing = anyone behind the same NAT/office IP can read your clipboard) with an explicit room/pairing model layered on top.

---

## 1. Goals & Non-Goals

### 1.1 Goals
1. Reproduce the **complete design and layout** of airforshare.com (both the *Text* and *Files* tabs, header/nav, footer, empty/loading/error states, upgrade prompts, mobile gestures).
2. Reproduce the **core workflow**: open on two devices in the same network → share text/files instantly → content auto-expires.
3. Use **Next.js 16 App Router + TypeScript + Tailwind CSS v4** exclusively on the frontend.
4. Deliver a **secure, scalable** backend design that can run locally (single machine, zero cost) and in production (managed services).
5. Document exactly **what the original uses for single-IP transfer** and how we re-implement it correctly.

### 1.2 Non-Goals (for v1)
- Native iOS/Android apps (original has them; we ship a responsive PWA first).
- Payments / real subscription billing (we stub the "Upgrade" flow behind a feature flag).
- Rewriting an iOS `app-id` smart-banner ecosystem.
- Byte-for-byte copying of the original's PHP or minified bundle.

---

## 2. Reconnaissance & Technical Scan (evidence)

All observations below were captured by live requests against the production site on **2026-10-09**.

### 2.1 HTTP response headers (homepage)

| Header | Value |
|---|---|
| `Server` | `Apache/2.4.7 (Ubuntu) Phusion_Passenger/6.0.2 PHP/5.5.9-1ubuntu4.29 OpenSSL/1.0.1f` |
| `X-Powered-By` | `PHP/5.5.9-1ubuntu4.29` |
| `Content-Type` | `text/html` |
| `Cache-Control` | `no-store, no-cache, must-revalidate` (app is fully dynamic) |
| `Set-Cookie` | `ownerHash=mtAOWVpMBJ; expires=Tue, 31-Dec-2030; path=/; domain=.airforshare.com` |
| CORS | `Access-Control-Allow-Origin: *` on API responses |

> **Security red flag found during scan:** PHP **5.5.9** is end-of-life (unsupported since 2016) and **OpenSSL 1.0.1f** is ancient. We will not replicate this stack — it is a liability, not a design decision.

### 2.2 Document / front-end signals (from raw HTML)

| Evidence | Meaning |
|---|---|
| `<html ng-app="afs">` | AngularJS 1.x SPA |
| `ng-controller="AFSController"`, `ng-submit`, `ng-click`, `ng-if` | Angular scope-based UI |
| `ngf-drop`, `ngf-select`, `ngf-max-size`, `ngf-multiple` | `ng-file-upload` directive for drag/drop + file picker |
| `class="autoresize-text msd-elastic"` | `angular-elastic` auto-growing textarea |
| `data-text="Clear"`, copy buttons | `ngclipboard` |
| `<script src="dist/js/index.js">` | Single bundled JS (webpack/browserify output) |
| `<link ... assets/css/all.css?1.2">` | Single CSS bundle (custom, not a framework) |
| WebFont loader → `Open+Sans:300,400,600,700,800i` | Typography = Open Sans |
| `og:image https://airforshare.com/ogimage.png` | Social card asset |
| `manifest.json`, apple-touch icons, mask-icon `#5bbad5` | PWA-ish install metadata |
| `meta name="apple-itunes-app" content="app-id=475158919"` | Native iOS app smart-banner |

### 2.3 Front-end libraries (detected inside the bundle)

- **AngularJS `1.6.6`** (module `afs`), bundled by webpack.
- **jQuery** + **Sizzle**.
- **ng-file-upload `12.2.13`** (`Upload`, `UploadBase`, `UploadExif` services).
- **angular-elastic** (textarea autosize), **ngclipboard** (copy-to-clipboard), **angular-utf** / `utf8-base64` / `base64` (text encoding).
- Google **gtag.js** analytics.

### 2.4 Back-end / API surface (from the bundle)

Base: `https://airforshare.com/apiv3/` (upload/delete/clear use the `www.` host).

| Endpoint | Method | Purpose |
|---|---|---|
| `/apiv3/clip.php` | GET | Returns the whole bucket state as JSON. Sent with header `X-AUTH-TOKEN`. |
| `/apiv3/save.php` | POST | Save the text clipboard (`application/x-www-form-urlencoded`, `X-AUTH-TOKEN`). |
| `/apiv3/upload.php` | POST | Multipart file upload; body includes `api_key`, `owner_hash`, `file`. |
| `/apiv3/delete.php?id=<id>` | GET | Delete a single item; response failure triggers `document.location.reload()`. |
| `/apiv3/clear.php` | GET/POST | Clear the whole bucket. |

Additional hard-coded values found in the client (documented as *observed*, **not** to be reused):

- Public `api_key`: `webklsjfoi6jge3pgwe0few03`
- Cookies consumed by the app: `auth_token`, `ownerHash` (fallback value `"no_coocks"`).
- Files marked `ownerHash = "DELETED"` are treated as soft-deleted in the UI.

### 2.5 Live `clip.php` sample response (anonymous, this network)

```json
{"activeTab":0,"clipId":"558166","clipText":"","clipFiles":[],
 "maxFileSize":5,"maxFilesCount":2}
```

- `maxFileSize` = **5 MB**, `maxFilesCount` = **2 files** for anonymous users.
- `clipText` is URL-encoded (client runs `decodeURIComponent` + a custom decoder).
- The server hands every visitor on the same public IP the *same* bucket, distinguished only by `ownerHash`.

### 2.6 Product tiers (from `upgrade.php`)

| | Anonymous (default) | Registered user | Pro |
|---|---|---|---|
| Files at once | 2 | 5 | unlimited |
| Max size/file | 5 MB | 10 MB | unlimited |
| Retention | 30 min after last access | 30 min | 2 hours |
| Price | free | free | from $0.99/mo |
| Extras | — | — | Private mode / protected files (*"coming soon"*) |

### 2.7 Pages / routes on the original

- `/` (app), `/about.php` ("How it works"), `/downloads.php`, `/upgrade.php`, `feedback.php`, `/login.php`, `/notfound.php`, `/upgrade_plan.php`.
- `robots.txt` / `sitemap.xml` **302-redirect to `notfound.php`** → no SEO surface beyond the app pages.

### 2.8 Content lifecycle

- clipper content is **deleted 30 minutes after last access** (sliding TTL), 2 hours on Pro.
- No user history, no accounts required for the core flow.

---

## 3. How AirForShare transfers data over "a single IP address" (deep dive)

This is the question the whole product turns on, so it gets a dedicated section.

### 3.1 The mechanism (confirmed)

1. Every device on a home/office Wi-Fi sends traffic through the router, which performs **NAT**. To the outside world, all of them appear to originate from **one public IP address**.
2. AirForShare's PHP backend uses that **public IP as the bucket key**. `clip.php` returns "everything currently in the bucket for your IP".
3. Because all your devices share the public IP, they all read/write the *same* bucket — that is the entire "it just works with no pairing" magic.
4. A server-set **`ownerHash` cookie** tags uploads made by the current browser so the UI can render "Uploaded by me" vs "Received" and only let you delete your own items.
5. An **`auth_token` cookie/header** provides a weak per-visitor token; a hard-coded **`api_key`** gates `upload.php`.
6. Files are **uploaded to and stored on the server** (not streamed device-to-device). Text is stored server-side and encoded.
7. The client **pulls** state via `GET clip.php` (no WebSocket/SSE); the page reloads on some destructive actions.

### 3.2 What it is *not*

- ❌ No WebRTC data channels / STUN / TURN.
- ❌ No WebSocket / Socket.IO / SockJS / Pusher.
- ❌ No mDNS / SSDP / LAN broadcast / local HTTP server.
- ❌ No QR code, no numeric pairing code, no short share code in the original.

> The name "AirForShare"/"AirDrop-like" is marketing. Under the hood it is a plain **server-relayed clipboard keyed by public IP**.

### 3.3 Data-flow (as-is)

```
Device A (Wi-Fi) ┐
                 ├─ NAT ─▶ ONE public IP ─▶ Apache/PHP ─▶ bucket[IP]
Device B (Wi-Fi) ┘                                        ▲
                                                          │  GET /apiv3/clip.php  (poll/pull)
        A: POST save.php / upload.php (+ownerHash) ────────┘
```

### 3.4 Weaknesses we must fix in the clone

| # | Weakness in original | Impact | Our fix |
|---|---|---|---|
| W1 | Bucketing by public IP | Everyone behind the same NAT (office, café, hostel, ISP CGNAT) sees each other's data | Explicit **Room** model: IP is only the *default auto-join hint*; items are scoped to a room, plus optional **pairing code** for a private flow |
| W2 | `api_key` hard-coded in client | Trivial to script uploads/abuse | Server-side only; signed, short-lived upload tokens |
| W3 | No real push | Up to page-refresh latency; other devices look "stale" | Add **SSE** (`/api/events`) with polling fallback |
| W4 | EOL PHP/OpenSSL, `Access-Control-Allow-Origin: *` | Known-CVE surface; CSRF/data-leak risk | Modern runtime, strict CORS, CSRF-safe same-origin API |
| W5 | Soft-delete quirks (`ownerHash="DELETED"`) and page reloads | Janky UX | Proper REST semantics + optimistic UI |
| W6 | Plaintext transport of text | Card numbers, passwords, OTPs shared in the clear on the wire beyond HTTPS | HTTPS-only + optional client-side E2E encryption for "Private mode" |

---

## 4. Design System & Layout Clone (visual spec)

### 4.1 Design tokens (extracted from `all.css`)

**Colors**
| Token | Value | Usage |
|---|---|---|
| `--afs-accent` | `#9b6bff` | Primary accent (brand purple) |
| `--afs-ink` | `#1a1a1a` | Primary text |
| `--afs-ink-2` | `#333` / `#4a4a4a` | Secondary text |
| `--afs-muted` | `#555` / `#666` / `#9B9B9B` | Tertiary text, social icons, placeholders |
| `--afs-line` | `#e0e0e0` / `#d8d8d8` / `#d0d0d0` | Borders / dividers |
| `--afs-bg` | `#fff` / `#fafafa` / `#f8f8f8` / `#f4f4f4` | Surfaces |
| `--afs-danger` | `#d0021b` / `#ff4444` / `#ff6b6b` | Errors, delete |
| theme-color | `#ffffff` | Browser chrome / PWA |

**Typography**
- Family: **Open Sans** (300, 400, 600, 700, 800 + italic) — load via `next/font/google`.
- Base UI: 16px; headers 600–800; footer/meta ~13–14px gray.

**Layout**
- Single centered "device card" app panel on desktop; full-bleed on mobile.
- Header: logo left (desktop `logo.svg`, mobile `logo-mini.svg`), hamburger `menu-btn` + slide-in `<nav class="menu">` on mobile.
- Two tabs: **Text** (default) and **Files**.
- Sticky footer: © 2011–2026 AirForShare · "Made in BirdsCorp.com with ❤️" · Facebook/Twitter SVG icons.

### 4.2 Component inventory (map to React)

| Original | Clone component |
|---|---|
| `.header` + `.menu` + `.menu-btn` | `<SiteHeader/>` (client component, mobile drawer) |
| `.main-app-tabs` / `.main-app-tabs__item` | `<AppTabs/>` |
| `.app-text-wrap` + `textarea.autoresize` | `<TextTab/>` with auto-grow textarea + copy |
| `.app-text-submit` (`Clear`, `Save`, autosave) | `<TextActions/>` |
| `.upload-cont-box`, `ngf-drop` zone | `<FileDropZone/>` (HTML5 DnD + `<input type=file multiple>`) |
| file list + per-item delete/select | `<FileList/>` + `<FileItem/>` |
| `.main-app__global-loader` | `<GlobalLoader/>` |
| `.uprade-mobile` / upgrade CTA | `<UpgradeBanner/>` |
| `.footer` | `<SiteFooter/>` |

### 4.3 Screens & states to reproduce
1. **Text tab** — empty placeholder "Type something…", typing → autosave, *Save*/*Clear* buttons, copy-to-clipboard.
2. **Files tab** — drag/drop zone ("Drag and drop any files up to N files, X Mb each or Browse"), file rows with progress %, select/delete, "Download" / "Download All".
3. **Over-limit / errors** — "Server Error", "Unknown file error", "Max N files" upgrade prompt, "Max X Mb" prompt.
4. **Loading** — global loader overlay.
5. **Upgrade** — free vs Pro comparison + price ($0.99/mo).
6. **Mobile** — hamburger drawer, touch-friendly targets, native-feeling tabs.
7. **Feedback / Login / Download** pages (static recreations).

### 4.4 Assets to recreate
- `logo.svg`, `logo-mini.svg`, `ogimage.png` (1200×630 social card), favicon set (16/32/152/ico), `manifest.json`, `safari-pinned-tab.svg`.
- We will author original SVGs in the brand palette (do **not** hotlink the originals in production).

---

## 5. Target Architecture (Next.js 16 + TypeScript + Tailwind v4)

> **Version note (read before coding):** this repo runs **Next.js 16**, which has breaking changes vs older docs. In particular **Middleware is now "Proxy"** (`proxy.ts` at project root / `src`), and caching/route semantics changed. Always consult `node_modules/next/dist/docs/` before writing code.

### 5.1 High-level

```
Browser (App Router client components)
   │  fetch / EventSource (same origin)
   ▼
Next.js 16 Server  ──┬─ Route Handlers  (src/app/api/**/route.ts)
   │                 ├─ API core        (src/server/** — rooms, store, SSE hub)
   │                 └─ Security headers (next.config.ts headers())
   ▼
Storage Layer (adapter interface)
   ├─ Room/Item metadata  → in-memory (dev) or MongoDB TTL (prod)
   └─ Binary objects      → in-process buffers (dev) or MongoDB `objects` (prod)
```

> **Implementation status (2026-10-10).** The project is a **single Next.js
> full-stack app**: one process serves the UI, the JSON/multipart API and the
> SSE stream on one origin. An earlier iteration had a standalone Express 5
> server (`server/`) reached through a Next.js rewrite proxy; that logic has
> been ported into `src/server/**` + `src/app/api/**` and the proxy is gone.
> Same origin means no CORS, and Next.js parses multipart bodies natively, so
> multer/express/cors/helmet/dotenv are no longer dependencies. Rate limiting,
> the device cookie, the tier limits and the exact response shapes are
> unchanged — see `PROJECT_OVERVIEW.md`.

### 5.2 Folder structure (as built)

```
src/
  app/
    layout.tsx                 # Open Sans via next/font, metadata, shell
    page.tsx                   # the app → renders <ShareApp/>
    globals.css                # @import "tailwindcss"; theme tokens
    about|upgrade|downloads|feedback|login/page.tsx
    api/
      route.ts                 # GET  → endpoint index
      health/route.ts          # GET  → liveness + active store
      clip/route.ts            # GET  → bucket state (mirrors clip.php)
      text/route.ts            # POST → save text
      files/route.ts           # POST → multipart upload
      files/[id]/route.ts      # GET (download), DELETE (owner-only)
      clear/route.ts           # POST → clear bucket
      events/route.ts          # GET  → SSE stream (realtime improvement)
  components/                  # ShareApp, TextPanel, FilesPanel, header/footer, icons
  lib/
    api.ts                     # typed client (getClip/saveText/uploadFile/…)
    limits.ts                  # client-side hints for the anonymous tier
  server/                      # API core (Node runtime only)
    config.ts                  # env-driven configuration
    errors.ts ids.ts hash.ts limits.ts room-scope.ts schemas.ts
    runtime.ts                 # singleton store + sliding-expiry sweeper
    http/                      # room context, device cookie, error + rate limit
    realtime/hub.ts            # in-process SSE hub (Redis is the scale-out hook)
    services/clip.ts           # room lifecycle + clip state assembly
    store/                     # StorageAdapter: memory.ts | mongo.ts (+ factory)
scripts/
  api-smoke.mjs                # 21-check API suite
  e2e-share.mjs                # 19-check single-IP sharing suite
```

### 5.3 State & data model

```ts
// types/clip.ts
export type Tier = 'anonymous' | 'registered' | 'pro';

export interface Room {
  id: string;            // opaque, e.g. sha256(publicIp + dailySalt)
  publicIpHash: string;  // never store raw IP in logs
  createdAt: number;
  lastAccessAt: number;  // sliding TTL anchor
  tier: Tier;
}

export interface Item {
  id: string;
  roomId: string;
  kind: 'text' | 'file';
  text?: string;         // for kind === 'text'
  name?: string;         // original filename
  mime?: string;
  size?: number;         // bytes
  storageKey?: string;   // for files
  ownerHash: string;     // which device uploaded it
  createdAt: number;
  expiresAt: number;
}

export interface ClipState {
  activeTab: 0 | 1;
  clipId: string;
  clipText: string;
  clipFiles: FileDTO[];
  maxFileSize: number;   // MB
  maxFilesCount: number;
}
```

- **TTL:** sliding 30 min (anon/registered), 120 min (pro) — identical to the original's contract.
- **IP hashing:** never persist raw IPs; use `HMAC(secret, ip + UTC-date)` so the mapping is daily-rotating and privacy-preserving.

### 5.4 API contract (modern, `zod`-validated)

| Route | Method | Auth | Notes |
|---|---|---|---|
| `GET /api/clip` | GET | signed device cookie | returns `ClipState`; auto-creates room from IP hint |
| `POST /api/text` | POST | device cookie + CSRF | body `{ text }`; validated max length |
| `POST /api/files` | POST | device cookie + CSRF | `multipart/form-data`; enforces tier caps & MIME allowlist |
| `GET /api/files/:id` | GET | room-scoped | streams download with `Content-Disposition` |
| `DELETE /api/files/:id` | DELETE | owner-only | proper 204 |
| `POST /api/clear` | POST | room owner | clears room |
| `GET /api/events` | GET | room-scoped | **SSE** push of state deltas (new) |

> We intentionally remove the client-side `api_key`. Upload authorization moves server-side via a signed, short-lived token minted by the same-origin app.

### 5.5 Realtime strategy (the main UX upgrade)

- Primary: **Server-Sent Events** (`/api/events`) — one-way server→client, trivially proxied, auto-reconnects, ideal for "another device added a file".
- Fallback: **polling every 3–5s** while the tab is visible (matches original behavior, keeps cost down).
- Multi-instance scaling: back the SSE hub with **Redis Pub/Sub** so any server instance can fan out to any connected client.

### 5.6 Storage adapter

Define one interface so dev needs zero external services:

```ts
export interface StorageAdapter {
  getRoom(id: string): Promise<Room | null>;
  upsertRoom(room: Room): Promise<void>;
  listItems(roomId: string): Promise<Item[]>;
  putItem(item: Item): Promise<void>;
  deleteItem(id: string): Promise<void>;
  clearRoom(roomId: string): Promise<void>;
  putObject(key: string, data: ReadableStream | Buffer, meta: {mime: string}): Promise<void>;
  getObject(key: string): Promise<ReadableStream>;
}
```

- **Dev:** `fs.ts` (local `.data/` dir) + in-memory map. No Docker required.
- **Prod:** `redis.ts` (or Postgres) for metadata with native TTL + `s3.ts` for binaries.
- Service selection (Redis/Postgres/object storage/realtime) will be finalized with the **Gravity Index** tool at implementation time rather than guessing — see §11.

---

## 6. Delivery Roadmap (phased)

Estimates assume one senior full-stack engineer; adjust with team size.

### Phase 0 — Foundations (0.5–1 day)
- Add **Tailwind CSS v4** (`tailwindcss`, `@tailwindcss/postcss`, `postcss.config.mjs`, `@import "tailwindcss";` in `globals.css`).
- Load **Open Sans** via `next/font/google`; set up design tokens (`@theme`).
- Add `zod`, `nanoid`; establish `src/lib` + `src/types`.
- Configure `proxy.ts` for security headers + rate limiting.

### Phase 1 — Static design clone (2–3 days)
- Build `<SiteHeader/>`, `<SiteFooter/>`, `<AppTabs/>`, and both tab shells to match the original layouts/screens.
- Author logo/og/favicon assets.
- Static pages: `/about`, `/upgrade`, `/downloads`, `/feedback`, `/login`.
- Deliverable: visually complete, non-functional app (Storybook optional).

### Phase 2 — Core data layer + API (2–3 days)
- `StorageAdapter` + `fs` implementation; `rooms.ts` (IP hint → hashed room).
- Route handlers: `clip`, `text`, `files`, `files/:id`, `clear` with zod validation.
- Tier limits in `limits.ts`.
- Device cookie (`ownerHash` equivalent) + signed auth/CSRF.
- Deliverable: two browsers sharing state via the same IP bucket.

### Phase 3 — Realtime + files UX (2–3 days)
- SSE `/api/events` + Redis pub/sub hub; polling fallback.
- Drag/drop, multi-file upload with progress, per-item delete, download / download-all.
- Auto-grow textarea + autosave + copy-to-clipboard.
- Optimistic UI + toasts; error states ("Server Error", "Unknown file error", max-size/max-count).

### Phase 4 — Security, TTL, hardening (1–2 days)
- Sliding TTL expiry + background cleanup (cron / Redis TTL + object lifecycle).
- Rate limiting, MIME allowlisting, size caps, filename sanitization.
- Strict CORS (drop `*`), CSP, CSRF, no raw-IP logging.
- Optional **Private Mode**: room pairing code + client-side E2E encryption.

### Phase 5 — Upgrade/tier scaffolding (1 day)
- Tier detection + limit enforcement end-to-end; `UpgradeBanner` and `/upgrade`.
- Billing stubbed behind a flag (wire real provider only when asked).

### Phase 6 — Testing, perf, deploy (2–3 days)
- Unit (Vitest) for lib/limits/store; integration for route handlers; E2E (Playwright) for two-device flow.
- Lighthouse pass (PWA/installable, performance, a11y).
- Deploy + observability (§8).

**Indicative total:** ~2–3 weeks for a single engineer; ~1 week with 2–3 engineers parallelized by phase.

---

## 7. Security & Privacy Requirements

1. **Never trust the client** for limits, `api_key`, or ownership.
2. **No raw IP persistence** — HMAC with a daily-rotating salt; use IP only as a *join hint*.
3. **Explicit rooms** — default auto-join by IP hint for parity, but items are room-scoped and support a private pairing code (fixes W1).
4. **HTTPS only**, HSTS, secure/httpOnly/sameSite cookies.
5. **CSRF** protection for mutating same-origin actions.
6. **Upload safety** — size caps, MIME allowlist, magic-byte sniff, filename sanitization, no execution of stored files, separate origin/bucket for downloads.
7. **Rate limiting** per room + per IP hash (edge via `proxy.ts`, robust store in Redis).
8. **CSP + security headers**; remove `Access-Control-Allow-Origin: *` from authenticated endpoints.
9. **Data minimization** — auto-expiry, no analytics on content, deletion on TTL.
10. **Optional E2E** for Private mode so the server can't read payloads (fixes W6).

---

## 8. Quality, Testing & Deployment

### 8.1 Testing
- **Unit:** `lib/limits`, `lib/rooms`, `lib/store/*` (Vitest).
- **Integration:** route handlers via `next` test harness — auth, validation, caps, TTL.
- **E2E (Playwright):** two isolated browser contexts simulating two devices; upload text + file; assert propagation; assert expiry.
- **Load:** concurrent rooms, upload throughput, SSE reconnect storms.

### 8.2 Observability
- Structured logs (no content, no raw IP), request IDs, error tracking, SSE connection metrics, TTL sweep metrics.

### 8.3 Deployment
- Local: `next dev` + `.data/` (zero dependencies).
- Prod: Node runtime for API/SSE + object storage + KV; CDN for static; managed secrets.
- CI: lint → typecheck (`tsc --noEmit`) → tests → build. (Repo currently has `lint`, `build`; add `typecheck` + `test` scripts.)

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CGNAT makes many unrelated users share one public IP → cross-user leakage | High | High | Room model + room-scoped items + optional pairing code; document the shared-IP caveat in UI |
| SSE scaling across instances | Medium | Medium | Redis pub/sub fan-out; horizontal-safe hub |
| Large uploads / abuse | Medium | Medium | Tier caps, rate limits, MIME allowlist, signed upload tokens |
| Storage costs if TTL/cleanup buggy | Medium | Medium | Native TTL + object-lifecycle rules + sweeper + cost alarms |
| Next.js 16 breaking changes (Proxy vs Middleware, caching) | Medium | Medium | Follow `node_modules/next/dist/docs/`; keep compatibility guards; add upgrade notes |
| Legal/IP: copying original logos/assets | Low | Medium | Re-author assets; clone *layout*, not copyrighted media |

---

## 10. Deliverables Checklist

- [ ] Tailwind v4 + Open Sans + design tokens wired.
- [ ] Header/footer/tabs + Text & Files tabs matching original layout.
- [ ] Static pages: About, Upgrade, Downloads, Feedback, Login.
- [ ] `StorageAdapter` with `fs` (dev) and managed (prod) implementations.
- [ ] Route handlers: `/api/clip`, `/api/text`, `/api/files`, `/api/files/:id`, `/api/clear`, `/api/events`.
- [ ] SSE realtime + polling fallback.
- [ ] Sliding TTL persistence + cleanup job.
- [ ] Tier limits (anonymous 2×5MB → registered 5×10MB → pro unlimited).
- [ ] Security controls (§7) + `proxy.ts`.
- [ ] Tests (unit/integration/E2E) green.
- [ ] Deploy pipeline + observability.
- [ ] This plan's scan findings validated against the running clone.

---

## 11. Open Decisions (to resolve before/at implementation)

1. **Metadata store:** Redis (native TTL, ideal for ephemeral) vs Postgres (richer queries, longer history). → recommend Redis for v1; use Gravity Index to select a managed provider.
2. **Object storage:** S3-compatible managed bucket vs local disk in prod. → recommend managed object storage.
3. **Realtime fan-out:** Redis pub/sub vs a managed realtime service. → Gravity Index at implementation time.
4. **Private mode scope:** pairing code only (v1) vs full client-side E2E (v2).
5. **Billing:** stub vs real provider — only when the user asks.

> Per working agreement, third-party service choices (KV/DB/object storage/realtime) will be researched and compared via **Gravity Index** when we start Phase 2 — not picked from memory.

---

## Appendix A — Raw scan evidence

- Homepage headers, `clip.php` sample, page inventory, upgrade tiers, and bundle strings as captured in §2 (commands: `curl -I`, `curl` HTML, `curl dist/js/index.js`, `curl assets/css/all.css`, `curl /apiv3/clip.php`, `/apiv3/upload.php`).
- Bundle: `https://airforshare.com/dist/js/index.js` ≈ **336,549 bytes** (webpack IIFE).
- CSS: `https://airforshare.com/assets/css/all.css?1.2` ≈ **63,444 bytes**.

## Appendix B — Original → clone mapping

| Original | Clone |
|---|---|
| AngularJS 1.6.6 SPA | Next.js 16 App Router + React 19 client components |
| `ng-file-upload` | native HTML5 `DataTransfer` + `<input type="file">` + `fetch` multipart |
| `angular-elastic` | CSS `field-sizing` / JS auto-grow textarea |
| `ngclipboard` | `navigator.clipboard.writeText` |
| PHP `apiv3/*.php` | Route Handlers under `app/api/**` |
| PHP `$_SERVER` IP bucketing | hashed-room resolution in `lib/rooms.ts` |
| cookies `ownerHash` / `auth_token` | signed httpOnly device cookie + CSRF token |
| hard-coded `api_key` | server-minted signed upload token |
| page reloads | optimistic UI + SSE |
| Apache/PHP/OpenSSL EOL stack | Node/Next runtime + managed services |

---

*Prepared as a senior full-stack implementation plan for the AirForShare.com clone. Scan performed live against the production URL on 2026-10-09.*
