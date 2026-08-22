# Worldcup-2026 — project memory

Two apps in this repo: the World Cup 2026 dashboard (repo root) and
**football-hub/** (English Football 26/27 Hub — Premier League, Championship,
Champions League, and a live Fantasy Premier League assistant). Most active
work in this session has been on football-hub's Fantasy → My Team feature.
See `docs/FOOTBALL-HUB.md` for the full design doc — this file is just the
durable facts and standing rules a fresh session needs before it starts.

## Real FPL account context

- Team ID: **5933243** ("Chitown Bangers", manager John Murphy).
- The user wants a private, family-only FPL mini-league for a genuine
  head-to-head comparison (built and shipped: `fplHeadToHead()` auto-detects
  a real 2-manager private league and shows a direct comparison instead of a
  generic standings table). As of this writing the user had not yet
  confirmed that league exists / who else is in it — they mentioned adding
  James Gornilla, Luke Murphy, and Thomas Boatwright, then said "forget for
  now." Don't assume that league is set up until they say so.

## Standing rule: never automate the real FPL account

Asked for, in many different framings, across this whole project — and
declined every time, for three independently-sufficient reasons:
1. This sandboxed environment cannot reach `fantasy.premierleague.com` at
   all (confirmed repeatedly: curl, WebFetch, and a real Playwright browser
   all fail against it).
2. The platform's own safety classifier blocked even *researching* FPL's
   private write-endpoints from a public, MIT-licensed open-source repo.
3. There's no safe way to store a real login credential in a public,
   multi-visitor static web app.

The app **never logs in, never submits transfers, never touches the real
account** — every recommendation is manual: the visitor reads it and acts on
fantasy.premierleague.com themselves. Do not build a login form, accept
pasted credentials, add a "submit" button that talks to FPL, or connect to
any repo containing FPL credentials. If this resurfaces, the refusal stands
regardless of framing — explain why rather than silently declining.

## Network reality of this environment

This session runs in the Claude Code Remote environment `env_01NHezQW34eMsR3cRKmxxJJN`
("Default"), whose egress policy blocks essentially everything outside a
narrow allowlist (`raw.githubusercontent.com` works; `fantasy.premierleague.com`,
`feeds.bbci.co.uk`, and even this project's own deployed Netlify functions
(`*.netlify.app`) do **not** — confirmed via curl, WebFetch, and a
`--no-proxy-server` Playwright browser, all blocked). This is an
environment-level policy, not something a tool call from inside the session
can change. **This does not affect real visitors** — the deployed app works
normally in any real browser; only this session's own outbound calls are
restricted.

The user has a separate, more capable Claude session (nicknamed **"Alfred"**)
on their own home PC/NAS with real network access, which they intend to use
for anything requiring a live fetch (e.g. the BBC news feed) that this
session can't reach. As of this writing no live Alfred session was
reachable via `ListAgents` — this needs the user to start/reconnect it, or
give its exact session name/ID, before it can be messaged.

## Practical implications for the Fantasy feature

- `netlify/functions/news-proxy.js` and `netlify/functions/fpl-proxy.js`
  both work fine in production (Netlify has full outbound access) — they
  just can't be hand-verified from *this* session. Verify against the
  deployed preview/production URL, not by curling from here.
- The weekly Friday reminder Routine (`trig_01GzyoaEnWAMFMZrtQjeM9v2`, fires
  08:00 UTC every Friday, self-bound to this persistent session) does the
  captain/bench/transfer/chip/track-record review from data already known —
  it does **not** claim to pull live news each time, since it can't. Don't
  reinstate that claim without first solving the network-access problem
  (e.g. once an Alfred hand-off is working).

## App discipline (already established, keep following it)

- **Real data only, never fabricate.** Every number/threshold traces to a
  real FPL/openfootball API field or a disclosed, hard-coded threshold
  explained in the UI copy — never an invented model or guessed statistic.
  When something can't be verified from this session, say so in the code
  comments and to the user, rather than guessing.
- Git workflow: branch `claude/football-app-live-scores-woc0tz`. After a PR
  squash-merges, the branch's own git history diverges from `origin/main`
  (same content, different commit hash) — restart it with
  `git fetch origin main && git checkout -B claude/football-app-live-scores-woc0tz origin/main`
  (stash/pop any uncommitted work first), then `push --force-with-lease`,
  and open a **new** PR rather than reusing the merged one.
- Production URL: https://murfscv360.github.io/Worldcup-2026/football-hub/
