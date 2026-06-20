# FIFA live-data proxy

The app can't call `api.fifa.com` from the browser (no CORS) and GitHub Pages
can't run server code, so live FIFA data needs a tiny **proxy** you deploy once.

## URL → API mapping

A match-centre URL like
`fifa.com/en/match-centre/match/17/285023/289273/400021472`
maps to `idCompetition/idSeason/idStage/idMatch`, i.e.:

| Data | FIFA endpoint (`api.fifa.com/api/v3/…`) |
|---|---|
| Live & score | `live/football/17/285023/289273/400021472` |
| Timeline (goals/cards/subs) | `timelines/17/285023/289273/400021472` |
| Match statistics | `statistics/17/285023/289273/400021472` |
| All matches live now | `live/football/now` |

## Deploy (Cloudflare Worker, free)

1. https://dash.cloudflare.com → **Workers & Pages → Create Worker**.
2. Paste [`fifa-proxy.cloudflare.js`](fifa-proxy.cloudflare.js), **Deploy**.
3. Copy the URL, e.g. `https://wc2026-fifa.<you>.workers.dev`.
4. Test: open
   `https://wc2026-fifa.<you>.workers.dev/?path=live/football/17/285023/289273/400021472`
   — you should see JSON.

## Point the app at it

In the browser console on the live site (one-time, stored locally):

```js
localStorage.setItem('wc26_fifa_proxy', 'https://wc2026-fifa.<you>.workers.dev');
location.reload();
```

When set, the app pulls live scores/cards from FIFA via the proxy and overlays
them on the openfootball schedule. (Wiring lands once you share a sample
response so the field mapping is exact — FIFA's JSON keys aren't documented.)

## Notes / caveats

- `api.fifa.com` is **undocumented and unsupported**; it can change or break.
- Automated access may be **against FIFA's Terms of Use** — keep the cache on
  (15s) to be polite, and prefer a **licensed** feed (e.g. API-Football) for a
  public production site. A Netlify Function variant is trivial to add if you
  prefer Netlify.
