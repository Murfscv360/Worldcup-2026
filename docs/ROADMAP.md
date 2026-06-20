# World Cup 2026 Live Hub — Project Plan & Roadmap

This document captures the project design, delivery plan, integration guide and
deployment/operations ("ops") information.

---

## 1. Vision

A single-page, mobile-first companion for the 2026 World Cup that feels like a
native iOS app, updates in realtime, and layers a **curated editorial voice**
(previews, play-by-play, professional match reports, briefings) on top of real
match data — with zero build tooling and no shipped secrets.

---

## 2. Delivered (current state)

- [x] Live scores + auto-refresh (60s) with snapshot fallback
- [x] Realtime live-match clock, countdowns, and re-pricing odds (1s/20s timers)
- [x] **Live match stats** hero on the main page (possession / shots / xG / corners)
- [x] **Upcoming match** hero with kickoff times (ET + local), countdown, TV, form
- [x] **Play-by-play commentary** (real goals + modeled colour, cards, saves)
- [x] **Official (VAR) reviews** — per match and tournament-wide feed
- [x] **Professional reviews** — postgame reports with player ratings & star man
- [x] **Pregame previews** — consistent voice with the postgame reports
- [x] **Curated newsroom** — briefings + reports + previews in one feed
- [x] **Team performance** — standings, recent form, leaders board
- [x] **Player performance** — sortable table (goals real; rest modeled)
- [x] **Golden Boot** (real scorer data) & **Golden Glove** (real clean sheets)
- [x] **Predictive market odds** — live 1X2 markets + outright snapshot
- [x] **Weather** per game + **venue & fan** context (attendance, atmosphere)
- [x] **Favourite team** mode — layout re-orients around your team (localStorage)
- [x] iOS-native polish — safe areas, Apple meta, system theme, bottom nav, SVG flags
- [x] Self-contained visual `mockup.html`
- [x] Headless smoke test for every view

---

## 3. Roadmap (next)

| Milestone | Scope |
|---|---|
| **M1 — Real live stats** | Add a Netlify Function proxy for **API-Football**; map lineups, real possession/shots/xG into the hero & reports. |
| **M2 — Knockout bracket** | Visual bracket view that resolves `W73`/`1A` placeholders as results land. |
| **M3 — Notifications** | Web Push for favourite-team kickoff + goal alerts (service worker + VAPID via a function). |
| **M4 — PWA install** | `manifest.webmanifest` + service worker for offline shell and "Add to Home Screen". |
| **M5 — i18n** | English/Spanish toggle (host nations) for the editorial layer. |
| **M6 — Real weather** | Swap modeled weather for a weather API via the same proxy. |

---

## 4. Data integration guide

The data layer is isolated in `app.js` (`REMOTE`, `LOCAL`, `loadData()`), so new
sources are a localized change.

### Adding API-Football (API-Sports) — recommended path
1. Create a **Netlify Function** (`/.netlify/functions/live`) that holds the
   `x-apisports-key` server-side, calls `v3.football.api-sports.io`, and returns
   the data with `Access-Control-Allow-Origin`.
2. Point `REMOTE` at `/.netlify/functions/live` and normalize its JSON into the
   openfootball match shape (see `docs/ARCHITECTURE.md` §5).
3. Keep the openfootball/snapshot path as the fallback in `loadData()`.

> Reference: https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports

### About FIFA.com
`fifa.com` / `api.fifa.com` are **not CORS-accessible** from a static page and
are not a documented public API, so they cannot be fetched directly in the
browser. Use them only via your own server/proxy, then normalize as above.

### About secrets
Never put an API key in client JS or in the repo. Keys live in Netlify
environment variables and are used only inside functions.

---

## 5. Deployment & ops

**Hosting:** any static host (Netlify, Cloudflare Pages, GitHub Pages, S3…).
`netlify.toml` sets the publish dir to the repo root with no build command.

### Deploy to Netlify (target: `worldcupfootball26.netlify.app`)
This repo is ready to deploy, but publishing to a Netlify site requires the
account owner's authentication — it cannot be done from this environment.
Choose one:

1. **Git-connected (recommended):** in Netlify → *Add new site → Import from Git*,
   pick this repo/branch. Build command empty, publish dir `.`. Set the site
   name to `worldcupfootball26` (or add it as a domain alias). Every push
   auto-deploys.
2. **Drag-and-drop:** in Netlify → *Sites*, drag the repo folder onto the
   uploader for an instant deploy.
3. **CLI:** `npx netlify-cli deploy --prod --dir .` (after `netlify login`).

### Operations
- **Freshness:** the header pill shows *Live data* vs *Snapshot* vs *Offline*.
- **Refresh cadence:** data 60s; UI 20s; clocks/countdowns 1s.
- **Updating the snapshot:** re-download `data/worldcup.json` from
  openfootball and commit.
- **Caching:** `netlify.toml` long-caches `/assets/*`, revalidates `/data/*`
  and `/index.html`.

---

## 6. Testing

Headless smoke test (no browser needed) — renders every view against the
bundled data:

```bash
node -e '/* see the harness used in CI */'   # or run the documented smoke script
```

The smoke harness loads `assets/app.js` in a VM sandbox, injects
`data/worldcup.json`, and asserts each view returns non-empty HTML plus the
favourite-team path and Boot/Glove leaders. Wire it into CI before M1.

---

## 7. Disclaimers

Not affiliated with FIFA. Match data © openfootball (CC0). Modeled values
(xG, ratings, VAR decisions, weather, attendance) are clearly labelled in-app
and are illustrative until the live-stats proxy (M1) is connected. Prediction
markets are informational and may not be legal/available in all jurisdictions.
