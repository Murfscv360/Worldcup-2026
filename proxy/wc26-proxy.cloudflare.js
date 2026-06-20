/**
 * worldcup26.ir live-score proxy — Cloudflare Worker
 * --------------------------------------------------
 * Optional reliability layer for live scores. It fetches worldcup26.ir/get/games
 * SERVER-SIDE (Cloudflare's network — no browser CORS/geo issues), caches it a
 * few seconds, and re-serves with CORS. Point the app at it for rock-solid,
 * fast score delivery even if worldcup26.ir is slow or geo-restricted for some
 * visitors.
 *
 * Deploy (free):
 *   1. dash.cloudflare.com → Workers & Pages → Create Worker → paste → Deploy.
 *   2. Copy the URL, e.g. https://wc26-scores.<you>.workers.dev
 *   3. On the live site, in the browser console:
 *        localStorage.setItem('wc26_proxy','https://wc26-scores.<you>.workers.dev');
 *        location.reload();
 *      The app then loads live scores through the proxy (with openfootball /
 *      snapshot fallback still in place).
 */
const SOURCE = "https://worldcup26.ir/get/games";
const CACHE_SECONDS = 10;

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    try {
      const upstream = await fetch(SOURCE, {
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
