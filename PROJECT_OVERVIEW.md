# Easy To Share — How It Was Built (single full-stack Next.js app)

A short, complete summary of the architecture, the design decisions, and every library/framework used.

---

## 1. Stack at a glance

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** + **TypeScript** | One app serves the UI *and* the API — server components for the shell, client components for interaction, Route Handlers for the backend |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`) | Utility-first; design tokens mapped via `@theme` |
| Typography | **next/font** (Open Sans, self-hosted) | Matches the original font, no external requests |
| API | **Next.js Route Handlers** (`src/app/api/**/route.ts`, Node runtime) | The whole Express 5 layer now lives in-process — no second server, no proxy, no CORS |
| Database | **MongoDB** via **Mongoose 9** (optional) + in-memory fallback | Durable prod store, zero-dependency dev store |
| Realtime | **Server-Sent Events** (in-process hub) | Push updates; Redis Pub/Sub is the documented scale-out hook |
| Validation | **Zod 4** | Typed request validation |
| Uploads | **Web `FormData` / `File`** (native) | Next.js parses multipart bodies itself, so multer is gone |
| Security | httpOnly device cookie, `nosniff`/`Referrer-Policy`/`X-Frame-Options` headers, in-app rate limiter, HMAC'd IPs | Same guarantees as before, no extra middleware stack |
| Tooling | **Turbopack**, **TypeScript**, **ESLint** (Next), **npm** scripts | Dev experience and verification |

**Removed** in the merge (no longer needed): Express, multer, cors, helmet, cookie-parser, express-rate-limit, compression, morgan, dotenv, tsx, and the `next.config.ts` proxy rewrite.

---

## 2. How the original works (the core insight we cloned)

Easy To Share is **not** WebRTC/P2P. The server keys a "clipboard room" by the caller's **public IP address**. All devices on one Wi-Fi NAT to the same public IP, so they automatically share a room — that is the whole "no pairing needed" trick. A cookie distinguishes *which device* uploaded an item.

The clone reproduces this, but never stores the raw IP: it uses `HMAC(ip, dailySalt)` as the room id, and an httpOnly `afs_device` cookie for ownership.

---

## 3. Frontend — design & development

**Goal:** pixel-faithful, fully responsive reproduction of airforshare.com.

**Approach**
1. Scanned the live site and extracted its real design tokens (original accent `#638eff`, gradients `#864bff → #5082ff`, page `#f4f4f4`, text/border shades), then re-skinned them onto the Easy To Share brand palette — deep navy `#0D1B3D` on warm cream `#F5F0E1`, with every surface/border/accent token derived from those two colors.
2. Mapped each token into Tailwind v4 `@theme` so utilities like `bg-surface`, `text-ink`, `border-line` resolve to the original palette.
3. Rebuilt layout dimensions exactly from the source CSS (992px container, 75px desktop tab rail, 69px mobile tab row, 48px headings, 280px drop zone, etc.).

**Structure**
```
src/
  app/
    layout.tsx        # Open Sans, metadata, header + footer shell
    page.tsx          # home (ShareApp)
    about|upgrade|downloads|feedback|login/page.tsx
    globals.css       # Tailwind import + @theme tokens + .afs-btn
  components/
    site-header.tsx   # desktop nav + mobile full-screen drawer
    site-footer.tsx   # copyright, "Made in BirdsCorp", socials
    share-app.tsx     # card + Text/Files tabs (desktop rail / mobile row)
    text-panel.tsx    # auto-grow textarea, autosave, Clear/Save
    files-panel.tsx   # drag & drop, grid, previews, delete, Download All
    page-card.tsx, logo.tsx, logo-canvas.tsx, icons.tsx, feedback-form.tsx, login-form.tsx
  lib/limits.ts       # anonymous tier caps (2 files x 5 MB) from clip.php
```

**Responsive behaviour:** mobile hamburger drawer with scroll lock; tabs move from a left rail (≥768px) to a top row (<768px); auth/action buttons stack below 500px; file grid reflows 2→3→4→5→6 columns.

---

## 4. Backend — now part of the same Next.js app

**Goal:** the exact same API contract, served by the Next.js server itself.

