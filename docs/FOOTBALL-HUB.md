# Football Hub — Premier League + Championship + Champions League Live Reference

> A second, standalone app in this repo (`football-hub/`) extending the
> World Cup Live Hub's proven pattern — zero-build, mobile-first, honest
> about real vs. modeled data — to year-round club football: the **English
> Premier League**, the **EFL Championship** (the tier directly below it),
> and the **UEFA Champions League**. One stop for scores, tables, fixtures,
> favourite-club tracking, transfer news, football news, and prediction
> markets.

## 1a. Note on the reference sites in the original request

The build brief referenced flashscore, the BBC, ESPN and premierleague.com
as examples of the live-score experience wanted. None of those are usable
as a data source for a public, keyless static site: they have no public API,
no CORS headers for browser fetches, and scraping them would violate their
terms of service (and, for the sandbox this was built in, is blocked at the
network level regardless). Football Hub delivers the same *outcome* — live
tables, fixtures, and favourite-team tracking — through the same legal,
public-domain pipeline (`openfootball/football.json`) the World Cup hub
already uses, with an honest in-play-data gap documented in §6.

---

## 1. Why a separate app, not a third tab set bolted onto `assets/app.js`

`assets/app.js` (the World Cup app) is a single closure keyed entirely to the
openfootball **`worldcup.json`** match shape (national teams, groups,
knockout bracket, a fixed 39-day tournament window). Club football runs
year-round across two competitions with a different shape (clubs, an
August–May league season, a 36-team UEFA league phase, transfer windows).
Forcing both into one data model would make `app.js` harder to reason about
for no real benefit — the two apps don't share state, only a visual language
and a build philosophy. So `football-hub/` is a sibling static app with its
own `index.html` / `assets/` / `data/` / `manifest.webmanifest` / `sw.js`,
deployed alongside the World Cup hub from the same repo root.

---

## 2. Goals & principles (same as the World Cup hub)

| Principle | How it's met |
|---|---|
| **No build step** | Plain HTML/CSS/JS, one `app.js` closure. Deploy by copying `football-hub/`. |
| **No secrets in the client** | Live match data is the public-domain **openfootball/football.json** feed (CORS, CC0). No API keys shipped. |
| **Honest data** | Real results/standings (computed from real match data) vs. curated editorial (news, transfers, odds commentary) are visually labelled. Nothing is invented and presented as a live score. |
| **Season-aware** | The app has explicit states for **preseason** (countdown, transfer window, last season's table), **in-season** (live table, fixtures, results) and **off-season** — it doesn't fake live scores when nothing is being played. |
| **iOS-native feel** | Same safe-area, Apple web-app meta, system theme, bottom tab bar, PWA install as the World Cup hub. |

---

## 3. High-level architecture

```
        ┌───────────────────────────────────────────┐
        │            football-hub/index.html          │
        │  header · competition switcher · tabs ·      │
        │  #view · bottom nav                          │
        └───────────────────┬───────────────────────┘
                             │ loads
        ┌────────────────────┴────────────────────┐
        │          football-hub/assets/app.js       │
        │   (single-file: data + engines + views)   │
        └────────────────────┬────────────────────┘
                             │ fetch
   ┌────────────────────────────┴────────────────────────────┐
   │ REMOTE (EPL):  openfootball/football.json 2026-27/en.1.json │
   │   → falls back to 2025-26/en.1.json (completed, real)      │
   │   → falls back to bundled data/epl-2025-26.json snapshot   │
   │ STATIC: data/epl.json (clubs, last-season table, promotion/│
   │   relegation, Golden Boot), data/ucl.json (UCL 25-26 recap,│
   │   26-27 entrants/dates), data/news.json, data/transfers.json│
   └────────────────────────────────────────────────────────────┘
```

Same shape as the World Cup app's data layer: a `REMOTE`/`LOCAL` pair with
graceful fallback, `DATA_SOURCE` driving a freshness pill, views as pure
`state -> htmlString` functions swapped into `#view`.

### Season-state machine

The league-match feed (`openfootball/football.json`) only publishes a
season's file once fixtures exist, and results land after full time (not
per-minute live) — it is a **results/schedule** feed, not an in-play feed.
`loadData()` therefore tries, in order:

