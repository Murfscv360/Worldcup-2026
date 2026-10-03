/* Football Hub — Fantasy Premier League API proxy (Vercel port)
   Ported 2026-10-02 from netlify/functions/fpl-proxy.js: Netlify was downgraded to its free tier
   and has used up its current resource/credit allowance, so the Netlify Functions this app
   depends on for CORS-bypassed FPL data can no longer be relied on. Logic, whitelist and headers
   are unchanged from the Netlify version — only the handler signature changes, from Netlify's
   `exports.handler = async (event) => {...}` to Vercel's `(req, res)` Node.js function
   convention. The original file stays in netlify/functions/ untouched (dead weight once the
   front end stops calling it, not deleted so the history/comments aren't lost). */
'use strict';

const FPL_BASE = 'https://fantasy.premierleague.com/api';

const ALLOWED = [
  /^bootstrap-static\/$/,
  /^entry\/\d+\/$/,
  /^entry\/\d+\/event\/\d+\/picks\/$/,
  /^entry\/\d+\/history\/$/,
  /^fixtures\/$/,
  /^dream-team\/\d+\/$/,
  /^element-summary\/\d+\/$/,
  /^leagues-classic\/\d+\/standings\/$/
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const path = (req.query && req.query.path) || '';
  if (!ALLOWED.some((rx) => rx.test(path))) {
    res.status(400).json({ error: 'Path not allowed' });
    return;
  }

  try {
    const upstream = await fetch(`${FPL_BASE}/${path}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FootballHubProxy/1.0)' }
    });
    const body = await upstream.text();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `FPL API returned ${upstream.status}` });
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(body);
  } catch (e) {
    res.status(502).json({ error: 'Could not reach the FPL API' });
  }
};
