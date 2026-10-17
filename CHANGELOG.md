# Changelog — FIFA World Cup 26™ Live Hub

Headline features by release. Modeled values (xG, ratings, VAR, weather, cards)
are labelled in‑app; scores, scorers, standings & clean sheets come from live data.

## v1.0 — Live launch (Jun 20, 2026)
- Real **live scores & scorers** overlaid from worldcup26.ir (polls every 15s; openfootball schedule + bundled snapshot fallback).
- **Always-on score mirror** — a scheduled GitHub Action fetches the feed server-side and republishes it on our own CDN origin, so live scores stay reachable even when the source is slow or geo-blocked in a visitor's browser.
- **Instant refresh on reopen** — the app re-pulls scores the moment it returns to the foreground (no waiting for the next poll after iOS suspends background timers).
- Live match **hero**: score, clock, possession/shots/xG/corners, win‑probability bar & momentum.
- **Knockout bracket projected on current form** — predicted scorelines, ⚪ penalty ties, connector lines, auto‑scroll to the current round, unique R32 resolution, lock‑on‑announce.
- **Predicted champion** banner + your favourite team's **highlighted path** to the final.
- Group **qualification scenarios** ("advance if…") and the **best‑3rd‑placed** race.
- Sleek **FIFA‑style** theme (navy/blue, Archivo/Inter type) + launch welcome screen.

## v0.9 — Analyst tools
- **Form‑weighted power rating** (pre‑tournament prior regresses to real points/GD as games are played).
- **Player performance** table (goals, assists, shots, pass %, rating) + 🟨/🟥 **cards & suspension watch** (yellows wiped after the QFs).
- **Golden Boot** (real scorers) & **Golden Glove** (real clean sheets).
- Live & outright **prediction markets**.

## v0.8 — Editorial & match centre
- Minute‑by‑minute **play‑by‑play**, **VAR / official reviews**, pregame **previews** & postgame **reports** with player ratings.
- Curated **Newsroom** feed; tap any match to open its **match centre**.
- **Weather** per game, venue climate & **fan/attendance** context.

## v0.7 — App & iOS
- Installable **PWA** (Add to Home Screen, offline, self‑updating service worker).
- iOS‑native **bottom nav + More** menu, light/dark, safe‑area layout, **SVG flags**.
- **Pull‑to‑refresh**, skeleton loaders, score‑change flash, sticky live mini‑scoreboard.
- **Favourite‑team** mode — the home screen re‑orients around your team.

## v0.6 — Foundation
- Schedule (104 matches, CT + local times, US TV), 12 groups & live standings, 48 teams, 16 venues.
- Built on the public‑domain openfootball feed; no build step; deploys as a static site.

## 2026-10-17 — FPL naming, real club crests, review fixes (Alfred)
- **Real club crests**: `data/alfred-crests.json` (Alfred, `fpl_crests.py`) maps all 44 clubs the app knows — 20 official Premier League
  badges (FPL `code` → resources.premierleague.com) + 24 ESPN logos (Championship); `crest()` shows the badge over the coloured club-code
  circle, and the circle returns if an image ever fails. Verified in WebKit at 390 px: 20/20 crests loaded on the Table view.
- **Renamed to FPL** so it is easy to find: home-screen/app name `FPL`, install name and page title `FPL — English Football 26/27`,
  launch card eyebrow `FPL · English Football`.
- **Review fix**: launch-card highlights were white (#fff) on the light card — invisible; now the accent colour.
- OTA: the Pages workflow stamps a new BUILD into `sw.js`, so installed copies drop the old cache and update on next open.

## 2026-10-17 — Capstone 1: real results feed (Alfred)
- `data/alfred-results.json`: every finished match (Premier League via the FPL fixtures API, Championship via ESPN), source per match.
- `loadCompetition()` fills scores openfootball has not published yet; the data-source line credits them ("+ N results from Alfred").
- Closes the REQUESTS.md item of 2026-10-13 (21 weekend results).

## 2026-10-17 — Capstone 2-8: AI Manager, fixture difficulty, mini-league, price watch, freshness, one host (Alfred)
- **AI Manager** (Fantasy, now the landing tab; also a Gameweek card on Today): the published call (HOLD / transfer, captain, vice),
  confidence, deadline countdown, and **how the AI decided** — the existing engine's plans vs HOLD (projection, hit, gain), its rules,
  and the decision-matrix captain ranking with weights. Engine captain vs published captain shown honestly with the override reason.
  Data: `data/alfred-ai.json` (surfaces the existing engine: fpl_simulate.search + decision matrix — no new decision logic).
- **Squad with crests + 5-fixture difficulty strip** (FPL's own 1-5 ratings, away marked): `data/alfred-fdr.json`.
- **Mini-league**: full standings with movement and your position-by-gameweek sparkline: `data/alfred-league.json`.
- **Price watch**: transfer pressure (labelled as pressure, not a prediction) for your squad + top risers/fallers: `data/alfred-prices.json`.
- **Freshness**: every panel shows its data age; a red "stale" label when a feed is behind.
- **Deadline notification**: Alfred's fpl_deadline re-enabled (T-24h, T-6h, T-90m) and now reads the PUBLISHED decision.
- **One host**: the Netlify copy was decommissioned 2026-10-03; GitHub Pages is the only host (monitor updated).
- Review fixes: price arrows only at >= 0.5 % pressure; bench-only swaps that tie with HOLD collapsed into one line.

## 2026-10-17 — Live every 30 s + Match centre with play-by-play (Alfred)
- **Live scores every 30 s** (EPL + Championship): the VPS runs the repo's own mirror script every 30 s and serves it at
  `212-28-185-173.sslip.io/fh/scores.json` (CORS = this app only, no-cache); the app polls it every 30 s and falls back to
  the GitHub branch copy (5-min CDN) if the VPS is unreachable. Mirror events now carry the ESPN event `id` and `slug`.
- **Match centre**: tap "📊 Match centre" on any live or just-finished EPL/EFL match for score + status, team stats
  (possession, shots, on target, corners, fouls, cards, offsides, saves, passes, pass %), key events and minute-by-minute
  play-by-play. Source ESPN summary (fetched in the browser), refreshes every 30 s while open; a failed refresh says so.
- **Listen**: reads NEW play-by-play lines aloud with the device's speech voice (text-to-speech of the written commentary,
  not a radio broadcast). Radio links stay on each card (talkSPORT / BBC 5 Live / club BBC local radio — region-limited).
- **Post-match: press & pundits** (News tab, top; and "What the press says" inside the Match centre): Guardian + BBC Sport
  post-match reports and manager/pundit reaction for finished EPL and EFL fixtures — the publishers' own headlines and
  standfirsts, quoted with links, attached only when both clubs are named (`data/alfred-pundits.json`, Alfred every 30 min).
  Match centre now also opens for today's finished fixtures.
