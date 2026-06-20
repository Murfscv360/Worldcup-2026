# World Cup 2026 Live Hub — Architecture & Technical Specification

> A fast, mobile-first, **zero-build** web app for the 2026 FIFA World Cup
> (Canada · Mexico · USA). Live scores, play-by-play commentary, official
> reviews, team & player performance, Golden Boot / Golden Glove, predictive
> market odds, weather, venue & fan context — all rendered client-side from a
> public-domain data feed, with a curated editorial layer on top.

---

## 1. Goals & principles

| Principle | How it's met |
|---|---|
| **No build step** | Plain HTML/CSS/JS. No bundler, no framework, no package install. Deploy by copying the repo root. |
| **No secrets in the client** | All data is either public-domain (openfootball) or modeled in-browser. No API keys are shipped. |
| **Works offline-ish** | Live feed first, bundled snapshot fallback. The freshness pill shows which is active. |
| **Realtime feel** | Live clocks, countdowns and odds re-price on 1s / 20s / 60s timers. |
| **iOS-native feel** | Safe-area insets, Apple web-app meta, system light/dark theme, bottom tab bar, SVG flags. |
| **Honest data** | Real values (scores, scorers, clean sheets) vs. modeled values (xG, ratings, VAR, weather) are visually labelled. |

---

## 2. High-level architecture

```
            ┌──────────────────────────────────────────────┐
            │                  index.html                   │
            │  header · top tabs · #view · bottom nav · fav │
            └───────────────┬──────────────────────────────┘
                            │ loads
        ┌───────────────────┴───────────────────┐
        │              assets/app.js             │
        │  (single-file app: data + logic + UI)  │
        └───────────────────┬───────────────────┘
                            │ fetch (60s)
   ┌────────────────────────┴────────────────────────┐
   │  REMOTE: openfootball/worldcup.json (CORS, CC0)  │
   │  LOCAL : data/worldcup.json  (bundled fallback)  │
   └──────────────────────────────────────────────────┘
```

`app.js` is intentionally a **single script in one closure**. All reference
data, computation and view rendering share that scope — there is no module
system to configure, and nothing is exposed on `window`. Views are pure
functions `state -> htmlString`; the shell swaps `#view.innerHTML` on demand.

### Data flow

1. `init()` wires the tabs/nav/favourite picker and kicks off `loadData()`.
2. `loadData()` fetches the **live** feed; on any failure it falls back to the
   **bundled snapshot**; `DATA_SOURCE` drives the freshness pill.
3. `render()` looks up `VIEWS[state.view]`, calls it, and injects the HTML.
4. Three timers keep it live: **1s** (countdowns + live clocks via
   `tickDynamic`), **20s** (re-render dynamic views), **60s** (re-fetch data).

---

## 3. Views (tabs)

| Tab | Function | Real data | Modeled |
|---|---|---|---|
| **Today** | `viewToday` | live/next match, results, scorers | live hero stats, newsroom |
| **Live** | `viewCommentary` | goals, scores | play-by-play colour, VAR, ratings, preview/report |
| **Schedule** | `viewSchedule` | 104 fixtures, dates, venues | US TV mapping, weather |
| **Groups** | `viewGroups` | standings, form (computed) | — |
| **Teams** | `viewTeams` | 48 nations, confederations | — |
| **Players** | `viewStats` | goals per player | assists, shots, pass %, rating |
| **Boot & Glove** | `viewAwards` | top scorers, clean sheets | saves |
| **Venues** | `viewVenues` | 16 stadiums, capacity, roof | climate avg, fan atmosphere |
| **Odds** | `viewPredictions` | — | live 1X2 markets + outright snapshot |

---

## 4. Feature engines (all in `app.js`)

- **Realtime / clocks** — `liveClock()` accounts for the half-time break;
  `countdownBoxes()` for upcoming kickoffs; `tickDynamic()` updates the DOM
  every second without a full re-render.
- **Golden Boot** — `goldenBoot()` aggregates real scorer data from the feed.
  100% real.
- **Golden Glove** — `goldenGlove()` computes clean sheets & goals conceded per
  team from real results; goalkeeper names from the `GK` roster; saves modeled.
