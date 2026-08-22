# English Football Season 26/27 — Live Hub

> A second, standalone app in this repo (`football-hub/`) extending the
> World Cup Live Hub's proven pattern — zero-build, mobile-first, honest
> about real vs. modeled data — to year-round club football. Branded and
> built around the **2026-27 English football season**, covering the
> **Premier League**, the **EFL Championship** (the tier directly below it)
> and the **UEFA Champions League** together. One stop for live scores,
> tables, the real full fixture list, favourite-club tracking, US kickoff
> times & TV info, transfer news, football news, and prediction markets.
>
> Internally the app/codebase is still referred to as "Football Hub"
> (directory name, JS variable/function names, service-worker cache key) —
> only the user-facing brand (page title, header, PWA name/icon, launch
> splash) changed to lead with the season. It was previously branded
> "Premier League 26/27" and then "Football 26/27 Season"; see §8 for the
> full rebrand history.

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
        │  header · tabs (incl. My Teams) · #view ·     │
        │  competition switcher (Table/Fixtures/Teams) ·│
        │  bottom nav                                    │
        └───────────────────┬───────────────────────┘
                             │ loads
        ┌────────────────────┴────────────────────┐
        │          football-hub/assets/app.js       │
        │   (single-file: data + engines + views)   │
        └────────────────────┬────────────────────┘
                             │ fetch, per competition (EPL, Championship)
   ┌────────────────────────────┴────────────────────────────────┐
   │ 1. openfootball/football.json  2026-27/en.{1,2}.json           │
   │    (JSON feed — fastest once openfootball's generator catches  │
   │    up; empty until then)                                       │
   │ 2. openfootball/england  2026-27/{1-premierleague,               │
   │    2-championship}.txt  — parsed client-side (parseFootballTxt) │
   │    — the REAL, CONFIRMED, FULL 2026-27 fixture list (380 / 552   │
   │    matches) as published by the Premier League / EFL, updated    │
   │    with real scores by openfootball as the season is played;      │
   │    this is the primary live source right now, ahead of the JSON    │
   │    generator                                                        │
   │ 3. bundled data/{epl,championship}-2026-27.json — a vendored snap-  │
   │    shot of step 2, taken when this app was built, so it always      │
   │    renders even fully offline                                       │
   │ (separately, always-local) data/{epl,championship}-2025-26.json —   │
   │    last season's complete real results, used to (a) compute the     │
   │    "last season final table" reference shown until 2026-27 results  │
   │    exist, and (b) power the Fixtures tab's results archive          │
   │ STATIC: data/epl.json / data/championship.json (clubs, last-season  │
   │    table, promotion/relegation, title odds), data/ucl.json,          │
   │    data/news.json, data/transfers.json (club-tagged)                 │
   └────────────────────────────────────────────────────────────────────┘
