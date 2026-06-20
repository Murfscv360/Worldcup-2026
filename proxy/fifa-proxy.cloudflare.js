/**
 * FIFA data proxy — Cloudflare Worker
 * ------------------------------------
 * FIFA's site reads an undocumented JSON API at api.fifa.com. Browsers can't
 * call it directly (no CORS), so this Worker fetches it SERVER-SIDE and re-serves
 * it with an Access-Control-Allow-Origin header + a short cache.
 *
 * ⚠️  api.fifa.com is undocumented/unsupported and may change or break without
 *     notice, and automated access may be against FIFA's Terms of Use. Use a
 *     short cache (below) to stay polite, and prefer a licensed feed for a
 *     public production site.
 *
 * Deploy (free):
 *   1. https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Paste this file, Deploy. You'll get https://<name>.<you>.workers.dev
 *   3. In the app, set the proxy URL (see proxy/README.md).
 *
 * Usage:
 *   GET /?path=live/football/17/285023/289273/400021472     ← your match
 *   GET /?path=live/football/now                            ← all live now
 *   GET /?path=timelines/17/285023/289273/400021472         ← goals/cards/subs
 *   GET /?path=statistics/17/285023/289273/400021472        ← match stats
 */

const ALLOW_PREFIXES = ["live/", "timelines/", "statistics/", "calendar/", "competitions"];
const CACHE_SECONDS = 15;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    const path = url.searchParams.get("path") || "";
    if (!ALLOW_PREFIXES.some(p => path.startsWith(p))) {
      return cors(new Response(JSON.stringify({ error: "path not allowed" }), { status: 400 }));
    }

    const target = "https://api.fifa.com/api/v3/" + path +
      (path.includes("?") ? "&" : "?") + "language=en";

    try {
      const upstream = await fetch(target, {
        headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible; wc2026-hub)" },
        cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true }
      });
      const body = await upstream.text();
      return cors(new Response(body, {
        status: upstream.status,
        headers: { "content-type": "application/json; charset=utf-8" }
      }));
    } catch (e) {
      return cors(new Response(JSON.stringify({ error: String(e) }), { status: 502 }));
    }
  }
};

function cors(resp) {
  resp.headers.set("Access-Control-Allow-Origin", "*");
  resp.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  resp.headers.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
  return resp;
}
