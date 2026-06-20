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
- Schedule (104 matches, ET + local times, US TV), 12 groups & live standings, 48 teams, 16 venues.
- Built on the public‑domain openfootball feed; no build step; deploys as a static site.