1. `2026-27/en.1.json` (current season — exists once the PL publishes it /
   openfootball mirrors it; empty/absent before kickoff).
2. `2025-26/en.1.json` (previous completed season, live off GitHub).
3. Bundled `data/epl-2025-26.json` (the same file, vendored, so the app
   always renders even fully offline).

`seasonState()` derives **preseason** / **in-season** / **between-rounds**
from today's date vs. the loaded season's first/last kickoff, and each view
renders accordingly — e.g. **Live** shows a kickoff countdown + Community
Shield in preseason, and the current/most recent matchday once the season is
live.

---

## 4. Views (tabs)

| Tab | Function | Real data | Curated/modeled |
|---|---|---|---|
| **Today** | `viewToday` | season/opener countdown, defending champion, last results, My Teams strip | newsroom digest |
| **My Teams** | `viewMyTeams` | last result + next fixture + league position per followed club, across both divisions | tagged news/transfer items per club |
| **News** | `viewNews` | — | curated football news feed (`data/news.json`), club-tagged |
| **Transfers** | `viewTransfers` | — | curated confirmed-deals tracker (`data/transfers.json`), club-tagged |
| **Table** | `viewTable` | full table computed from real match results for the selected competition (EPL or Championship), zones shaded per competition's own promotion/relegation rules | — |
| **Fixtures** | `viewFixtures` | confirmed fixtures (opener, Community Shield); full prior-season results archive, filterable | — |
| **Teams** | `viewTeams` | this season's clubs for the selected competition — ground, city, founded, promoted/relegated flags | crest colours |
| **Champions League** | `viewUCL` | 25-26 result recap, 26-27 English entrants, format, key dates | — |
| **Odds** | `viewOdds` | title-winner market snapshot (dated, sourced) | weekly 1X2 predictor (activates once fixtures are live), clearly labelled informational |

Table/Fixtures/Teams share a **competition switcher** (`compSwitcher()`) so
the same tab serves both divisions instead of doubling the tab bar; `My
Teams` and the favourite-club picker are competition-agnostic by design,
since a followed club (e.g. West Ham) can move between divisions season to
season — the picker groups clubs by division but stores just the club name,
and `CLUB_BY_SHORT` resolves it to whichever division it's actually playing
in this season.

---

## 5. Feature engines (`football-hub/assets/app.js`)

- **Table engine** — `computeTable(matches)` derives play/win/draw/loss/GF/GA/
  GD/points from real match results; **100% real**, no modeling. Colour bands
  mark the UCL slots (top 5, reflecting the coefficient-earned 5th English
  place), Europa/Conference slots, and the relegation zone.
- **Season-state engine** — `seasonState()` (see §3) drives every view's
  empty/loading/live rendering, so the app never shows a fake "LIVE" badge
  in the off-season.
- **Transfers tracker** — renders `data/transfers.json`, sorted by date
  desc, filterable by club; each entry links its source.
- **Newsroom** — renders `data/news.json`, a curated editorial feed in the
  same voice as the World Cup app's newsroom (season build-up, transfer
  window state, Champions League storylines).
- **Odds** — `data/epl.json#titleOdds` is a **dated snapshot** of real
  outright markets (Polymarket / UK bookmaker prices, converted to implied
  %), same presentation as the World Cup app's outright odds. The **weekly
  1X2 predictor** (`odds1x2()`, ported from the World Cup engine) activates
  once real fixtures + a form baseline exist, and is explicitly labelled
  "modeled, not a real market" the way the World Cup hero odds are.
