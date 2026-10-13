# Worldcup-2026 — project memory

Two apps in this repo: the World Cup 2026 dashboard (repo root) and
**football-hub/** (English Football 26/27 Hub — Premier League, Championship,
Champions League, and a live Fantasy Premier League assistant). Most active
work has been on football-hub's Fantasy → My Team feature. See
`docs/FOOTBALL-HUB.md` for the full design doc — this file is just the
durable facts and standing rules a fresh session needs before it starts.

## Real FPL account context

- Team ID: **5933243** ("Chitown Bangers", manager John Murphy).
- A private family mini-league was discussed; as of this writing it's not
  confirmed set up. Don't assume it exists until the user says so or
  `FPL.league`/`FPL.leagueStandings` for a real session shows one.

## Standing rule: never automate the real FPL account

Asked for, in many different framings, across this whole project — and
declined every time, for three independently-sufficient reasons:
1. A Claude Code Remote cloud session's sandbox cannot reach
   `fantasy.premierleague.com` at all (confirmed repeatedly: curl, WebFetch,
   and a real Playwright browser all fail against it — see below).
2. The platform's own safety classifier blocked even *researching* FPL's
   private write-endpoints from a public, MIT-licensed open-source repo.
3. There's no safe way to store a real login credential in a public,
   multi-visitor static web app.

The app **never logs in, never submits transfers, never touches the real
account** — every recommendation is manual: the visitor reads it and acts on
fantasy.premierleague.com themselves. This held even once "Alfred" (below)
gave the project a path to real, continuous data: Alfred reads the public
API and records what the user tells it he did on the real site — it has
never been given write access, and nothing in this codebase accepts or
stores an FPL credential. If automating the real account resurfaces, the
refusal stands regardless of framing — explain why rather than silently
declining.

## "Alfred" — the system that actually gives this app live data

A **separate, persistent Claude Code session running on the user's own
home PC/NAS**, with real unrestricted internet access (unlike a cloud
session's sandbox — see below). Alfred runs on its own schedule — roughly
every 3 hours around the clock, plus a dedicated Friday scouting run, a
daily news watch, and a daily schedule read — and commits its output
straight to `data/alfred-*.json` on `main` under the user's own GitHub
identity. **It has been running continuously and reliably since at least
2026-10-10.** This solves the cloud session's network problem by sidestepping
it entirely: rather than this session fetching live data (it can't), Alfred
pre-fetches it on real hardware and checks the result into the repo, where
the static app just reads it like any other bundled JSON file.

Four files, each independently optional (the app runs fine with any or all
of them missing or stale — see "Fetched defensively" below):

- **`data/alfred-fpl.json`** — the session-maintained "golden record" of the
  real squad. Exists because the public FPL API only exposes a **completed**
  gameweek's picks — it can't see a transfer made this week until the
  deadline passes. Alfred reconciles this file against the real API after
  every deadline, and in between relies on what the user tells it directly
  (screenshots, in-app confirmation — see the file's own `changelog` array
  for the full provenance trail). `football-hub/assets/app.js` reads this as
  `ALFRED` and, only when it's at least as current as what the public API can
  see (`fplSquadTrust()` is the gate), overrides the squad built from stale
  API picks so every downstream section (recommendations, transfers, chips)
  reflects the squad the user actually owns.
- **`data/alfred-news.json`** — a rolling ~1-week window of real
  injury/availability changes, pre-filtered to this specific squad, deduped,
  with an honest `unreachable` list per check (a source that couldn't be
  reached that day is disclosed, not silently folded into "no news").
  Rendered as `ALFRED_NEWS` / `fplAlfredNewsHtml()`.
- **`data/alfred-scouting.json`** — a Friday dispatch covering every fixture
  in the upcoming gameweek: a real Poisson win/draw/loss model (team
  strength + fixture difficulty) and the players worth watching in each,
  with an honest caveat baked into its own `note` field about what that
  model can and can't tell you. Rendered as `ALFRED_SCOUT` /
  `fplAlfredScoutingHtml()`.
- **`data/alfred-schedule.json`** — per-club fixture-difficulty runs several
  gameweeks out. Not yet wired into the UI as of this writing (a reasonable
  next step if it's ever needed beyond what `fplUpcomingFixtures()` already
  computes from the real `fixtures/` endpoint).

All three wired-in files are fetched via the shared `fetchAlfredFile(name)`
helper (resolves relative to the document first, since this app is served
from roots with different depths — Vercel/Netlify at `/football-hub/` vs.
GitHub Pages at `/Worldcup-2026/football-hub/` — with an absolute
`/data/<name>` fallback). **Fetched defensively**: any failure (file
missing, bad JSON, wrong origin) just leaves the corresponding global
`null`, and every render function checks for that and returns `""` — a
missing or stale Alfred file degrades the app back to exactly how it
behaved before Alfred existed, never a half-rendered section.

## Network reality of a Claude Code Remote cloud session

A cloud session's egress policy blocks essentially everything outside a
narrow allowlist — `raw.githubusercontent.com` works; `fantasy.premierleague.com`,
`feeds.bbci.co.uk`, `englishfootballleague.vercel.app` (the app's own API
proxy — see below), and most other public APIs do **not** (confirmed via
curl and WebFetch, repeatedly, across sessions months apart). This is an
environment-level policy, not something a tool call from inside the session
can change. **This does not affect real visitors or Alfred** — the deployed
app works normally in any real browser, and Alfred's home hardware has
normal internet access; only a cloud session's own outbound calls are
restricted. Don't re-verify this by re-testing the same endpoints every
session — it has been confirmed enough times that the useful question is
"has Alfred or a real deploy already solved this," not "can I reach it from
here."

## Hosting: Netlify → Vercel migration (2026-10-02)

Netlify's free tier ran out of resource/credit allowance, so the FPL and
news proxy functions were ported from Netlify Functions to Vercel (logic
unchanged, only the handler signature: Netlify's
`exports.handler = async (event) => {}` → Vercel's `(req, res)`). Current
state:
- **`api/fpl-proxy.js`** and **`api/news-proxy.js`** are the live Vercel
  functions, deployed at **`englishfootballleague.vercel.app`**
  (`FPL_PROXY`/`NEWS_PROXY` in `football-hub/assets/app.js` point here).
- **`netlify/functions/fpl-proxy.js`** and **`netlify/functions/news-proxy.js`**
  are dead code, kept only so the history/comments in them aren't lost — the
  front end no longer calls them.
- GitHub Pages (`pages.yml`, deploys on every push to `main`) is still
  believed to be the primary static-site host
  (`murfscv360.github.io/Worldcup-2026/football-hub/`); `vercel.json` also
  configures cache headers for a full-site deploy, so Vercel may be hosting
  a mirror of the static site too, not just the API functions — this
  hasn't been independently confirmed from a cloud session (see network
  note above). Ask the user which URL is canonical if it matters for a
  specific task, rather than assuming.

## Git workflow

`origin/main`'s history is **continuously appended to by Alfred**, roughly
every 3 hours, always touching only `data/alfred-*.json`. Before starting
work: `git fetch origin main` and branch fresh from it
(`git checkout -B <branch> origin/main`) rather than reusing an old local
branch — Alfred's commits mean `origin/main` moves even when no one asked
for an app change, and an old branch's history can end up with no common
ancestor at all. Before pushing: re-fetch and rebase/recreate from the
latest `origin/main` to avoid clobbering Alfred's latest data commits — and
never hand-edit `data/alfred-*.json` (Alfred owns those files; a conflicting
manual edit will just get overwritten on its next run anyway).

- **Real data only, never fabricate.** Every number/threshold traces to a
  real FPL/openfootball API field, a real value Alfred fetched, or a
  disclosed, hard-coded threshold explained in the UI copy — never an
  invented model or guessed statistic. When something can't be verified
  from this session, say so in the code comments and to the user, rather
  than guessing.