```

**Why parse a `.txt` source directly?** As of this app's launch (24 Jul
2026), the Premier League and EFL had already published the full, real
2026-27 fixture list (19 & 25 June 2026 respectively), and openfootball's
source repo (`openfootball/england`) already mirrored it — but openfootball's
*generated JSON* repo (`openfootball/football.json`) had not yet been
rebuilt for the new season. Waiting on the JSON generator would mean
showing last season's fixtures for weeks after the real ones were public.
`parseFootballTxt()` reads the same plain-text format the JSON generator
itself consumes, so the app gets the real 2026-27 schedule — and, once
matches are played, real scores — without waiting on that rebuild.

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
| **Today** | `viewToday` | real-time season/opener countdown, defending champion, last results, My Teams strip | newsroom digest |
| **Live** | `viewLive` | today's matches (both divisions) with kickoff-driven status, UK + Central (Chicago) kickoff time, US TV note | professional "Analyst's Desk" commentary per match |
| **My Teams** | `viewMyTeams` | last result + next fixture (UK + Central time, TV) + league position per followed club, across both divisions | tagged news/transfer items per club |
| **News** | `viewNews` | — | curated football news feed (`data/news.json`), club-tagged |
| **Transfers** | `viewTransfers` | — | curated confirmed-deals tracker (`data/transfers.json`), club-tagged |
| **Table** | `viewTable` | full table computed from real match results for the selected competition (EPL or Championship), zones shaded per competition's own promotion/relegation rules | — |
| **Fixtures** | `viewFixtures` | confirmed fixtures (opener, Community Shield); full prior-season results archive, filterable | — |
| **Teams** | `viewTeams` | this season's clubs for the selected competition — ground, city, founded, promoted/relegated flags | crest colours |
| **Champions League** | `viewUCL` | 25-26 result recap, 26-27 English entrants, format, key dates | — |
| **Odds** | `viewOdds` | title-winner market snapshot (dated, sourced) | weekly 1X2 predictor (activates once fixtures are live), clearly labelled informational |
| **Fantasy → Best XI** | `viewFantasyBest` | — | curated "top 3 per position" guide (`data/players.json`), grounded in real 2025-26 Premier League honours and stats |
| **Fantasy → My Team** | `viewFantasyMyTeam` | your live squad, gameweek points, rank, per-player expected points ("xPts") and injury flags, fetched directly from the official Fantasy Premier League API for a team ID you enter | captain/bench recommendations computed by comparing real `ep_next` values across your own squad |

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
- **Real-time countdown** — `countdownBoxes()`/`tickCountdowns()` render a
  Days/Hours/Min/Sec countdown to the season opener's *exact kickoff
  instant* (not just midnight of the date), driven by a 1-second
  `setInterval` that updates any `[data-countdown]` element in the DOM
  directly (no full re-render needed). Earlier revisions had a hardcoded
  build-time date baked into this calculation — a real bug, since it froze
  the countdown at the same number of days forever regardless of when the
  app was actually opened. Fixed to always read the real `Date()`.
- **Timezone conversion (Central Time)** — kickoff times in the fixture
  data are UK local (Europe/London). `kickoffInstant()` resolves the real
  UTC instant via the `Intl` API (handling BST/GMT correctly — no
  fixed-offset assumption), and `fmtCentral()` formats it for
  America/Chicago, so the displayed abbreviation (CDT in summer, CST in
  winter) is always correct rather than hardcoded. Shown alongside the UK
  time on every match card with a known kickoff.
- **US TV info** — `tvNote()` returns a verified, sourced note per
  competition: Peacock (+ NBC/USA Network for marquee matches) for the
  Premier League, Paramount+ (+ CBS Sports Network) for the Championship —
  see §6 for sources. This is a general "how to watch" note, not a
  per-match channel assignment we can't verify.
- **Live radio** — `radioBlock()` links directly to real UK radio
  broadcasters, each **labelled with its actual region** rather than
  presented as universally accessible — talkSPORT and BBC Radio 5 Live are
  UK-only (BBC Sounds has enforced this since July 2025), so the app also
  surfaces TuneIn Premium, talkSPORT's own real, paid, US/Canada/Mexico
  product, and explicitly does not suggest VPNs/proxies to bypass either
  broadcaster's territorial rights (see §6). For the Premier League,
  `talkSportLikely()` checks a match against talkSPORT's own published
  coverage pattern (every Friday/Monday match, plus Saturday 12:30 and
  15:00 kickoffs) and only shows a talkSPORT link when a match actually
  fits it. For the Championship, coverage is fragmented across 24 clubs'
  local BBC stations and club-run streams, so the app links to BBC Sounds
  generally
  instead of guessing a specific station per match.
- **Live match status + professional commentary** — `matchStatus()`
  derives Upcoming / Live / Full-time from the real kickoff instant vs. the
  current time (no fabricated in-play score — see the honesty note in
  §4/§6). While "live," `liveClockText()` shows an estimated match clock
  (kickoff → 90+' with a halftime-break allowance), the same technique the
  World Cup app uses for its live clock. `commentaryFor()` generates an
  "Analyst's Desk" preview (pre-kickoff) or recap (post-match) paragraph
  from **real** inputs only — league position, points, and a 5-match form
  streak computed from actual results — never fabricated stats, scorers, or
  play-by-play we don't have data for.
- **Fantasy watch** — `viewFantasy()` renders `data/players.json`, three
  players per position (GK/DEF/MID/FWD) with a real stat line and a short
  editorial note each. This is a **curated snapshot**, not a live Fantasy
  Premier League integration: this app has no player-level data feed (the
  openfootball results feed only carries team scores, not lineups or
  individual stats), and the public FPL API
  (`fantasy.premierleague.com/api/bootstrap-static/`) was unreachable from
  this app's build environment and its cross-origin support for a static
  page was never verified — so rather than wire up an unverified live
  integration or fabricate player stats, the picks are hand-researched from
  real, sourced 2025-26 season honours (Golden Boot, Golden Glove, Playmaker
  of the Season, PFA/fan Team of the Season) and dated like the rest of the
  app's curated content.
- **My FPL Team** — `loadFplTeam(id)` fetches a visitor's own squad once they
  enter their team ID (found in their own team's URL). The ID is stored only
  in that visitor's `localStorage` (`fh_fpl_id`) — never hardcoded, never
  sent anywhere but the FPL data path below. `fplRecommendations()` then
  compares **real fields already in that response** — `ep_next` (FPL's own
  official expected-points-next-gameweek model), `status`/
  `chance_of_playing_next_round` (injury/rotation flags) and `news` (FPL's
  own injury text) — across the visitor's own squad, e.g. suggesting a
  captaincy switch when a non-captained starter has a higher `ep_next`, or
  flagging a starter with a fit, higher-`ep_next` bench alternative. This is
  **not** a separate prediction model invented by this app; every number
  shown and every recommendation is a direct comparison of values the
  official API already computed.
  **Real, hands-on limitation and how it was fixed:** an early version of
  this feature called the official Fantasy Premier League API
  (`fantasy.premierleague.com/api/...`) directly from the browser. Testing
  it on the real deployed preview showed the direct fetch failing outright —
  the public FPL API does not reliably support cross-origin browser requests
  from third-party sites. Rather than ship that broken state, the app now
  routes through its own serverless proxy — `netlify/functions/fpl-proxy.js`
  (Netlify Function) — which re-fetches the same public, unauthenticated FPL
  endpoints server-side, where browser CORS doesn't apply, and returns them
  with permissive CORS headers. The client (`fplProxyUrl()` in app.js) calls
  a relative `/.netlify/functions/fpl-proxy` path when served from a
  `netlify.app` host (production or any PR preview talks to its own
  freshly-deployed function), and the production Netlify function's absolute
  URL otherwise (e.g. from GitHub Pages, which can't run functions itself).
  The proxy only allows a fixed whitelist of read-only FPL paths
  (`bootstrap-static/`, `entry/{id}/`, `entry/{id}/event/{event}/picks/`,
  `entry/{id}/history/`) — it is not a general-purpose proxy. The full
  render pipeline (squad, recommendations, captain/bench logic) was
  verified end-to-end against a realistic mocked response matching this
  schema; the proxy's own upstream fetch to the real FPL API could not be
  exercised from this app's sandboxed build environment
  (`fantasy.premierleague.com` was unreachable for testing there), though
  Netlify Functions run on normal internet infrastructure, unlike a
  visitor's browser, so it isn't subject to the CORS restriction that broke
  the direct-fetch version. If the proxy or the FPL API is ever
  unreachable, the tab shows a plain-language error with a direct link to
  the visitor's real team on fantasy.premierleague.com, instead of a
  silent blank screen or fabricated data.
- **Suggested transfers** — `fplFreeTransfers()` reconstructs the number of
  free transfers a visitor actually has banked from real per-gameweek
  history (`entry/{id}/history/`'s `current` array and `chips` array),
  replaying the documented 2026-27 FPL transfer rules: 1 free transfer per
  gameweek, banked up to a maximum of 5, each extra transfer beyond that
  costing 4 points, and a Wildcard/Free Hit removing that cost for the
  gameweek while leaving the banked count unchanged either way (verified
  against the official FPL FAQ). There's no single "free transfers
  remaining" field in the public API, so this is a genuine reconstruction,
  not a guess. `fplTransferSuggestions()` then searches the *entire* player
  pool (not just the visitor's squad) for a same-position, available
  (`status === "a"`), affordable replacement for each squad player — budget
  is that player's own `now_cost` plus the squad's `bank`, since the public
  API doesn't expose a visitor's exact sell price (which can sit below
  market price after a rise, under FPL's profit-taking rule — disclosed in
  the UI) — and only surfaces a swap once its `ep_next` gain clears the real
  transfer-cost penalty for its position in the queue (free if a transfer
  is still banked or a Wildcard/Free Hit is active, else −4), deduplicated
  so the same incoming player is never suggested to fill two different
  squad slots at once. Every suggestion shows its exact point math (gain,
  cost, net) rather than a bare verdict.
- **Lineups** — this app does not show starting lineups, for the same
  reason: no data source has that information. Rather than fabricate an XI,
  `lineupsNote()` shows an honest note on each live/upcoming match card
  pointing to the official match centre (premierleague.com or efl.com),
  where confirmed lineups are published shortly before kickoff.
- **Live refresh cadence** — mirrors the World Cup app: countdowns tick
  every 1s, dynamic views (Live/Today) re-render every 20s to pick up
  status transitions, and the full data set re-fetches over the network
  every 60s and whenever the tab regains focus (`visibilitychange`) — so
  scores update automatically once the season's real results start
  landing, without the visitor needing to reload.

---

## 6. Data sources & integration notes

| Source | Use | Status |
|---|---|---|
| **openfootball/football.json** (`2026-27/en.{1,2}.json`) | Live EPL/Championship results, generated JSON | 🔌 Not yet published as of launch — tried first, used automatically once it appears |
| **openfootball/england** (`2026-27/{1-premierleague,2-championship}.txt`) | Real 2026-27 fixtures now, real scores once played | ✅ Active — the actual primary live source; parsed client-side, see §3 |
| **Bundled `data/{epl,championship}-2026-27.json`** | Offline fallback for the current season | ✅ Vendored snapshot of the real fixture list (380 / 552 matches, no scores yet) |
| **Bundled `data/{epl,championship}-2025-26.json`** | Last-season reference table + results archive | ✅ Vendored copies of the real, complete 2025-26 feeds |
| **`data/epl.json` / `data/championship.json`** | Clubs, promoted/relegated, Golden Boot, title-odds snapshot | ✅ Hand-curated from verified sources (see file header); last-season tables are **computed**, not typed — see §1a and the load scripts in the PR history. The Championship table applies a real 6-point deduction to Leicester City (EFL Profit & Sustainability Rules breach, upheld on appeal) — without it, a pure results table would incorrectly keep Leicester up and Blackburn Rovers down, which the real, confirmed 2026-27 fixture list (Blackburn present, Leicester absent) proved wrong. The 2026-27 Championship club roster (incl. Bolton Wanderers, Cardiff City, Lincoln City up from League One) is cross-checked against that same real fixture list, not assumed. |
| **`data/ucl.json`** | UCL 25-26 recap + 26-27 entrants/dates | ✅ Hand-curated (draw is 27 Aug 2026 — the 26-27 league-phase table does not exist yet and is **not fabricated**) |
| **`data/news.json` / `data/transfers.json`** | Editorial feed, club-tagged (`clubs: [...]`) | ✅ Hand-curated, dated, sourced |
| **`data/players.json`** | Fantasy → Best XI — top 3 per position | ✅ Hand-curated from real, sourced 2025-26 Premier League honours/stats (Golden Boot, Golden Glove, Playmaker/Team of the Season) — not a live FPL feed, see §5 |
| **Official Fantasy Premier League API** (`fantasy.premierleague.com/api/...`) | Fantasy → My Team — live squad, points, rank, expected points, recommendations | ✅ Real, live, official — fetched server-side via `netlify/functions/fpl-proxy.js` (not directly from the browser), after a direct-fetch attempt was tested and confirmed to fail on CORS grounds; see §5 |
| **flashscore / BBC Sport / ESPN / premierleague.com** | (referenced in the original build brief as the desired live-score experience) | ❌ Not used as a source — no public API, no CORS, scraping would violate ToS. See §1a. |
| **A live in-play provider** (API-Football, Opta, etc.) | Minute-by-minute live scores during matches | 🔌 Integration-ready — same proxy pattern documented in the World Cup app's `docs/ROADMAP.md` M1: a serverless function holds the key, the client fetches the function. Until wired up, this app's "live" table/results reflect the openfootball feed's own update cadence (after full time, not per-minute in-play); the Live tab's "LIVE" badge/clock is a kickoff-time estimate, not a synced in-play feed (see the note printed on that tab). |
| **US TV rights (Premier League)** | `tvNote("epl")` copy | ✅ Verified: NBCUniversal holds exclusive US rights through 2027-28; Peacock streams all matches, NBC/USA Network carry marquee fixtures. [NBCUniversal six-year extension](https://corporate.comcast.com/press/releases/nbcuniversal-six-year-extension-exclusive-us-home-of-premier-league), [RenderFoot 2026/27 guide](https://www.renderfoot.com/blog/how-to-watch-premier-league-in-usa) |
| **US TV rights (Championship)** | `tvNote("championship")` copy | ✅ Verified: CBS Sports holds exclusive US rights through 2027-28; Paramount+ is the primary stream, CBS Sports Network carries marquee fixtures. [SportsPro: CBS Sports snaps up exclusive EFL rights](https://www.sportspro.com/news/efl-cbs-sports-us-exclusive-tv-broadcast-rights-agreement/), [RenderFoot EFL guide](https://www.renderfoot.com/blog/how-to-watch-efl-championship-in-usa) |
| **Live radio (EPL)** | `RADIO` / `talkSportLikely()` / `radioBlock()` | ✅ Verified: talkSPORT is the Premier League's official UK radio broadcast partner ([premierleague.com partner page](https://www.premierleague.com/en/about/partners/talksport)) and, per its published coverage pattern, carries live commentary of every Friday- and Monday-night match plus Saturday 12:30/15:00 kickoffs ([wheresthematch.com talkSPORT schedule](https://www.wheresthematch.com/talksport/)). `talkSportLikely(m)` only asserts talkSPORT coverage for matches that fit that documented pattern. |
| **Radio region restrictions** | `RADIO.*.region` labels + on-tab note | ✅ Verified and important: as of **July 2025 the BBC restricted BBC Sounds to UK IP addresses** ([BBC News](https://feeds.bbci.co.uk/news/articles/c5yg065058no)), so both the BBC Radio 5 Live and talkSPORT direct-site streams are effectively UK-only — this is exactly why talkSPORT built [a paid partnership with TuneIn](https://www.businesswire.com/news/home/20220809005157/en) as the *legitimate* licensed product for US/Canada/Mexico listeners. The app labels each link's real region (`UK only` vs. `US/Canada/Mexico — paid subscription`) instead of presenting all three as interchangeable, and does **not** link or suggest VPN/proxy services to route around either broadcaster's territorial licensing — that would mean facilitating a ToS violation and undermining the rights holders' own paid product, not a feature this app builds. |
| **Live radio (Championship)** | `radioBlock()` | ✅ Deliberately general, not per-club: EFL coverage is fragmented across 24 different local BBC stations (also UK-only) and club-run (often paywalled, region varies) commentary — accurately mapping every club would require research this app doesn't have a verified source for, so it links to BBC Sounds generally instead of guessing a specific station or club per match. |

**Why not fabricate a 2026-27 UCL table?** The league-phase draw happens 27
August 2026 — no pairings, and therefore no table, exist yet. Inventing them
would violate the "honest data" principle that makes the World Cup hub
trustworthy, so the UCL tab shows only what's real: the confirmed entrants,
format, and dates (§4/§6).

The EPL/Championship situation is different and worth calling out: both
fixture lists *are* real and fully published (see §3), so this app uses them
in full — all 380 + 552 matches, not just the headline opener. What's
**not** shown is a fabricated *table* for a season with no results yet; the
Table tab is explicit about that (§4) and shows last season's real final
table as a clearly labelled reference until 2026-27 results exist.

---

## 7. File layout

```
football-hub/
  index.html                       # shell: header, tabs (incl. My Teams), #view, bottom nav
  assets/styles.css                 # adapted from the World Cup app's mobile-first/iOS styles (EPL purple / UCL indigo accent)
  assets/app.js                      # multi-competition data load (incl. parseFootballTxt), table/season/odds/newsroom/favourites engines, all views
  data/epl.json                       # EPL clubs, last-season table meta, promotion/relegation, Golden Boot, title odds
  data/epl-2026-27.json                # vendored real 2026-27 EPL fixture list (380 matches, no scores yet — offline fallback)
  data/epl-2025-26.json                 # vendored real, complete 2025-26 EPL season (380 matches — reference table + archive)
  data/championship.json                 # Championship clubs, last-season table meta, promotion/relegation, play-off note
  data/championship-2026-27.json          # vendored real 2026-27 Championship fixture list (552 matches — offline fallback)
  data/championship-2025-26.json           # vendored real, complete 2025-26 Championship season (557 incl. play-offs — reference + archive)
  data/ucl.json                             # UCL 25-26 recap + 26-27 entrants/format/dates
  data/news.json                             # curated news feed, club-tagged
  data/transfers.json                         # curated transfer tracker, club-tagged
  data/players.json                            # Fantasy tab — top 3 per position, curated from real 2025-26 honours/stats
  manifest.webmanifest                         # PWA manifest
  sw.js                                         # service worker (same network-first shell pattern)
  icon.svg                                       # app icon