- **Followed clubs (multi-select)** — persisted in `localStorage` (`fh_favs`,
  a JSON array), spanning both competitions — e.g. Arsenal (Premier League)
  and West Ham (Championship) can be followed simultaneously. The picker
  sheet groups clubs by division; toggling a club updates the array
  immediately (no separate "save" step). `My Teams` and the Today strip
  render from this array; `clubMatches()`/`lastResultFor()`/
  `nextFixtureFor()` look up each followed club's own competition feed for
  its last result and next fixture, and `NEWS`/`TRANSFERS` items carry a
  `clubs: [...]` tag so club-relevant stories surface automatically once
  they're added to the curated feed ("team news once announced").

---

## 6. Data sources & integration notes

| Source | Use | Status |
|---|---|---|
| **openfootball/football.json** (`en.1.json`) | EPL results & schedule, one file per season | ✅ Active (CORS, public domain); 2025-26 fully populated (380/380 matches), 2026-27 file appears once published |
| **openfootball/football.json** (`en.2.json`) | Championship results & schedule | ✅ Active; 2025-26 fully populated (557 matches incl. play-offs), same fallback chain as the EPL feed |
| **Bundled `data/epl-2025-26.json` / `data/championship-2025-26.json`** | Offline fallback / last-season baseline | ✅ Vendored copies of the real feeds |
| **`data/epl.json` / `data/championship.json`** | Clubs, promoted/relegated, Golden Boot, title-odds snapshot | ✅ Hand-curated from verified sources (see file header); tables are **computed**, not typed — see §1a and the load scripts in the PR history |
| **`data/ucl.json`** | UCL 25-26 recap + 26-27 entrants/dates | ✅ Hand-curated (draw is 27 Aug 2026 — the 26-27 league-phase table does not exist yet and is **not fabricated**) |
| **`data/news.json` / `data/transfers.json`** | Editorial feed, club-tagged (`clubs: [...]`) | ✅ Hand-curated, dated, sourced |
| **flashscore / BBC Sport / ESPN / premierleague.com** | (referenced in the original build brief as the desired live-score experience) | ❌ Not used as a source — no public API, no CORS, scraping would violate ToS. See §1a. |
| **A live in-play provider** (API-Football, Opta, etc.) | Minute-by-minute live scores during matches | 🔌 Integration-ready — same proxy pattern documented in the World Cup app's `docs/ROADMAP.md` M1: a serverless function holds the key, the client fetches the function. Until wired up, this app's "live" table/results reflect the openfootball feed's own update cadence (after full time, not per-minute in-play). |

**Why not fabricate a 2026-27 UCL table or full EPL fixture list?** The UCL
league-phase draw happens 27 August 2026 and the full EPL fixture list,
while released, is not part of the verified research baseline this app
shipped with — inventing specific fixture pairings and presenting them as
real would violate the "honest data" principle that makes the World Cup hub
trustworthy. The app instead models the **real** preseason state (countdown,
confirmed opener, confirmed calendar dates) and is architected so the live
feed takes over automatically, with no code change, the moment openfootball
publishes the 2026-27 file.

---

## 7. File layout

```
football-hub/
  index.html                     # shell: header, tabs (incl. My Teams), #view, bottom nav
  assets/styles.css               # adapted from the World Cup app's mobile-first/iOS styles (EPL purple / UCL indigo accent)
  assets/app.js                    # multi-competition data load, table/season/odds/newsroom/favourites engines, all views
  data/epl.json                     # EPL clubs, last-season table meta, promotion/relegation, Golden Boot, title odds
  data/epl-2025-26.json              # vendored real openfootball EPL season file (380 matches, fallback + table source)
  data/championship.json              # Championship clubs, last-season table meta, promotion/relegation, play-off note
  data/championship-2025-26.json       # vendored real openfootball Championship season file (557 matches incl. play-offs)
  data/ucl.json                         # UCL 25-26 recap + 26-27 entrants/format/dates
  data/news.json                         # curated news feed, club-tagged
  data/transfers.json                     # curated transfer tracker, club-tagged
  manifest.webmanifest                     # PWA manifest
  sw.js                                     # service worker (same network-first shell pattern)
  icon.svg                                   # app icon
docs/FOOTBALL-HUB.md                          # this document
```