- **Player performance** — `playerAgg()` derives goals (real) and models
  assists/shots/pass %/rating with a stable hash so rankings don't jitter.
- **Predictive odds** — `odds1x2()` blends team strength (proxied from the
  outright market) with current score and time remaining; re-prices live.
- **Editorial engine** — `reportFor()` produces a **preview** (pregame) or a
  **professional match report** (postgame) with the same voice; `ratingsFor()`
  & `manOfMatch()` add analysis; `newsroomFeed()` curates briefings + reports +
  previews into one ordered feed. `matchFeed()` builds minute-by-minute
  play-by-play (real goals + modeled colour, VAR, cards, saves).
- **Weather & fans** — `weatherFor()` models temperature/conditions per venue
  (roofed venues are climate-controlled); `fanInfo()` models attendance,
  atmosphere and travelling support from capacity and tie size.
- **Favourite team** — persisted in `localStorage` (`wc26_fav`); when set, the
  Today page re-orients around that team (banner, hero, fixtures, results).

---

## 5. Data model (openfootball match)

```jsonc
{
  "round": "Matchday 1",
  "date": "2026-06-11",
  "time": "13:00 UTC-6",
  "team1": "Mexico", "team2": "South Africa",
  "score": { "ft": [2,0], "ht": [1,0] },
  "goals1": [ { "name": "Julián Quiñones", "minute": "9" } ],
  "goals2": [],
  "group": "Group A",
  "ground": "Mexico City"
}
```

Knockout fixtures use placeholder team codes (`1A`, `W73`, …) which
`teamLabel()` expands to human labels until the bracket resolves.

---

## 6. Data sources & integration notes

| Source | Use | Status |
|---|---|---|
| **openfootball/worldcup.json** | Live scores, scorers, schedule | ✅ Active (CORS, public domain) |
| **Bundled snapshot** | Offline fallback | ✅ `data/worldcup.json` |
| **Polymarket / Kalshi** | Outright odds + live links | ✅ Snapshot + outbound links |
| **API-Football (API-Sports)** | Richer live stats/lineups | 🔌 Integration-ready (needs key + proxy) |
| **FIFA.com** | Official source | ⚠️ Not CORS-accessible to a static page |

**Why not FIFA.com directly?** `fifa.com` / `api.fifa.com` do not send CORS
headers, so a static browser app cannot read them client-side. The same is true
of API-Football, which additionally requires a secret key that must never be
shipped in client JS. To use either in production, add a tiny **serverless
proxy** (e.g. a Netlify Function) that holds the key and adds CORS, then point
`REMOTE` at it. The app's data layer (`loadData`) is already isolated so this is
a one-function swap — see `docs/ROADMAP.md`.

---

## 7. iOS / mobile optimization

- `viewport-fit=cover` + `env(safe-area-inset-*)` on header, tabs, bottom nav,
  footer and the favourite sheet.
- Apple web-app meta: `apple-mobile-web-app-capable`, status-bar style, title,
  `apple-touch-icon`, `format-detection=no`.
- **System theming**: `prefers-color-scheme` light/dark variable sets +
  per-scheme `theme-color`.
- **Bottom tab bar** with inline SVG icons (Home / Live / Matches / Stats /
  Odds) mirroring native iOS navigation.
- **SVG flags** via flagcdn vectors with an emoji fallback on error.
- Momentum scroll, no tap highlight, `touch-action: manipulation`, tabular
  numerics for scores/clocks.

---

## 8. Testing

`node` headless smoke test renders every view against the bundled data and
asserts non-empty HTML output, favourite-team mode, and the Boot/Glove leaders.
See `docs/ROADMAP.md` §Testing for the command. (No browser is required.)

---

## 9. File layout

```
index.html              # shell: header, tabs, #view, bottom nav, favourite sheet
assets/styles.css       # mobile-first + iOS theme + component styles
assets/app.js           # data load, all engines, all views, app shell
data/worldcup.json      # bundled fallback snapshot (openfootball, CC0)
mockup.html             # self-contained visual mockup (generated)
netlify.toml            # static deploy config
docs/ARCHITECTURE.md    # this document
docs/ROADMAP.md         # plan, milestones, integration & deploy guide
```
