# Easy To Share

A full-stack reproduction of **[airforshare.com](https://airforshare.com)** — share text and files between any
devices that sit behind the same public IP, with no pairing, no accounts and no app install.

Everything runs in **one Next.js 16 application**: the UI, the JSON/multipart API and the SSE
realtime stream are all served from a single process on a single origin.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — sensible defaults are built in
npm run dev
```

Open <http://localhost:3000>. Open it in a second browser or on a second device on the same
network and both will show the same room.

## How it works

Easy To Share is **not** peer-to-peer. All devices behind one router share one public IP address
(NAT), so the server uses `HMAC(clientIp, dailySalt)` as the key of a shared "clipboard room". Any
device that resolves to that IP lands in the same room. An httpOnly `afs_device` cookie records
which device uploaded which item, which is what makes deleting owner-only.

Raw IP addresses are never stored or logged.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app (UI + API) on :3000 |
| `npm run build` / `npm run start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` for the whole app |
| `npm run test:api` | 21-check API suite (app must be running) |
| `npm run test:share` | 19-check two-device single-IP sharing suite |

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api` | Endpoint index |
| GET | `/api/health` | Liveness + active store |
| GET | `/api/clip` | Room state (text, files, limits, expiry) |
| POST | `/api/text` | Save shared text |
| POST | `/api/files` | Multipart upload (field `file`) |
| GET | `/api/files/:id` | Download a file |
| DELETE | `/api/files/:id` | Delete your own file |
| POST | `/api/clear` | Empty the room |
| GET | `/api/events` | Server-Sent Events: `ready` / `update` / `clear` |

Errors are returned as `{ "error": { "code": "...", "message": "..." } }`.

## Storage

The default store is in-memory (zero setup, cleared on restart). Set `MONGODB_URI` in `.env.local`
to use MongoDB via Mongoose — documents expire through TTL indexes plus the same sweeping job.

## Brand assets

| File | Purpose |
|---|---|
| `public/easy-to-share-logo.png` | Page logo lockup — transparent PNG trimmed to its exact bounds (429 × 122) |
| `public/easy-to-share-icon.png` | Square app icon derived from the logo mark (512 × 512) |
| `src/app/icon.png` | Browser icon (Next.js metadata file convention) |
| `src/app/favicon.ico` | Multi-size favicon (16/32/48/256) |

The layout is responsive from 280 px up to 1920 px in both portrait and landscape — verified with no horizontal overflow, no header collisions and the sticky footer fitting at every breakpoint.

## Documentation

- [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) — architecture, design decisions and verification
- [`AIRFORSHARE_CLONE_PLAN.md`](./AIRFORSHARE_CLONE_PLAN.md) — the original recon and build plan
