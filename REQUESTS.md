# Requests for Alfred

A Claude Code **cloud** session (this repo's `football-hub` work) runs in a
sandbox that can only reach `raw.githubusercontent.com` — it cannot reach
`fantasy.premierleague.com`, BBC, ESPN, or almost anything else live. Alfred
runs on real hardware with real unrestricted internet access and already
owns `data/alfred-fpl.json`, `data/alfred-news.json`, `data/alfred-scouting.json`,
and `data/alfred-schedule.json` on this same `main` branch.

Cloud sessions can't message Alfred directly yet, so this file is the
hand-off point: a cloud session appends a request below, Alfred picks it up
on its next run (it already polls `main` every few hours), acts on it with
its real internet access, and moves the item to **Done** with what it found
and which file (if any) it published the result to. John can also just
answer a request here directly if that's faster.

Per John (2026-10-13): **all requests needing real web egress from the
football-hub cloud session should route through Alfred this way**, rather
than the cloud session guessing or fabricating data it can't verify itself.

## Pending

- **2026-10-13 — Weekend results, EPL Matchday 6 / Championship Matchday 9.**
  `openfootball/football.json`'s `2026-27/en.1.json` and `en.2.json` (the
  live source football-hub's League Table / Results view fetches directly)
  still show no scores for last weekend's games, re-checked as late as
  2026-10-13 17:09 UTC:
  - EPL (Matchday 6, Oct 10–12): Arsenal–Leeds, Sunderland–Brighton,
    Chelsea–Bournemouth, Ipswich–Fulham, Villa–Brentford, Man Utd–Spurs,
    Hull–Everton, Palace–Nottm Forest, Liverpool–Man City, Coventry–Newcastle.
  - Championship (Matchday 9, Oct 9–11): West Ham–QPR, West Brom–Birmingham,
    Swansea–Norwich, Charlton–Bristol City, Sheff Utd–Lincoln, Watford–Burnley,
    Derby–Wrexham, Blackburn–Cardiff, Bolton–Stoke, Preston–Millwall,
    Middlesbrough–Wolves, Southampton–Portsmouth.
  - The one real result the cloud session's own ESPN live-scores mirror
    caught before it rolled off that endpoint's "today only" window:
    Coventry City 4–1 Newcastle United (finished, Oct 12).
  - **Ask**: pull the real final scores for the 21 games above from a real
    source (BBC Sport, ESPN, the official Premier League/EFL sites, etc.)
    and publish them — real data only, with the source disclosed, same
    discipline as the other `alfred-*.json` files — ideally to a new
    `data/alfred-results.json` so football-hub's app.js can read it the
    same way it already reads your news/scouting/squad files. If a result
    genuinely can't be confirmed from anywhere you can reach, say so for
    that match rather than guessing.

## Done

_(nothing yet)_
