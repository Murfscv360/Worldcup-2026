#!/usr/bin/env node
/* Fetches ESPN's public (keyless, undocumented but widely used) scoreboard
   endpoint for the Premier League and Championship and republishes a
   trimmed, source-labelled snapshot for football-hub's Live tab to read via
   raw.githubusercontent.com — the same "GitHub Action polls, app reads a
   same-origin mirror" pattern the World Cup dashboard already uses for real
   in-play scores (see .github/workflows/live-scores.yml), applied here
   because football-hub's own Live tab never had a real in-play feed, only a
   kickoff-clock estimate (see docs/FOOTBALL-HUB.md §6).

   Deliberately does NO team-name matching against this app's own fixture
   list here — that happens client-side in app.js, which can be tested
   against mocked data (this script can't: a GitHub Actions runner has real
   internet access, this repo's dev/CI environment may not). This script's
   only job is an honest, minimally-processed copy of what ESPN actually
   returned, so a client-side matching bug is a one-file JS fix, not a
   workflow re-run. */
'use strict';

const https = require('https');

const SOURCES = [
  { league: 'epl', slug: 'eng.1' },
  { league: 'championship', slug: 'eng.2' }
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; football-hub-mirror/1.0)', 'Accept': 'application/json' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} for ${url}`)); }
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(new Error(`Bad JSON from ${url}: ${e.message}`)); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// ESPN's scoreboard shape (events[].status.type.state: "pre"|"in"|"post";
// competitions[0].competitors[].{homeAway,score,team.{displayName,abbreviation}})
// is the same shape used by many open-source score-mirror projects — not
// officially documented, so this parses only the fields actually needed and
// skips (not throws on) any event missing them, rather than assuming the
// whole response is well-formed.
function normalizeEvent(ev, league) {
  try {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) return null;
    const home = (comp.competitors || []).find(c => c.homeAway === 'home');
    const away = (comp.competitors || []).find(c => c.homeAway === 'away');
    if (!home || !away) return null;
    const stateRaw = comp.status && comp.status.type && comp.status.type.state; // pre | in | post
    const state = stateRaw === 'in' ? 'live' : stateRaw === 'post' ? 'finished' : 'scheduled';
    const scoreOf = (c) => { const n = parseInt(c.score, 10); return Number.isFinite(n) ? n : null; };
    return {
      league,
      date: (ev.date || '').slice(0, 10),
      kickoff_utc: ev.date || null,
      state,
      clock: (comp.status && comp.status.displayClock) || null,
      period: (comp.status && comp.status.period) || null,
      home: { name: home.team && home.team.displayName, short: home.team && home.team.abbreviation, score: scoreOf(home) },
      away: { name: away.team && away.team.displayName, short: away.team && away.team.abbreviation, score: scoreOf(away) }
    };
  } catch (e) { return null; }
}

async function run() {
  const out = { fetched_at: new Date().toISOString(), source: 'ESPN scoreboard (keyless, best-effort)', leagues: {} };
  let anyOk = false;
  for (const { league, slug } of SOURCES) {
    try {
      const data = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`);
      const events = Array.isArray(data.events) ? data.events : [];
      out.leagues[league] = events.map(ev => normalizeEvent(ev, league)).filter(Boolean);
      anyOk = true;
      console.log(`${league}: ${out.leagues[league].length} events`);
    } catch (e) {
      out.leagues[league] = null; // explicit "this league's fetch failed", not an empty array (which would mean "no matches today")
      console.log(`${league}: FAILED — ${e.message}`);
    }
  }
  if (!anyOk) { console.error('Both leagues failed — not publishing a snapshot this run.'); process.exit(1); }
  process.stdout.write('\n' + JSON.stringify(out) + '\n');
}

run();
