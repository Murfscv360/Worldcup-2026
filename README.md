# World Cup 2026 — Live Mobile Dashboard

A fast, mobile-first dashboard for the **2026 FIFA World Cup** (Canada · Mexico · USA,
June 11 – July 19, 2026). Live scores, the full 104-match schedule with **US TV times**,
group standings, all 48 teams, all 16 venues, and prediction-market odds — in a single
static site with no build step and no API keys.

🔗 **Live (GitHub Pages):** https://murfscv360.github.io/Worldcup-2026/

> Older/other deployments (`worldcupmobile.flynns-arcade.net`, target `worldcupfootball26.netlify.app`)
> may serve a previous version — use the GitHub Pages link above for the current app.

📐 **Design & specs:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · 🗺️ **Plan:** [`docs/ROADMAP.md`](docs/ROADMAP.md) · 🖼️ **Mockups:** [`mockup.html`](mockup.html)

## ⚽ Also in this repo: English Football Season 26/27 — Live Hub

Club football doesn't stop when the World Cup does. [`football-hub/`](football-hub/) is a
sibling static app — same zero-build, mobile-first, honest-data philosophy — branded and
built around the **2026-27 season kicking off in August**, covering the **Premier
League**, the **Championship** (the tier below it) and the **UEFA Champions League**
together: the real, full 380-match Premier League and 552-match Championship fixture
lists (not just the opener), a **Live** tab with kickoff-driven match status, **US
Central (Chicago) kickoff times** alongside UK time, verified US TV info (Peacock/NBC for
the Prem, Paramount+/CBS for the Championship) and **live radio links** (talkSPORT, BBC
Radio 5 Live, TuneIn), and professional "Analyst's Desk" commentary generated from real
table/form data. A **real-time, second-by-second
countdown** to kickoff, a **My Teams** tab to follow multiple clubs across both divisions
(fixtures, results, and club-tagged news/transfers), a live table for both divisions that
always shows the full club roster (zero-seeded until each club has played), a summer
transfer-window tracker, curated news, a title-odds market snapshot, and a **Fantasy**
tab with a curated top-3-per-position "best XI" grounded in real 2025-26 season stats
and honours. No starting lineups or live per-gameweek fantasy points are shown, since
no data source for either exists yet — the app says so honestly rather than fabricating
them. See
[`docs/FOOTBALL-HUB.md`](docs/FOOTBALL-HUB.md) for the design and data sources.

🔗 **Live:** https://murfscv360.github.io/Worldcup-2026/football-hub/

## Features

- **Today** — favourite-team dashboard (when chosen) plus a **live match stats** hero
  (score, clock, possession, shots, xG, corners) or the **next match** with countdown,
  CT + local kickoff, TV, weather and pre-match odds — and the curated **Newsroom**.
- **Live** — **play-by-play commentary** (real goals + minute-by-minute colour), **official
  VAR reviews**, and a curated **preview (pregame) / professional match report (postgame)**
  with player ratings and star man — one consistent editorial voice.
- **Schedule** — all 104 fixtures by day, searchable & filterable; kickoff in **CT** *and*
  local time, US broadcaster, and **weather**.
- **Groups** — live standings for all 12 groups plus a **team-performance** leaders board
  with recent form.
- **Teams** — all 48 nations by group, with SVG flags and confederations.
- **Players** — sortable **player performance** table (rating, goals, assists, shots, pass %).
- **Boot & Glove** — live **Golden Boot** (real scorer data) and **Golden Glove** (real
  clean sheets) races.
- **Venues** — all 16 stadiums with capacity, roof, match count, **climate** and **fan
  atmosphere**; opener (Azteca) and final (MetLife) flagged.
- **Odds** — **live 1X2 match markets** that re-price with score & time, plus the
  title-winner outright snapshot with Polymarket / Kalshi links.
- **Favourite team** — pick from 48 nations; the layout re-orients around your team. Saved
  locally.
- **iOS-native** — safe-area insets, Apple web-app meta, system light/dark theme, bottom
  tab bar with SVG icons, SVG flags.

> Real values (scores, scorers, clean sheets, standings) come from the live feed. Secondary
> values (xG, ratings, VAR decisions, weather, attendance) are **modeled in-browser and
> labelled as such** — see the roadmap for connecting a live-stats provider.

## Install to your Home Screen (PWA — no app store, no build)

The site is a Progressive Web App. On **iOS Safari**: open the hosted URL, tap
**Share → Add to Home Screen**. It launches full-screen (no browser chrome) via
a service worker that caches the app shell, so it opens instantly and works
offline. On Android/Chrome you'll get an **Install** prompt. No EAS/native build
is involved — just save and view.

> Service workers require HTTPS, so install from the hosted URL (Netlify /
> GitHub Pages / githack), not from a local `file://` copy.

## Live scores

In‑progress scores are overlaid from the community API
[`worldcup26.ir`](https://github.com/rezarahiminia/worldcup2026) (`/get/games`,
open CORS, no key) on top of the schedule below — so a live match shows the real
running score, scorers, and a live flag. If that API is unreachable it silently
falls back to the schedule feed, so the site always renders.

## How the data stays current

Match results, scores and scorers are loaded **at runtime in the visitor's browser** from
the public-domain [`openfootball/worldcup.json`](https://github.com/openfootball/worldcup.json)
feed (served over CORS-enabled `raw.githubusercontent.com`), and refreshed every 60 seconds.

If that fetch is unavailable, the page falls back to the bundled snapshot in
[`data/worldcup.json`](data/worldcup.json) so it always renders. The freshness pill in the
header shows **Live data** vs **Snapshot**.

Standings and all kickoff-time conversions are computed in the browser, so they reflect
whatever data is loaded.

> Note: FIFA's own site/API (`fifa.com`, `api.fifa.com`) is not CORS-accessible from a
> static page, so this dashboard uses the open `openfootball` dataset, which mirrors the
> official FIFA schedule and results. To refresh the bundled snapshot, re-download
> `data/worldcup.json` from the source above.

## Project layout

```
index.html            # shell + tabs
assets/styles.css      # mobile-first styling
assets/app.js          # data loading, time/TV/standings logic, all views
data/worldcup.json     # bundled fallback snapshot (openfootball, public domain)
```

## Deploy

Static — serve the repository root from any host (Cloudflare Pages, Netlify, GitHub Pages,
S3, nginx, …). No build, no environment variables. `index.html` is the entry point.

## Credits

Match data © [openfootball](https://github.com/openfootball) (public domain / CC0).
Odds snapshots via Polymarket / Kalshi. Not affiliated with FIFA.
