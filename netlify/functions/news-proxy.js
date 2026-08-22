/* Football Hub — real, live football news headlines
   BBC Sport publishes public RSS feeds (no key, no auth) for football news —
   a long-standing, publicly documented BBC News/Sport product. A direct
   browser fetch of an RSS feed from a third-party origin fails CORS the same
   way the FPL API did (see fpl-proxy.js), so this re-fetches it server-side,
   where CORS doesn't apply, parses the RSS XML into plain JSON, and returns
   it with permissive CORS headers.

   Note on verification: this session's sandboxed network egress policy
   blocks feeds.bbci.co.uk outright (confirmed via curl, a Playwright direct
   fetch, and the WebFetch tool — all returned an explicit egress-block
   error, not a timeout), so the exact response shape could not be hand
   -verified from here the way fpl-proxy.js's CORS failure was confirmed on
   a live preview in an earlier session. The URL and RSS 2.0 structure below
   are BBC's long-documented, stable public feed format. Netlify Functions
   run with full outbound internet access in production (a completely
   different network path than this sandbox), so this should work once
   deployed — verify against the live preview/production URL after deploy,
   the same way the FPL proxy originally was. */
'use strict';

const FEEDS = {
  football: 'https://feeds.bbci.co.uk/sport/football/rss.xml',
  premierleague: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml'
};

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=300'
};

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}
function tag(block, name) {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i').exec(block);
  return m ? decodeEntities(m[1]) : '';
}

// BBC RSS is standard RSS 2.0 — <item> blocks with title/link/description/pubDate.
// Parsed with regex rather than an XML library to keep this dependency-free,
// matching the rest of the app's zero-build, zero-dependency philosophy.
function parseRss(xml) {
  const items = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  blocks.forEach(block => {
    const title = tag(block, 'title');
    const link = tag(block, 'link');
    if (!title || !link) return;
    items.push({
      title,
      link,
      description: tag(block, 'description'),
      pubDate: tag(block, 'pubDate')
    });
  });
  return items;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }
  const feedKey = (event.queryStringParameters && event.queryStringParameters.feed) || 'football';
  const url = FEEDS[feedKey];
  if (!url) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Unknown feed' }) };
  }
  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FootballHubProxy/1.0)' }
    });
    if (!upstream.ok) {
      return { statusCode: upstream.status, headers: HEADERS, body: JSON.stringify({ error: `Feed returned ${upstream.status}` }) };
    }
    const xml = await upstream.text();
    const items = parseRss(xml);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: 'BBC Sport', feed: feedKey, items, fetchedAt: new Date().toISOString() }) };
  } catch (e) {
    return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: 'Could not reach the news feed' }) };
  }
};