netlify/functions/fpl-proxy.js                      # server-side proxy for the official FPL API (Fantasy → My Team)
docs/FOOTBALL-HUB.md                              # this document
```

---

## 8. Rebrand history

Three rebrand passes so far, all **user-facing brand strings only** — no
scope, routes, or data changed at any point:

**Pass 1 — "Football Hub" → "Premier League 26/27"**

| File | What changed |
|---|---|
| `index.html` | `<title>`, `<meta name="description">`, `apple-mobile-web-app-title`, header eyebrow/`<h1>`/tagline (`PREMIER LEAGUE` / `26<span>/27</span>`), launch splash eyebrow/title/sub/CTA |
| `manifest.webmanifest` | `name`, `short_name`, `description` |
| `icon.svg` | `aria-label`, the baked-in text glyphs (`26/27` / `PREMIER LEAGUE`) |
| `README.md` | Section heading + blurb |
| `docs/FOOTBALL-HUB.md` | Title + intro |

**Pass 2 — "Premier League 26/27" → "Football 26/27 Season"**

Same set of files, same fields, with the eyebrow/short brand changed from
`PREMIER LEAGUE` to `FOOTBALL` (header, launch splash, icon) since the app
covers three competitions, not just the Premier League — the season number
(`26/27`) stays the visual anchor either way. `apple-mobile-web-app-title` /
`short_name` changed `PL 26/27` → `Football 26/27`.

**Pass 3 — "Football 26/27 Season" → "English Football Season 26/27"**

Same set of files/fields again. Eyebrow/short brand changed `FOOTBALL` →
`ENGLISH FOOTBALL` (header, launch splash, icon — icon glyph font-size/
letter-spacing reduced from 30/8 to 24/3 so the longer string still fits
the 512px canvas with margin; header `.brand-eyebrow` letter-spacing
tightened from 4px to 2.5px for the same reason). `apple-mobile-web-app-title`
/ `short_name` changed `Football 26/27` → `Eng. Football 26/27`. The header
tagline was shortened from `Prem · Championship · UCL · My Teams` to
`Prem · Championship · UCL` to make room for the longer eyebrow at common
phone widths — even so, `ENGLISH FOOTBALL` wraps to two lines on many
phones (it did not before), which is an accepted cosmetic trade-off, not a
layout bug: nothing clips or overlaps.

**Deliberately left unchanged in all three passes** (internal, not user-facing):
the `football-hub/` directory name, `assets/app.js`'s internal naming
(`COMPS`, `DATA`, function names), and the service worker's cache-key
prefix (`football-hub-`). Renaming those would touch every file path in
this doc and the PR history for zero user-visible benefit — the brand
lives in what people see (title bar, home-screen icon, header, splash),
not in source-file naming.
