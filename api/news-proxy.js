/* Football Hub — real, live football news headlines (Vercel port)
   Ported 2026-10-02 from netlify/functions/news-proxy.js, same reason as fpl-proxy.js: Netlify's
   free-tier resource allowance is used up. Parsing logic, feed list and headers unchanged --
   only the handler signature moved from Netlify's `exports.handler = async (event) => {...}` to
   Vercel's `(req, res)` Node.js convention. */
'use strict';

const FEEDS = {
  football: 'https://feeds.bbci.co.uk/sport/football/rss.xml',
  premierleague: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml'
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const feedKey = (req.query && req.query.feed) || 'football';
  const url = FEEDS[feedKey];
  if (!url) {
    res.status(400).json({ error: 'Unknown feed' });
    return;
  }
  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FootballHubProxy/1.0)' }
    });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Feed returned ${upstream.status}` });
      return;
    }
    const xml = await upstream.text();
    const items = parseRss(xml);
    res.status(200).json({ source: 'BBC Sport', feed: feedKey, items, fetchedAt: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ error: 'Could not reach the news feed' });
  }
};