**Layers**
```
src/app/api/                 # thin HTTP edge (Route Handlers)
  route.ts                   # GET  → endpoint index
  health/route.ts            # GET  → liveness + store name
  clip/route.ts              # GET  → room state
  text/route.ts              # POST → save text
  files/route.ts             # POST → multipart upload
  files/[id]/route.ts        # GET  → download, DELETE → owner-only
  clear/route.ts             # POST → empty the room
  events/route.ts            # GET  → SSE stream

src/server/                  # framework-agnostic core (Node runtime)
  config.ts                  # env-driven config
  errors.ts ids.ts hash.ts limits.ts room-scope.ts schemas.ts
  runtime.ts                 # singleton store + sliding-expiry sweeper
  http/context.ts            # client IP → room id, device cookie
  http/respond.ts            # `{ error: { code, message } }` mapping
  http/rate-limit.ts         # fixed-window limiter (was express-rate-limit)
  realtime/hub.ts            # in-process SSE pub/sub
  services/clip.ts           # room lifecycle + clip state assembly
  store/                     # StorageAdapter: memory.ts | mongo.ts (+ factory)
```

**API surface** (identical to the previous standalone server)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api` | Endpoint index (was the Express root JSON) |
| GET | `/api/health` | Liveness + active store |
| GET | `/api/clip` | Room state (mirrors the old `clip.php`): text, files, limits, expiry |
| POST | `/api/text` | Save shared text (replaces previous text) |
| POST | `/api/files` | Multipart upload (`file`), tier + size + MIME checks |
| GET | `/api/files/:id` | Download (`Content-Disposition: attachment`) |
| DELETE | `/api/files/:id` | Owner-only delete (204 / 403 / 404) |
| POST | `/api/clear` | Empty the room (204) |
| GET | `/api/events` | **SSE** stream: `ready` / `update` / `clear` |

Errors are always `{ error: { code, message } }` with 400/403/404/409/413/429/500.

**Key design decisions**
- **Rooms, not raw IPs:** `roomId = HMAC(ip, dailySalt)`; raw IPs are never stored or logged.
- **Client IP inside Next.js:** the app reads `X-Forwarded-For`, where Next.js itself records the TCP peer when the client does not send the header. `TRUST_PROXY_HOPS` (default 1) picks the matching hop **from the right-hand end** of the chain, so one nginx/Vercel-style edge reports the real visitor. Verified: `198.51.100.9, 203.0.113.7` and `203.0.113.7` resolve to the same room, `203.0.113.8` to a different one.
- **Ownership:** `owner` is computed server-side from the httpOnly `afs_device` cookie — the client cannot spoof it.
- **Sliding TTL:** every access refreshes `expiresAt` (30 min anonymous, 2 h Pro); a background sweeper deletes expired rooms, items, and file bytes.
- **Singleton runtime:** the store promise and the sweeper are cached on `globalThis`, so Next.js hot reloads never fork the room registry or the SSE hub.
- **Storage abstraction:** `StorageAdapter` lets the same routes run on an in-memory store (dev, zero setup) or MongoDB (prod) — chosen at runtime by `STORE_DRIVER` / `MONGODB_URI`.
- **Tiers:** anonymous `2 × 5 MB / 30 min`, registered `5 × 10 MB / 30 min`, Pro `unlimited / 2 h`.
- **Ordered checks:** the upload route validates size before quota so an oversized file always returns 413 (the multipart parser used to reject it before routing).
- **Realtime:** in-process hub for SSE; a documented Redis Pub/Sub extension point for multi-instance fan-out.

---

## 5. How frontend and backend connect

- **One process, one origin.** The browser calls relative `/api/...` URLs; the same Next.js server answers them. There is no proxy target and no CORS allow-list to configure — cookies and SSE just work, in dev and in production.
- **One typed client.** `src/lib/api.ts` exposes `getClip / saveText / uploadFile / deleteFile / clearClip / subscribe` with `credentials: 'include'`, error mapping into `ApiError { status, code }`, and an `EventSource` subscription. Set `NEXT_PUBLIC_API_URL` to point it at a different origin (default `""` = same origin).
- **UI wiring.** `ShareApp` owns the clip state, refreshes on SSE `update`/`clear`, and shows an offline banner with retry. `TextPanel` uses a local-override buffer (server text is authoritative until the user types) with 1.2 s debounced autosave; `FilesPanel` uploads sequentially so the server enforces the quota, renders server URLs, and only shows the delete affordance on files the device owns.
- **Room resolution (the "single IP" rule).** `src/server/http/context.ts` derives the room id from the client IP and `ROOM_SCOPE`: `auto` (default) collapses private/loopback addresses to their LAN prefix (`/24`, `/64`) so devices behind one router share a bucket during local testing, while public addresses stay exact; `ip` restores the original service's exact-IP behaviour. Loopback spellings (`::1`, `127.0.0.1`, `::ffff:127.0.0.1`) are unified so one machine is always one room.

---

## 6. How to run

One command, one process:

```bash
npm run dev          # http://localhost:3000 — UI + API
```

Open `http://localhost:3000` in two browsers/tabs (or two devices on the same network) — they share one room.

