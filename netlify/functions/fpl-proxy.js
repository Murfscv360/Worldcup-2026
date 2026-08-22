/* Football Hub — Fantasy Premier League API proxy
   The official FPL API (fantasy.premierleague.com/api) does not reliably
   support cross-origin requests from third-party browser JS (confirmed by
   hand while building the "My Team" feature — the direct fetch failed on
   the real deploy preview). This function re-fetches the same public,
   unauthenticated FPL endpoints server-side, where CORS doesn't apply, and
   returns the response with permissive CORS headers so the static site
   (GitHub Pages or Netlify, any origin) can read it. Only a fixed whitelist
   of read-only FPL paths is allowed — this is not a general-purpose proxy. */
'use strict';

const FPL_BASE = 'https://fantasy.premierleague.com/api';

const ALLOWED = [
  /^bootstrap-static\/$/,
  /^entry\/\d+\/$/,
  /^entry\/\d+\/event\/\d+\/picks\/$/,
  /^entry\/\d+\/history\/$/,
  /^fixtures\/$/,
  /^dream-team\/\d+\/$/,
  /^element-summary\/\d+\/$/
];

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=60'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const path = (event.queryStringParameters && event.queryStringParameters.path) || '';
  if (!ALLOWED.some((rx) => rx.test(path))) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Path not allowed' }) };
  }

  try {
    const upstream = await fetch(`${FPL_BASE}/${path}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FootballHubProxy/1.0)' }
    });
    const body = await upstream.text();
    if (!upstream.ok) {
      return { statusCode: upstream.status, headers: HEADERS, body: JSON.stringify({ error: `FPL API returned ${upstream.status}` }) };
    }
    return { statusCode: 200, headers: HEADERS, body };
  } catch (e) {
    return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: 'Could not reach the FPL API' }) };
  }
};