Production:

```bash
npm run build && npm run start
```

Other commands:

```bash
npm run lint         # ESLint, 0 errors / 0 warnings
npm run typecheck    # tsc --noEmit for the whole app
npm run test:api     # 21-check API suite against the running app
npm run test:share   # 19-check single-IP sharing suite against the running app
```

Configuration: copy `.env.example` to `.env.local`. Leave `MONGODB_URI` empty to use the in-memory store.

---

## 7. Verification performed

| App | Check | Result |
|---|---|---|
| Next.js | `npm run lint` | 0 errors, 0 warnings |
| Next.js | `npm run typecheck` | 0 errors |
| Next.js | `npm run build` | 0 errors, 9 routes + 8 API routes |
| Next.js | `npm run test:api` | **21/21** |
| Next.js | `npm run test:share` | **19/19** |
| Next.js | Real Chrome, 20 viewports × 6 routes (280–1920 px, portrait + landscape) | no horizontal overflow, footer fits, no header collision |
| Next.js | Real Chrome, two isolated browser contexts (headless, CDP) | tab switching on desktop + mobile, UI upload, SSE-driven update on the other device, ownership affordances — all pass, 0 console errors |

A browser-driven check also caught a layout bug the API suites could not see: the desktop tab rail was painted **under** the content panel, which is also positioned, so the Text/Files icons were not clickable and the app looked stuck on the Text tab. The rail (and the mobile tab row) now carry `z-10`.

The API suite covers health, clip shape, text round-trip, upload 201, bytes + attachment header, `no_file`, `mime_not_allowed`, `max_files_reached` (409), `max_size_reached` (413), cross-device delete 403, delete→404, invalid JSON 400, over-long text 400, clear 204, and SSE `ready` + live `update`.

The share test proves the actual product behaviour: two independent cookie jars from one IP get the **same `clipId`**, text saved by device A appears on device B, A's file is listed and downloadable by B, ownership blocks B from deleting it (403), quota returns 409, clear propagates, and **B receives an `update` over SSE in realtime**.

---

## 8. Known limitations / next steps

- The in-memory store does not persist across restarts — set `MONGODB_URI` for durability (the Mongo adapter typechecks but could not be executed here: no MongoDB instance in this environment).
- `server/` is the earlier standalone Express implementation, kept only for reference until it is deleted; nothing in the app imports it.
- The SSE hub and the rate limiter are process-local — multi-instance deployments need the documented Redis Pub/Sub + Redis counter extensions.
- `X-Forwarded-For` is the only source of the client IP in a Route Handler, and Next.js keeps a client-supplied value. On a **directly exposed** instance that means a caller can choose its own room. Deploy behind an edge that overwrites the header (nginx: `proxy_set_header X-Forwarded-For $remote_addr;`) and set `TRUST_PROXY_HOPS` to match.
- Auth/login, payments (Pro tier), and client-side E2E "Private Mode" are designed in the plan but not implemented.
- Two physical devices over a real LAN have not been tested; only two cookie jars on one machine (the design targets the LAN case via `ROOM_SCOPE=auto`).
