/* World Cup 2026 — Live Dashboard
   Match data: openfootball/worldcup.json (public domain), fetched live in-browser.
   Falls back to the bundled snapshot in ./data/worldcup.json. */
'use strict';

/* ---------- Static reference data ---------- */

// Team meta keyed by the team name as it appears in the openfootball feed.
const TEAMS = {
  "Mexico":{f:"🇲🇽",c:"CONCACAF"}, "South Africa":{f:"🇿🇦",c:"CAF"},
  "South Korea":{f:"🇰🇷",c:"AFC"}, "Czech Republic":{f:"🇨🇿",c:"UEFA"},
  "Canada":{f:"🇨🇦",c:"CONCACAF"}, "Bosnia & Herzegovina":{f:"🇧🇦",c:"UEFA"},
  "Qatar":{f:"🇶🇦",c:"AFC"}, "Switzerland":{f:"🇨🇭",c:"UEFA"},
  "Brazil":{f:"🇧🇷",c:"CONMEBOL"}, "Morocco":{f:"🇲🇦",c:"CAF"},
  "Haiti":{f:"🇭🇹",c:"CONCACAF"}, "Scotland":{f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",c:"UEFA"},
  "USA":{f:"🇺🇸",c:"CONCACAF"}, "Paraguay":{f:"🇵🇾",c:"CONMEBOL"},
  "Australia":{f:"🇦🇺",c:"AFC"}, "Turkey":{f:"🇹🇷",c:"UEFA"},
  "Germany":{f:"🇩🇪",c:"UEFA"}, "Curaçao":{f:"🇨🇼",c:"CONCACAF"},
  "Ivory Coast":{f:"🇨🇮",c:"CAF"}, "Ecuador":{f:"🇪🇨",c:"CONMEBOL"},
  "Netherlands":{f:"🇳🇱",c:"UEFA"}, "Japan":{f:"🇯🇵",c:"AFC"},
  "Sweden":{f:"🇸🇪",c:"UEFA"}, "Tunisia":{f:"🇹🇳",c:"CAF"},
  "Belgium":{f:"🇧🇪",c:"UEFA"}, "Egypt":{f:"🇪🇬",c:"CAF"},
  "Iran":{f:"🇮🇷",c:"AFC"}, "New Zealand":{f:"🇳🇿",c:"OFC"},
  "Spain":{f:"🇪🇸",c:"UEFA"}, "Cape Verde":{f:"🇨🇻",c:"CAF"},
  "Saudi Arabia":{f:"🇸🇦",c:"AFC"}, "Uruguay":{f:"🇺🇾",c:"CONMEBOL"},
  "France":{f:"🇫🇷",c:"UEFA"}, "Senegal":{f:"🇸🇳",c:"CAF"},
  "Iraq":{f:"🇮🇶",c:"AFC"}, "Norway":{f:"🇳🇴",c:"UEFA"},
  "Argentina":{f:"🇦🇷",c:"CONMEBOL"}, "Algeria":{f:"🇩🇿",c:"CAF"},
  "Austria":{f:"🇦🇹",c:"UEFA"}, "Jordan":{f:"🇯🇴",c:"AFC"},
  "Portugal":{f:"🇵🇹",c:"UEFA"}, "DR Congo":{f:"🇨🇩",c:"CAF"},
  "Uzbekistan":{f:"🇺🇿",c:"AFC"}, "Colombia":{f:"🇨🇴",c:"CONMEBOL"},
  "England":{f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",c:"UEFA"}, "Croatia":{f:"🇭🇷",c:"UEFA"},
  "Panama":{f:"🇵🇦",c:"CONCACAF"}, "Ghana":{f:"🇬🇭",c:"CAF"}
};
// ISO codes for vector (SVG) flags. flagcdn serves crisp .svg flags;
// gb-eng / gb-sct are supported for the home nations.
const CODES = {
  "Mexico":"mx","South Africa":"za","South Korea":"kr","Czech Republic":"cz","Canada":"ca",
  "Bosnia & Herzegovina":"ba","Qatar":"qa","Switzerland":"ch","Brazil":"br","Morocco":"ma",
  "Haiti":"ht","Scotland":"gb-sct","USA":"us","Paraguay":"py","Australia":"au","Turkey":"tr",
  "Germany":"de","Curaçao":"cw","Ivory Coast":"ci","Ecuador":"ec","Netherlands":"nl","Japan":"jp",
  "Sweden":"se","Tunisia":"tn","Belgium":"be","Egypt":"eg","Iran":"ir","New Zealand":"nz","Spain":"es",
  "Cape Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy","France":"fr","Senegal":"sn","Iraq":"iq",
  "Norway":"no","Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo","Portugal":"pt",
  "DR Congo":"cd","Uzbekistan":"uz","Colombia":"co","England":"gb-eng","Croatia":"hr","Panama":"pa","Ghana":"gh"
};
// Render a country flag as a vector SVG image, falling back to the emoji glyph.
function flag(n){
  const code = CODES[n];
  const emoji = (TEAMS[n] && TEAMS[n].f) || "🏳️";
  if(!code) return emoji;
  return `<img class="flagimg" src="https://flagcdn.com/${code}.svg" width="20" height="14" alt="" loading="lazy" decoding="async" onerror="this.outerHTML='${emoji}'">`;
}

// Venue meta keyed by the exact "ground" string in the feed.
const VENUES = {
  "New York/New Jersey (East Rutherford)":{s:"MetLife Stadium",city:"East Rutherford, NJ",cc:"🇺🇸",cap:82500,roof:"Open air",note:"FINAL"},
  "Los Angeles (Inglewood)":{s:"SoFi Stadium",city:"Inglewood, CA",cc:"🇺🇸",cap:70240,roof:"Fixed canopy"},
  "Dallas (Arlington)":{s:"AT&T Stadium",city:"Arlington, TX",cc:"🇺🇸",cap:80000,roof:"Retractable · A/C"},
  "San Francisco Bay Area (Santa Clara)":{s:"Levi's Stadium",city:"Santa Clara, CA",cc:"🇺🇸",cap:68500,roof:"Open air"},
  "Miami (Miami Gardens)":{s:"Hard Rock Stadium",city:"Miami Gardens, FL",cc:"🇺🇸",cap:65300,roof:"Shade canopy"},
  "Atlanta":{s:"Mercedes-Benz Stadium",city:"Atlanta, GA",cc:"🇺🇸",cap:71000,roof:"Retractable · A/C"},
  "Houston":{s:"NRG Stadium",city:"Houston, TX",cc:"🇺🇸",cap:72200,roof:"Retractable · A/C"},
  "Seattle":{s:"Lumen Field",city:"Seattle, WA",cc:"🇺🇸",cap:69000,roof:"Open air"},
  "Philadelphia":{s:"Lincoln Financial Field",city:"Philadelphia, PA",cc:"🇺🇸",cap:69000,roof:"Open air"},
  "Kansas City":{s:"Arrowhead Stadium",city:"Kansas City, MO",cc:"🇺🇸",cap:76400,roof:"Open air"},
  "Boston (Foxborough)":{s:"Gillette Stadium",city:"Foxborough, MA",cc:"🇺🇸",cap:65900,roof:"Open air"},
  "Mexico City":{s:"Estadio Azteca",city:"Mexico City",cc:"🇲🇽",cap:83000,roof:"Open air",note:"OPENER"},
  "Guadalajara (Zapopan)":{s:"Estadio Akron",city:"Zapopan",cc:"🇲🇽",cap:48000,roof:"Open air"},
  "Monterrey (Guadalupe)":{s:"Estadio BBVA",city:"Guadalupe",cc:"🇲🇽",cap:53500,roof:"Open air"},
  "Toronto":{s:"BMO Field",city:"Toronto",cc:"🇨🇦",cap:45500,roof:"Open air"},
  "Vancouver":{s:"BC Place",city:"Vancouver",cc:"🇨🇦",cap:54500,roof:"Retractable"}
};
const venueShort = g => (VENUES[g] ? VENUES[g].s : g);

// Prediction-market snapshot (title winner, implied %). Live values via the links.
const ODDS_DATE = "Jun 18, 2026";
const ODDS = [
  ["France",18.5],["Spain",14.5],["England",12.9],["Brazil",9.0],["Argentina",8.3],
  ["Portugal",6.0],["Germany",5.4],["Netherlands",4.4],["USA",3.6],["Belgium",2.6],
  ["Croatia",1.8],["Uruguay",1.7],["Colombia",1.6],["Morocco",1.4],["Japan",1.2]
];

/* ---------- Data loading ---------- */

const REMOTE = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const LOCAL  = "data/worldcup.json";
let MATCHES = [];
let DATA_SOURCE = "";
let LAST_UPDATE = 0;

/* ---------- Live overlay: worldcup26.ir (real in-progress scores) ---------- */
const WC26 = "https://worldcup26.ir/get/games";
// Always-on mirror: a GitHub Action fetches worldcup26.ir server-side every few
// minutes and publishes live.json to the `scores` branch. Served from our own
// CDN origin (raw.githubusercontent) => no CORS/geo/uptime issues in the browser.
const WC26_MIRROR = "https://raw.githubusercontent.com/Murfscv360/Worldcup-2026/scores/live.json";
const NAME_FIX = {"United States":"USA","Bosnia and Herzegovina":"Bosnia & Herzegovina","Democratic Republic of the Congo":"DR Congo"};
const fixName = n => NAME_FIX[n] || n;
let LIVE_KEYS = new Set();   // pair keys currently live (per feed)
let FIN_KEYS  = new Set();   // pair keys finished (per feed)
let WC_LOADED = false;       // true once the authoritative live feed has loaded
let KO_RESULT = {};          // num -> real knockout result {home,away,ft,pens,finished,live,winner,loser}
let KO_SLOT   = {};          // R32 group-slot code (e.g. "1E") -> real team that filled it

/* ---------- Integrity guard: watch for fake / bad scores ---------- */
let GUARD = { ok:true, flags:[], lastFt:{} };
function validFt(ft){ return Array.isArray(ft) && ft.length===2 && ft.every(n=>Number.isInteger(n) && n>=0 && n<=19); }
function pairKey(a,b){ return [fixName(a),fixName(b)].sort().join("|"); }

// Parse worldcup26 scorer strings like {"H. Kane 12'(p)","K. Havertz 45'+5'(p)","D. Bobadilla 7'(OG)"}.
function parseScorers(s){
  if(!s || s==="null") return [];
  const out=[];
  s = s.replace(/[“”]/g,'"').replace(/[‘’]/g,"'");   // normalize curly quotes/apostrophes
  s.replace(/^\{|\}$/g,"").split(/["']\s*,\s*["']/).forEach(raw=>{
    let t = raw.replace(/["“”'{}]/g,"").trim();
    if(!t) return;
    const owngoal = /\(\s*OG\s*\)/i.test(t);
    const penalty = /\(\s*p\s*\)/i.test(t);
    t = t.replace(/\([^)]*\)/g,"").trim();
    const mm = t.match(/(\d{1,3})(?:\s*\+\s*\d+)?\s*'?\s*$/);
    const minute = mm ? mm[1] : "";
    const name = (mm ? t.slice(0, mm.index) : t).trim();
    if(name) out.push({name, minute, penalty, owngoal});
  });
  return out;
}
// fetch with a hard timeout so a slow/unreachable host can never hang the app.
function fetchT(url, ms){
  let ctrl, timer;
  try{ ctrl = new AbortController(); timer = setTimeout(()=>ctrl.abort(), ms||7000); }catch(e){ ctrl = null; }
  return fetch(url, {cache:"no-store", signal:ctrl?ctrl.signal:undefined})
    .finally(()=>{ if(timer) clearTimeout(timer); });
}
let LAST_WC_GAMES = null;   // last successful live feed (reused on a transient failure)
// Score sources tried in order until one returns games. The mirror is on our own
// CDN origin so it always works in the browser; the direct feed is tried first for
// the freshest possible scores, and an optional custom proxy overrides everything.
function wc26Sources(){
  const out = [];
  try{ const p=localStorage.getItem("wc26_proxy"); if(p && /^https?:/.test(p)) out.push(p); }catch(e){}
  out.push(WC26, WC26_MIRROR);
  return out;
}
async function fetchWC26(){
  const sources = wc26Sources();
  for(const base of sources){
    try{
      const r = await fetchT(base + (base.includes("?")?"&":"?") + "_=" + Date.now(), 8000);
      if(!r.ok) throw 0;
      const j = await r.json();
      const games = j && (j.games || (Array.isArray(j) ? j : null));
      if(games && games.length){ LAST_WC_GAMES = games; return games; }
    }catch(e){ /* try next source, then caller reuses LAST_WC_GAMES */ }
  }
  return null;
}
// Overlay real scores/scorers + live status onto the loaded schedule.
// Feed state per game: `finished` is "TRUE"/"FALSE"; `time_elapsed` is
// "notstarted", "finished", or an in-play value (minute number, "1H"/"2H"/"HT",
// or "live"). Treat anything that isn't clearly not-started/finished as LIVE so
// in-progress scores are never missed regardless of how the feed labels them.
function wcState(g){
  if(String(g.finished).toUpperCase()==="TRUE") return "ft";
  const te = String(g.time_elapsed==null?"":g.time_elapsed).trim().toLowerCase();
  if(!te || te==="notstarted" || te==="not started" || te==="scheduled" ||
     te==="postponed" || te==="finished" || te==="ft" || te==="null") return "sched";
  return "live";
}
function overlayWC26(games){
  LIVE_KEYS = new Set(); FIN_KEYS = new Set();
  WC_LOADED = !!games;
  GUARD.flags = [];
  if(!games) return false;
  const byPair = {};
  games.forEach(g=>{
    const A=g.home_team_name_en, B=g.away_team_name_en;
    if(!A || !B) return;
    const k = pairKey(A,B); byPair[k]=g;
    const stt = wcState(g);
    if(stt==="live") LIVE_KEYS.add(k);
    else if(stt==="ft") FIN_KEYS.add(k);
  });
  MATCHES.forEach(m=>{
    if(!TEAMS[m.team1] || !TEAMS[m.team2]) return;     // skip knockout placeholders
    const g = byPair[pairKey(m.team1,m.team2)]; if(!g) return;
    const stt = wcState(g);
    const live = stt==="live";
    const fin  = stt==="ft";
    if(!(live || fin)) return;
    const h=parseInt(g.home_score)||0, a=parseInt(g.away_score)||0;
    const homeIsT1 = fixName(g.home_team_name_en)===m.team1;
    const cand = homeIsT1 ? [h,a] : [a,h];
    const key  = matchKey(m), prev = GUARD.lastFt[key];

    // INTEGRITY: reject impossible or backwards-going live scores (keep last good).
    if(!validFt(cand)){
      GUARD.flags.push(`${teamLabel(m.team1).name} v ${teamLabel(m.team2).name}: implausible score "${g.home_score}-${g.away_score}" — ignored`);
      return;
    }
    if(live && prev && (cand[0]+cand[1] < prev[0]+prev[1])){
      GUARD.flags.push(`${teamLabel(m.team1).name} v ${teamLabel(m.team2).name}: live score moved backwards ${prev.join("-")}→${cand.join("-")} — kept ${prev.join("-")}`);
      return;
    }
    // Cross-feed sanity: openfootball already had a different final.
    if(fin && m.score && Array.isArray(m.score.ft) && (m.score.ft[0]!==cand[0] || m.score.ft[1]!==cand[1])){
      GUARD.flags.push(`${teamLabel(m.team1).name} v ${teamLabel(m.team2).name}: feed mismatch (schedule ${m.score.ft.join("-")} vs live ${cand.join("-")}) — using live`);
    }

    m.score = Object.assign({}, m.score, {ft: cand});
    GUARD.lastFt[key] = cand;
    const gh=parseScorers(g.home_scorers), ga=parseScorers(g.away_scorers);
    m.goals1 = homeIsT1 ? gh : ga;
    m.goals2 = homeIsT1 ? ga : gh;
  });

  // ---- Knockout pass (feed `id` === schedule `num`) ----
  // Group games match by team name above; knockout slots still carry placeholder
  // codes (1E, W74…), so match them by id instead. This pulls in the REAL teams,
  // scores and PENALTY winners, so actual results (incl. upsets) drive the bracket
  // and cascade through R16 → QF → SF → Final in real time.
  KO_RESULT = {}; KO_SLOT = {};
  const byId = {};
  games.forEach(g=>{ if(g.id!=null) byId[+g.id]=g; });
  const slot = (code, team)=>{ code=String(code); if(/^[12][A-L]$/.test(code) || (code[0]==="3" && code.includes("/"))) KO_SLOT[code]=team; };
  MATCHES.forEach(m=>{
    if(m.group || m.num==null) return;                 // knockout matches only
    const g = byId[m.num]; if(!g) return;
    const home = fixName(g.home_team_name_en), away = fixName(g.away_team_name_en);
    if(!TEAMS[home] || !TEAMS[away]) return;            // both teams known for this slot?
    const stt = wcState(g);
    const h = parseInt(g.home_score), a = parseInt(g.away_score);
    const hp = parseInt(g.home_penalty_score), ap = parseInt(g.away_penalty_score);
    const hasPens = !isNaN(hp) && !isNaN(ap) && hp!==ap;
    const ft = (!isNaN(h) && !isNaN(a)) ? [h,a] : null;
    const rec = { home, away, live: stt==="live", finished: stt==="ft", ft, pens: hasPens ? [hp,ap] : null };
    if(rec.finished && ft && validFt(ft)){
      rec.winner = ft[0]>ft[1] ? home : ft[1]>ft[0] ? away : (hasPens ? (hp>ap?home:away) : null);
      rec.loser  = rec.winner ? (rec.winner===home ? away : home) : null;
    }
    KO_RESULT[m.num] = rec;
    slot(m.team1, home); slot(m.team2, away);           // real teams that filled R32 group-slots
    const k = pairKey(home, away);
    if(rec.live) LIVE_KEYS.add(k);
    if(rec.finished) FIN_KEYS.add(k);
    // Only stamp a score once the tie is actually live/finished — the feed reports
    // 0-0 for not-yet-started knockouts, which must stay a projected fixture.
    if((rec.finished || rec.live) && ft && validFt(ft)){
      m.score = Object.assign({}, m.score, {ft});
      m.goals1 = parseScorers(g.home_scorers);
      m.goals2 = parseScorers(g.away_scorers);
    }
  });

  GUARD.ok = GUARD.flags.length === 0;
  if(!GUARD.ok && typeof console!=="undefined") console.warn("[integrity] score checks flagged:", GUARD.flags);
  return true;
}

// Base schedule (openfootball → bundled snapshot). Fast, with timeouts.
async function loadData(){
  const bust = "?_=" + Date.now();
  let base = false;
  try{
    const r = await fetchT(REMOTE + bust, 7000);
    if(!r.ok) throw new Error(r.status);
    const j = await r.json();
    if(j && j.matches && j.matches.length){ MATCHES = j.matches; DATA_SOURCE = "live"; base = true; }
    else throw new Error("empty");
  }catch(e){ /* fall through to bundled snapshot */ }
  if(!base){
    try{
      const r = await fetchT(LOCAL + bust, 7000);
      const j = await r.json();
      MATCHES = j.matches || []; DATA_SOURCE = "snapshot"; base = MATCHES.length>0;
    }catch(e){ MATCHES = []; DATA_SOURCE = "error"; }
  }
  if(base || MATCHES.length) LAST_UPDATE = Date.now();
}
// Live overlay (worldcup26.ir) — separate so it NEVER blocks first paint.
// Reuses the last good feed on a transient failure so live scores never blank
// out (and we don't fall back to clock-guessing once the feed has loaded once).
async function loadLive(){
  const fresh = await fetchWC26();
  const games = fresh || LAST_WC_GAMES;
  if(overlayWC26(games)){ DATA_SOURCE = "live"; if(fresh) LAST_UPDATE = Date.now(); return true; }
  return false;
}

/* ---------- Time helpers ---------- */

// Build a real Date from feed "date" + "time" like "13:00 UTC-6".
function kickoffDate(m){
  const tm = (m.time||"").match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  if(!tm) return null;
  const off = parseInt(tm[3],10);
  const pad = n => String(Math.abs(n)).padStart(2,"0");
  const iso = `${m.date}T${tm[1].padStart(2,"0")}:${tm[2]}:00${off<0?"-":"+"}${pad(off)}:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
const etFmt  = new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",minute:"2-digit"});
const locFmt = new Intl.DateTimeFormat([], {hour:"numeric",minute:"2-digit"});
const localTZ = (Intl.DateTimeFormat().resolvedOptions().timeZone||"local").split("/").pop().replace(/_/g," ");
const dayKeyET   = d => new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const dayLabelET = d => new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",month:"short",day:"numeric"}).format(d);

/* ---------- Status ---------- */
function status(m){
  const k = (TEAMS[m.team1] && TEAMS[m.team2]) ? pairKey(m.team1,m.team2) : null;
  if(k && LIVE_KEYS.has(k)) return "live";          // authoritative live flag from the feed
  if(k && FIN_KEYS.has(k))  return "ft";
  const hasScore = m.score && Array.isArray(m.score.ft);
  const d = kickoffDate(m), now = Date.now();
  if(hasScore) return "ft";
  if(d && d.getTime()>now && d.getTime()-now < 36*3600000) return "soon";
  // Clock-based "live" ONLY as a last resort when the live feed has never
  // loaded this session — avoids ever showing a blank/fake 0-0 "live" match.
  if(!WC_LOADED && !LAST_WC_GAMES && d && now>=d.getTime() && now < d.getTime()+135*60000) return "live";
  return "sched";
}

/* ---------- Knockout placeholder labels ---------- */
function teamLabel(t){
  if(TEAMS[t]) return {flag:flag(t), name:t, placeholder:false};
  let name = t;
  if(/^[123][A-L]$/.test(t)){
    const pos = {"1":"Winner","2":"Runner-up","3":"3rd"}[t[0]];
    name = `${pos} Grp ${t[1]}`;
  } else if(/^3[A-L/]+$/.test(t)){
    name = "3rd: "+t.slice(1);
  } else if(/^W\d+$/.test(t)){
    name = "Winner M"+t.slice(1);
  } else if(/^L\d+$/.test(t)){
    name = "Loser M"+t.slice(1);
  }
  return {flag:"▫️", name, placeholder:true};
}

/* ---------- US TV assignment ---------- */
// English on FOX or FS1 in the group stage & R32; every match from the Round of 16
// (Jul 4) onward airs on FOX. Spanish on Telemundo / Universo throughout.
function tvFor(m){
  const lateRound = /Round of 16|Quarter|Semi|third|Final/i.test(m.round||"");
  return { eng: lateRound ? "FOX" : "FOX / FS1", esp:"Telemundo / Universo", stream:"Tubi · Peacock" };
}

/* ---------- Standings ---------- */
function standings(groupName){
  const rows = {};
  const add = t => { if(!rows[t]) rows[t]={t,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0}; };
  MATCHES.filter(m=>m.group===groupName).forEach(m=>{
    add(m.team1); add(m.team2);
    if(!(m.score && Array.isArray(m.score.ft))) return;
    const [a,b]=m.score.ft, A=rows[m.team1], B=rows[m.team2];
    A.P++;B.P++;A.GF+=a;A.GA+=b;B.GF+=b;B.GA+=a;
    if(a>b){A.W++;B.L++;A.Pts+=3;}
    else if(b>a){B.W++;A.L++;B.Pts+=3;}
    else{A.D++;B.D++;A.Pts++;B.Pts++;}
  });
  return Object.values(rows).map(r=>({...r,GD:r.GF-r.GA}))
    .sort((x,y)=> y.Pts-x.Pts || y.GD-x.GD || y.GF-x.GF || x.t.localeCompare(y.t));
}

/* ---------- Small DOM utils ---------- */
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $ = id => document.getElementById(id);

/* ---------- Match card ---------- */
function matchCard(m){
  const st = status(m);
  const t1 = teamLabel(m.team1), t2 = teamLabel(m.team2);
  const sc = (m.score && Array.isArray(m.score.ft)) ? m.score.ft : null;
  const live = st==="live";
  const d = kickoffDate(m);
  const badge = {
    live:'<span class="badge live">● Live</span>',
    ft:'<span class="badge ft">Full-time</span>',
    soon:'<span class="badge soon">Upcoming</span>',
    sched:'<span class="badge sched">Scheduled</span>'
  }[st];
  const topLeft = m.group ? esc(m.group) : esc(m.round||"");
  const w1 = sc && sc[0]>sc[1], w2 = sc && sc[1]>sc[0];
  const fl = scoreFlash(matchKey(m), sc);   // flashes both scores when the line changes

  const teamRow = (t,i,win,loss) =>
    `<div class="rows">
       <div class="team ${win?'win':''} ${loss?'loss':''}">
         <span class="flag">${t.flag}</span><span class="name">${esc(t.name)}</span>
       </div>
       ${sc ? `<span class="score${fl}">${sc[i]}</span>` : `<span class="score dim">–</span>`}
     </div>`;

  const kick = d
    ? `<span class="kick">${etFmt.format(d)} ET <small>· ${locFmt.format(d)} ${esc(localTZ)}</small></span>`
    : `<span class="kick">TBD</span>`;

  const tv = tvFor(m);
  const tvLine = `<span class="tv">📺 ${tv.eng}</span><span>🗣️ ${tv.esp}</span><span>▶️ ${tv.stream}</span>`;
  const cta = live ? `<span class="open-cta live">Tap for live play-by-play ›</span>`
                   : `<span class="open-cta">Match centre ›</span>`;

  // Live match odds (1X2) from current form — shown until the game is finished.
  const oddsLine = (st!=="ft" && TEAMS[m.team1] && TEAMS[m.team2]) ? (()=>{
    const o = matchOdds(m.team1, m.team2);
    return `<div class="odds-strip">
      <span class="odds-lbl">${live?'🔴 Live odds':'📈 Match odds'}</span>
      <span class="odds-pick"><span class="op-t">${esc(t1.name)}</span><b>${o.oH.toFixed(2)}</b></span>
      <span class="odds-pick"><span class="op-t">Draw</span><b>${o.oD.toFixed(2)}</b></span>
      <span class="odds-pick"><span class="op-t">${esc(t2.name)}</span><b>${o.oA.toFixed(2)}</b></span>
    </div>`;
  })() : "";

  return `<div class="match tappable ${live?'is-live-card':''}" data-open="${esc(matchKey(m))}" role="button" tabindex="0">
    <div class="top"><span>${topLeft}</span>${badge}</div>
    ${teamRow(t1,0,w1,!!sc&&!w1&&!(sc[0]===sc[1]))}
    ${teamRow(t2,1,w2,!!sc&&!w2&&!(sc[0]===sc[1]))}
    ${scorersHTML(m)}
    ${oddsLine}
    <div class="foot">
      ${kick}
      <span>📍 ${esc(venueShort(m.ground))}</span>
      ${weatherChip(m)}
      ${tvLine}
    </div>
    <div class="open-row">${cta}</div>
  </div>`;
}

// Compact "key matchup" card for the marquee group-stage fixtures on the home page.
function keyMatchCard(m, bill){
  const t1 = teamLabel(m.team1), t2 = teamLabel(m.team2), d = kickoffDate(m);
  const when = d ? `${dayLabelET(d)} · ${etFmt.format(d)} ET` : "TBD";
  return `<div class="match tappable keymatch" data-open="${esc(matchKey(m))}" role="button" tabindex="0">
    <div class="top"><span>${esc(m.group||"")}</span><span class="kmbill ${bill.tier}">${bill.label}</span></div>
    <div class="km-teams">
      <span class="km-team"><span class="flag">${t1.flag}</span><span class="km-nm">${esc(t1.name)}</span></span>
      <span class="km-v">v</span>
      <span class="km-team km-away"><span class="km-nm">${esc(t2.name)}</span><span class="flag">${t2.flag}</span></span>
    </div>
    <div class="foot"><span class="kick">${when}</span><span>📍 ${esc(venueShort(m.ground))}</span></div>
  </div>`;
}
// The standout upcoming group-stage fixtures for the home page. Ranks every
// to-come group game by appeal (combined current form, rewarding balanced
// clashes of strong sides) and surfaces the best few — the very top pairings
// carry the 🔥 Blockbuster / ⭐ Marquee billing, the rest are Featured.
function groupAppeal(m){
  const fa = formScore(m.team1), fb = formScore(m.team2);
  return (fa + fb) - Math.abs(fa - fb);   // both sides strong AND balanced scores highest
}
function keyGroupMatchups(excludeKeys){
  const now = Date.now();
  const cand = MATCHES
    .filter(m=> m.group && TEAMS[m.team1] && TEAMS[m.team2])
    .filter(m=> !(m.score && Array.isArray(m.score.ft)) && status(m)!=="ft" && status(m)!=="live")
    .map(m=> ({m, d:kickoffDate(m)}))
    .filter(x=> x.d && x.d.getTime()>now && !(excludeKeys&&excludeKeys.has(matchKey(x.m))));
  if(!cand.length) return "";
  cand.sort((a,b)=> groupAppeal(b.m) - groupAppeal(a.m) || a.d - b.d);
  const top = cand.slice(0,4)
    .map(x=> ({...x, bill: tieBilling(x.m.team1,x.m.team2) || {tier:"featured", label:"Featured"}}))
    .sort((a,b)=> a.d - b.d);   // show the chosen ones in kickoff order
  return `<div class="sec-title"><h2>⭐ Key group-stage matchups</h2><span class="meta">must-watch fixtures</span></div>`
    + `<div class="keymatch-wrap">${top.map(x=>keyMatchCard(x.m, x.bill)).join("")}</div>`;
}

function scorersHTML(m){
  const fmt = arr => (arr||[]).map(g=>`${esc(g.name)} ${esc(g.minute)}'${g.penalty?" (P)":g.owngoal?" (OG)":""}`).join(", ");
  const a=fmt(m.goals1), b=fmt(m.goals2);
  if(!a && !b) return "";
  return `<div class="scorers">${a?`<span><b>${esc(m.team1)}:</b> ${a}</span>`:""}${b?`<span><b>${esc(m.team2)}:</b> ${b}</span>`:""}</div>`;
}

/* ---------- Views ---------- */
function sortByKick(a,b){
  const da=kickoffDate(a), db=kickoffDate(b);
  return (da?da.getTime():0)-(db?db.getTime():0);
}

// Auto-generated news/commentary headlines from results data.
function buildHeadlines(){
  const out = [];
  const done = MATCHES.filter(m=>m.score && Array.isArray(m.score.ft) && status(m)!=="live")
                      .map(m=>({m,d:kickoffDate(m)})).filter(x=>x.d)
                      .sort((a,b)=>b.d-a.d);
  done.forEach(({m,d})=>{
    const [a,b]=m.score.ft;
    const t1=teamLabel(m.team1).name, t2=teamLabel(m.team2).name;
    const win = a>b ? m.team1 : b>a ? m.team2 : null;
    const lose = a>b ? m.team2 : b>a ? m.team1 : null;
    const margin = Math.abs(a-b);
    // Hat-trick / brace detection
    const tally = arr => { const c={}; (arr||[]).forEach(g=>{ if(!g.owngoal) c[g.name]=(c[g.name]||0)+1; }); return c; };
    const stars = [];
    [m.goals1,m.goals2].forEach(arr=>{ const c=tally(arr); for(const k in c){ if(c[k]>=2) stars.push([k,c[k]]); } });

    let icon="⚽", text;
    if(win && stars.some(s=>s[1]>=3)){
      const s=stars.find(x=>x[1]>=3); icon="🎩";
      text=`${flag(win)} ${s[0]} hits a hat-trick as ${win} beat ${win===m.team1?t2:t1} ${Math.max(a,b)}–${Math.min(a,b)}`;
    } else if(win && margin>=4){
      icon="💥"; text=`${flag(win)} ${win} thrash ${win===m.team1?t2:t1} ${Math.max(a,b)}–${Math.min(a,b)}`;
    } else if(!win){
      icon="🤝"; text=`${flag(m.team1)} ${t1} ${a}–${b} ${t2} ${flag(m.team2)} — honours even`;
    } else if(stars.length){
      const s=stars[0]; icon="⭐";
      text=`${flag(win)} ${s[0]} (${s[1]}) inspires ${win} past ${win===m.team1?t2:t1} ${Math.max(a,b)}–${Math.min(a,b)}`;
    } else {
      text=`${flag(win)} ${win} edge ${win===m.team1?t2:t1} ${Math.max(a,b)}–${Math.min(a,b)}`;
    }
    out.push({icon,text,when:dayLabelET(d),group:m.group?m.group.replace("Group ","Grp "):(m.round||"")});
  });
  return out;
}

function viewToday(){
  const now = new Date();
  const todayKey = dayKeyET(now);
  const dated = MATCHES.map(m=>({m,d:kickoffDate(m)})).filter(x=>x.d);

  const todays = dated.filter(x=>dayKeyET(x.d)===todayKey).map(x=>x.m).sort(sortByKick);
  const liveNow = MATCHES.filter(m=>status(m)==="live").sort(sortByKick);

  // Next upcoming day if nothing today
  let next = [];
  if(!todays.length){
    const fut = dated.filter(x=>x.d.getTime()>now.getTime()).sort((a,b)=>a.d-b.d);
    if(fut.length){
      const nk = dayKeyET(fut[0].d);
      next = fut.filter(x=>dayKeyET(x.d)===nk).map(x=>x.m).sort(sortByKick);
    }
  }
  // Recently finished (last 24h-ish, regardless of calendar day) for quick results
  const recent = dated.filter(x=> x.m.score && Array.isArray(x.m.score.ft) && status(x.m)!=="live"
                    && dayKeyET(x.d)!==todayKey )
                  .sort((a,b)=>b.d-a.d).slice(0,4).map(x=>x.m);

  let html = "";

  // 0) Favourite-team section leads the page when chosen; otherwise the live hero.
  if(state.fav && TEAMS[state.fav]){
    html += favTeamSection(state.fav);
  } else {
    html += liveStatsPanel();
  }
  html += championBanner(true);

  // 1) Live now — headline of the page
  if(liveNow.length){
    html += `<div class="sec-title"><h2>🔴 Live now</h2><span class="meta">${liveNow.length} match${liveNow.length>1?"es":""}</span></div>`;
    html += liveNow.map(matchCard).join("");
  }

  // 2) Today's slate (or next matchday)
  if(todays.length){
    html += `<div class="sec-title"><h2>Today's matches</h2><span class="meta">${dayLabelET(now)} · ET</span></div>`;
    html += todays.map(matchCard).join("");
  } else if(next.length){
    html += `<div class="sec-title"><h2>Next up</h2><span class="meta">${dayLabelET(kickoffDate(next[0]))}</span></div>`;
    html += next.map(matchCard).join("");
  } else if(!liveNow.length){
    html += `<div class="empty">No matches scheduled.</div>`;
  }

  // 2b) Analyst's Desk — sports-style read on the bracket, upsets & big ties.
  const desk = analystCommentary(true);
  if(desk){ html += bracketStatsPills(); html += desk; }

  // 2c) Key group-stage matchups still to come (marquee / blockbuster pairings),
  // skipping anything already shown live or in today's/next slate above.
  const shown = new Set([...liveNow, ...todays, ...next].map(matchKey));
  html += keyGroupMatchups(shown);

  // 3) Top stories — compact teasers; full coverage lives on the News page
  html += topStories();

  // 4) Latest results (kept short to avoid an endless page)
  if(recent.length){
    html += `<div class="sec-title"><h2>Latest results</h2><span class="meta">final scores</span></div>`;
    html += recent.slice(0,3).map(matchCard).join("");
  }

  return html;
}

function viewSchedule(state){
  const groups = [..."ABCDEFGHIJKL"].map(g=>"Group "+g);
  const rounds = ["Group Stage","Round of 32","Round of 16","Quarter-final","Semi-final","Match for third place","Final"];

  const filt = state.scheduleFilter || {q:"",round:"all"};
  let list = MATCHES.slice();

  if(filt.round!=="all"){
    if(filt.round==="Group Stage") list = list.filter(m=>m.group);
    else list = list.filter(m=>m.round===filt.round);
  }
  if(filt.q){
    const q = filt.q.toLowerCase();
    list = list.filter(m=>{
      const t1=teamLabel(m.team1).name, t2=teamLabel(m.team2).name;
      return (m.team1+m.team2+t1+t2+(m.group||"")+(m.ground||"")).toLowerCase().includes(q);
    });
  }
  // Newest/current at the top; days scroll backwards into the past. Live games
  // are pinned above everything; not-yet-played fixtures sit below in a clearly
  // separated "Upcoming" block (ascending), so today is the anchor.
  const todayKey = dayKeyET(new Date());
  const liveList = list.filter(m=>status(m)==="live").sort(sortByKick);
  const liveSet  = new Set(liveList.map(matchKey));

  const days = {};
  list.forEach(m=>{
    if(liveSet.has(matchKey(m))) return;
    const d=kickoffDate(m); const k=d?dayKeyET(d):"TBD";
    (days[k]=days[k]||[]).push(m);
  });
  const dayKeys = Object.keys(days).filter(k=>k!=="TBD");
  const pastToday = dayKeys.filter(k=>k<=todayKey).sort().reverse();   // today → backwards
  const future    = dayKeys.filter(k=>k>todayKey).sort();             // soonest upcoming first
  const descKick = (a,b)=>-sortByKick(a,b);

  const opts = ['<option value="all">All rounds</option>',
    ...rounds.map(r=>`<option value="${esc(r)}" ${filt.round===r?"selected":""}>${esc(r==="Match for third place"?"3rd-place match":r)}</option>`)].join("");

  let html = `<div class="filters">
      <input id="schQ" type="search" placeholder="Search team, group or venue…" value="${esc(filt.q)}" />
      <select id="schRound">${opts}</select>
    </div>
    <p class="hint">${list.length} match${list.length===1?"":"es"} · newest first · ET &amp; your local time (${esc(localTZ)})</p>`;

  if(!list.length){ html += `<div class="empty">No matches match your filters.</div>`; return html; }

  if(liveList.length){
    html += `<div class="daygroup"><div class="dayhead live">🔴 Live now</div>${liveList.map(matchCard).join("")}</div>`;
  }
  pastToday.forEach(k=>{
    const label = dayLabelET(kickoffDate(days[k][0])) + (k===todayKey ? " · Today" : "");
    html += `<div class="daygroup"><div class="dayhead">${esc(label)}</div>${days[k].sort(descKick).map(matchCard).join("")}</div>`;
  });
  if(future.length){
    html += `<div class="daygroup"><div class="dayhead up">⏳ Upcoming fixtures</div></div>`;
    future.forEach(k=>{
      const label = dayLabelET(kickoffDate(days[k][0]));
      html += `<div class="daygroup"><div class="dayhead">${esc(label)}</div>${days[k].sort(sortByKick).map(matchCard).join("")}</div>`;
    });
  }
  if(days["TBD"]) html += `<div class="daygroup"><div class="dayhead">Date TBD</div>${days["TBD"].map(matchCard).join("")}</div>`;
  return html;
}

/* ---------- Group qualification scenarios ("advance if…") ----------
   Format: top 2 of each group + 8 best 3rd-placed teams reach the Round of 32.
   We enumerate every remaining group result (representative 1–0 / 0–0 lines for
   tiebreak GD/GF) and read each team's possible finishing range. Tiebreakers
   are simplified (Pts → GD → GF). */
function groupTeams(g){
  const s=[]; MATCHES.filter(m=>m.group===g).forEach(m=>[m.team1,m.team2].forEach(t=>{ if(TEAMS[t]&&!s.includes(t)) s.push(t); }));
  return s;
}
function remainingGroupMatches(g){
  return MATCHES.filter(m=>m.group===g && !(m.score && Array.isArray(m.score.ft)));
}
function _applyRes(tbl,t1,t2,a,b){
  const A=tbl[t1], B=tbl[t2]; if(!A||!B) return;
  A.GF+=a; B.GF+=b; A.GD+=a-b; B.GD+=b-a;
  if(a>b) A.Pts+=3; else if(b>a) B.Pts+=3; else { A.Pts++; B.Pts++; }
}
function scenarioTable(g, rem, combo){
  const tbl={}; groupTeams(g).forEach(t=>tbl[t]={t,Pts:0,GD:0,GF:0});
  MATCHES.filter(m=>m.group===g && m.score && Array.isArray(m.score.ft))
    .forEach(m=>_applyRes(tbl,m.team1,m.team2,m.score.ft[0],m.score.ft[1]));
  rem.forEach((m,i)=>{ const o=combo[i]; const [a,b]= o==="H"?[1,0]:o==="A"?[0,1]:[0,0]; _applyRes(tbl,m.team1,m.team2,a,b); });
  return Object.values(tbl).sort((x,y)=> y.Pts-x.Pts || y.GD-x.GD || y.GF-x.GF || x.t.localeCompare(y.t));
}
function allCombos(n){
  let out=[[]];
  for(let i=0;i<n;i++){ const nx=[]; out.forEach(s=>["H","D","A"].forEach(o=>nx.push([...s,o]))); out=nx; }
  return out;
}
function groupScenarios(g){
  const teams=groupTeams(g); if(teams.length<4) return {};
  const rem=remainingGroupMatches(g);
  const res={};
  if(rem.length===0){
    scenarioTable(g,[],[]).forEach((r,i)=>{ res[r.t]= i<2 ? {label:"Through (top 2)",cls:"q-in"} : i===2 ? {label:"3rd — best-third contention",cls:"q-maybe"} : {label:"Eliminated",cls:"q-out"}; });
    return res;
  }
  const combos=allCombos(rem.length);
  const pos={}; teams.forEach(t=>pos[t]=[]);
  combos.forEach(c=>{ scenarioTable(g,rem,c).forEach((r,i)=>pos[r.t].push(i+1)); });
  teams.forEach(t=>{
    const min=Math.min(...pos[t]), max=Math.max(...pos[t]);
    if(max<=2) res[t]={label:"Through to Round of 32",cls:"q-in"};
    else if(min>=4) res[t]={label:"Eliminated",cls:"q-out"};
    else if(min>=3) res[t]={label:"Out of top 2 — needs a best-3rd spot",cls:"q-maybe"};
    else res[t]={label:conditionLabel(g,t,rem),cls:"q-cond"};
  });
  return res;
}
function conditionLabel(g,t,rem){
  const idx=rem.findIndex(m=>m.team1===t||m.team2===t);
  if(idx<0) return "Final spot depends on other results";
  const isHome=rem[idx].team1===t;
  const combos=allCombos(rem.length);
  const guarantees=(need)=>{
    let any=false, all=true;
    for(const c of combos){
      const o=c[idx];
      const r = o==="D" ? "draw" : ((o==="H")===isHome ? "win" : "loss");
      const ok = need==="win" ? r==="win" : need==="avoid" ? r!=="loss" : false;
      if(!ok) continue;
      any=true;
      const tbl=scenarioTable(g,rem,c);
      if(tbl.findIndex(x=>x.t===t)+1 > 2){ all=false; break; }
    }
    return any && all;
  };
  if(guarantees("avoid")) return "Advance (top 2) with a win or draw";
  if(guarantees("win"))   return "Must win to control top-2 spot";
  return "Win and depend on other results";
}
function scenarioHTML(g){
  const sc=groupScenarios(g); const order=standings(g).map(r=>r.t);
  if(!order.length) return "";
  const rows = order.map(t=>{ const s=sc[t]; if(!s) return "";
    return `<div class="qrow"><span class="flag">${flag(t)}</span><span class="qnm">${esc(t)}</span><span class="qbadge ${s.cls}">${esc(s.label)}</span></div>`;
  }).join("");
  return `<div class="qlist">${rows}</div>`;
}

/* ---------- Best 3rd-placed teams (8 of 12 advance) ---------- */
function bestThirds(){
  const thirds=[];
  [..."ABCDEFGHIJKL"].forEach(L=>{
    const rows=standings("Group "+L);
    if(rows[2] && rows[2].P>0) thirds.push({...rows[2], group:L});
  });
  return thirds.sort((a,b)=> b.Pts-a.Pts || b.GD-a.GD || b.GF-a.GF || a.t.localeCompare(b.t));
}
function bestThirdsHTML(){
  const t=bestThirds(); if(t.length<2) return "";
  const rows=t.map((r,i)=>`<div class="qrow b3">
      <span class="b3-rk ${i<8?'in':'out'}">${i+1}</span>
      <span class="flag">${flag(r.t)}</span>
      <span class="qnm">${esc(r.t)} <small>Grp ${r.group}</small></span>
      <span class="b3-pts">${r.Pts}pt · ${r.GD>0?"+":""}${r.GD}</span>
      <span class="qbadge ${i<8?'q-in':'q-out'}">${i<8?'Qualifies':'Out'}</span>
    </div>`).join("");
  return `<div class="sec-title"><h2>Best 3rd-placed</h2><span class="meta">8 of 12 advance</span></div>
    <div class="qlist b3wrap">${rows}</div>
    <p class="note">Live ranking of teams currently 3rd in their group (Pts → GD → GF). The top 8 take the remaining Round-of-32 places.</p>`;
}

function viewGroups(){
  // Team performance leaders across all groups (with form guide)
  const leaders = allTeamRows().slice(0,8);
  let html = "";
  if(leaders.length){
    html += `<div class="sec-title"><h2>Team performance</h2><span class="meta">leaders · recent form</span></div>`;
    html += `<div class="perf">` + leaders.map((r,i)=>`
      <div class="perf-row">
        <span class="perf-rk">${i+1}</span>
        <span class="flag">${flag(r.t)}</span>
        <span class="perf-nm">${esc(r.t)}</span>
        ${formDots(teamForm(r.t,5))}
        <span class="perf-pts">${r.Pts}<small>pts</small></span>
      </div>`).join("") + `</div>`;
  }

  html += `<div class="sec-title"><h2>Groups &amp; standings</h2><span class="meta">Top 2 + 8 best 3rds advance</span></div>`;
  html += `<div class="grid two">`;
  [..."ABCDEFGHIJKL"].forEach(L=>{
    const g="Group "+L;
    const rows = standings(g);
    const body = rows.map((r,i)=>`<tr class="${i<2?"qual":""}">
        <td class="pos">${i+1}</td>
        <td class="t"><span class="flag">${flag(r.t)}</span>${esc(r.t)}</td>
        <td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td>
        <td>${r.GF}:${r.GA}</td><td>${r.GD>0?"+":""}${r.GD}</td>
        <td class="pts">${r.Pts}</td>
      </tr>`).join("");
    const played = (rows.reduce((s,r)=>s+r.P,0)/2)|0;
    html += `<div class="gcard">
      <h3>Group ${L} <span class="tag">${played}/6 played</span></h3>
      <table class="stand">
        <thead><tr><th></th><th style="text-align:left">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF:GA</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
      <div class="qual-head">Qualification — advance if…</div>
      ${scenarioHTML(g)}
    </div>`;
  });
  html += `</div>`;
  html += bestThirdsHTML();
  html += `<p class="note">Scenarios enumerate all remaining group results; tiebreakers simplified (Pts → GD → GF). Best-3rd places are decided across all 12 groups.</p>`;
  return html;
}

/* ---------- VIEW: Knockout bracket (with live projections) ----------
   Placeholders resolve from current standings: 1X/2X = group leader/runner-up,
   3X/Y/.. = a projected best-3rd, W##/L## = projected winner/loser by strength.
   Recomputed every render, so it auto-updates as results land. */
let _projThirds = null;
function matchByNum(n){ return MATCHES.find(m=>m.num===n); }

// Team→standings-row cache (per render) and a "form score" used to project.
let _teamRows = null;
function teamRowOf(t){
  if(!_teamRows){ _teamRows={}; [..."ABCDEFGHIJKL"].forEach(L=>standings("Group "+L).forEach(r=>{_teamRows[r.t]=r;})); }
  return _teamRows[t] || null;
}
// Power rating: a pre-tournament prior (from market strength) that regresses
// toward ACTUAL tournament form as games are played — so early on the prior
// leads, but points/goal-difference per game take over with more matches.
function formScore(t){
  const prior = Math.max(0.5, Math.min(10, strengthOf(t)/2 + 1));   // ~0.5..10
  const r = teamRowOf(t);
  if(!r || r.P===0) return prior;
  const ppg = r.Pts/r.P, gdpg = r.GD/r.P, gfpg = r.GF/r.P;
  const form = Math.max(0, ppg*2.6 + gdpg*0.9 + gfpg*0.3);          // ~0..9 on the same scale
  const w = Math.min(1, r.P/3) * 0.65;                              // up to 65% on form after 3 games
  return prior*(1-w) + form*w;
}
// Rank every nation by current form (1 = best) so ties can be billed relative
// to the field rather than against fixed numbers.
let _formRank = null;
function formRankMap(){
  if(_formRank) return _formRank;
  const ranked = Object.keys(TEAMS).map(t=>[t, formScore(t)]).sort((a,b)=>b[1]-a[1]);
  const m = {}; ranked.forEach(([t],i)=>{ m[t]=i+1; });
  return (_formRank = m);
}
// "Masterful pairing" billing: flag knockout ties where two in-form, high-quality
// sides could meet — the matchups fans would most anticipate. Blockbuster = two
// top-6 sides in a balanced clash; Marquee = both inside the top 12 on form.
function tieBilling(a, b){
  if(!TEAMS[a] || !TEAMS[b]) return null;
  const rk = formRankMap(), ra = rk[a], rb = rk[b];
  if(!ra || !rb) return null;
  const worse = Math.max(ra, rb);                 // both must be strong → weaker side's rank
  const gap = Math.abs(formScore(a) - formScore(b));
  if(worse <= 6 && gap <= 1.4) return {tier:"blockbuster", label:"🔥 Blockbuster"};
  if(worse <= 12) return {tier:"marquee", label:"⭐ Marquee tie"};
  return null;
}
// Standings ordered with a form/strength tiebreak so every position resolves
// even before games are played.
function projectedStandings(g){
  return standings(g).slice().sort((a,b)=>
    b.Pts-a.Pts || b.GD-a.GD || b.GF-a.GF || (formScore(b.t)-formScore(a.t)) || a.t.localeCompare(b.t));
}
function projectedThirds(){
  if(_projThirds) return _projThirds;
  const ranked = [..."ABCDEFGHIJKL"].map(L=>{ const r=projectedStandings("Group "+L)[2]; return r?{...r, group:L}:null; })
    .filter(Boolean)
    .sort((a,b)=> b.Pts-a.Pts || b.GD-a.GD || b.GF-a.GF || (formScore(b.t)-formScore(a.t)) || a.t.localeCompare(b.t));
  const top8 = ranked.slice(0,8);
  const qual = new Set(top8.map(r=>r.group));
  const byGroup = {}; top8.forEach(r=>byGroup[r.group]=r.t);
  const slots = MATCHES.filter(m=>!m.group && m.round==="Round of 32").map(m=>{
    const code = (String(m.team1)[0]==="3" && String(m.team1).includes("/")) ? m.team1
               : (String(m.team2)[0]==="3" && String(m.team2).includes("/")) ? m.team2 : null;
    return code ? {code, cand:code.slice(1).split("/").filter(g=>qual.has(g))} : null;
  }).filter(Boolean);
  const assign = {}, used = new Set();
  slots.slice().sort((a,b)=>a.cand.length-b.cand.length).forEach(s=>{
    let g = top8.find(r=>s.cand.includes(r.group) && !used.has(r.group));
    g = g ? g.group : (s.cand.find(x=>!used.has(x)) || top8.map(r=>r.group).find(x=>!used.has(x)));
    if(g){ assign[s.code]=g; used.add(g); }
  });
  return (_projThirds = {assign, byGroup});
}
// Resolve ALL Round-of-32 slots once per render with guaranteed uniqueness, so
// no team can ever occupy two R32 slots (which would put it on two bracket paths).
let _r32map = null;
function r32map(){
  if(_r32map) return _r32map;
  const map = {}, used = new Set();
  const r32 = MATCHES.filter(m=>!m.group && m.round==="Round of 32").sort((a,b)=>(a.num||0)-(b.num||0));
  const codes = [];
  r32.forEach(m=>{ codes.push(String(m.team1)); codes.push(String(m.team2)); });
  // 1) Confirmed real teams claim their slot first.
  codes.forEach(c=>{ if(TEAMS[c] && !(c in map)){ map[c]=c; used.add(c); } });
  // 2) Group winners / runners-up.
  const thirdsCodes = [];
  codes.forEach(c=>{
    if(c in map) return;
    const m = c.match(/^([12])([A-L])$/);
    if(!m){ thirdsCodes.push(c); return; }
    const ord = projectedStandings("Group "+m[2]).map(r=>r.t);
    let t = ord[m[1]==="1"?0:1];
    if(!t || used.has(t)) t = ord.find(x=>!used.has(x)) || t;
    map[c]=t; used.add(t);
  });
  // 3) Best-third slots (deduped against everything already placed).
  const {assign, byGroup} = projectedThirds();
  const pool = [..."ABCDEFGHIJKL"].map(L=>projectedStandings("Group "+L)[2]).filter(Boolean).map(r=>r.t);
  thirdsCodes.forEach(c=>{
    if(c in map) return;
    let t = byGroup[assign[c]];
    if(!t || used.has(t)) t = pool.find(x=>!used.has(x)) || t;
    if(t){ map[c]=t; used.add(t); }
  });
  return (_r32map = map);
}
// Teams that are knocked out RIGHT NOW, from real results — so projections drop
// them in real time. Covers (a) the losing side of any played knockout tie and
// (b) group teams whose group is finished and who can no longer advance (4th as
// soon as their group ends; 3rd only once every group is done and the best‑third
// race is settled). Conservative: never eliminates a team whose fate is still open.
let _elim = null;
function eliminatedTeams(){
  if(_elim) return _elim;
  const out = new Set();
  // (a) Knockout losers from real results (incl. penalty defeats).
  Object.values(KO_RESULT).forEach(r=>{ if(r.finished && r.loser) out.add(r.loser); });
  // (b) Completed-group non-qualifiers.
  const groupDone = L => { const gm=MATCHES.filter(m=>m.group==="Group "+L); return gm.length>0 && gm.every(m=>m.score && Array.isArray(m.score.ft)); };
  const allGroupsDone = [..."ABCDEFGHIJKL"].every(groupDone);
  let thirdGroups = new Set();
  try{ thirdGroups = new Set(Object.keys(projectedThirds().byGroup)); }catch(e){}
  [..."ABCDEFGHIJKL"].forEach(L=>{
    if(!groupDone(L)) return;
    const st = standings("Group "+L);
    st.forEach((r,i)=>{
      if(i>=3) out.add(r.t);                                   // 4th (or lower) — out once the group ends
      else if(i===2 && allGroupsDone && !thirdGroups.has(L)) out.add(r.t);  // 3rd — out only when best-3rds are settled
    });
  });
  return (_elim = out);
}
// Resolve a placeholder/team code to {team, confirmed}. confirmed=true once the
// matchup is officially announced (real team in the feed, or a played result).
function resolveCode(code){
  code = String(code);
  if(TEAMS[code]) return {team:code, confirmed:true};
  if(KO_SLOT[code]) return {team:KO_SLOT[code], confirmed:true};   // real team that filled this R32 slot
  if(/^[12][A-L]$/.test(code) || (code[0]==="3" && code.includes("/"))){
    const t = r32map()[code]; return t ? {team:t, confirmed:false} : null;
  }
  const m = code.match(/^([WL])(\d+)$/);
  if(m) return projOutcome(+m[2], m[1]==="L");
  return null;
}
function projOutcome(num, wantLoser){
  const ko = KO_RESULT[num];                           // real result (incl. penalties) wins
  if(ko && ko.finished && ko.winner) return { team: wantLoser ? ko.loser : ko.winner, confirmed:true };
  const mt = matchByNum(num); if(!mt) return null;
  if(mt.score && Array.isArray(mt.score.ft) && TEAMS[mt.team1] && TEAMS[mt.team2]){  // played, real teams
    const [a,b] = mt.score.ft;
    const w = a>=b ? mt.team1 : mt.team2, l = a>=b ? mt.team2 : mt.team1;
    return resolveCode(wantLoser ? l : w);
  }
  const A = resolveCode(mt.team1), B = resolveCode(mt.team2);
  if(!A || !B) return null;
  // A knocked-out team can never be projected to advance — the other side goes through.
  const E = eliminatedTeams(), aOut = E.has(A.team), bOut = E.has(B.team);
  let strong;
  if(aOut && !bOut) strong = B;
  else if(bOut && !aOut) strong = A;
  else strong = formScore(A.team) >= formScore(B.team) ? A : B;
  const weak = strong===A ? B : A;
  return { team:(wantLoser?weak:strong).team, confirmed:false };
}
function projTeam(code){ const r = resolveCode(code); return r ? r.team : null; }   // compat

// Predict a knockout scoreline from current form. Scores align to team1(a)/
// team2(b); the winner is the higher-form side that advances in the bracket.
//
// Model: each side's form rating (formScore — pre-tournament strength regressed
// to in-tournament points/GD/GF) is turned into an expected-goals figure that
// rises with the gap over the opponent and is damped down for knockout football
// (low-scoring). A deterministic hash then samples a Poisson count per side, so
// scorelines vary realistically with the actual mismatch — a near-even tie may
// finish 1-0 or go to penalties, while a big gap can yield 3-0 or 4-1.
function clampN(lo, x, hi){ return Math.max(lo, Math.min(hi, x)); }
function poissonInv(lambda, u){            // inverse-CDF Poisson sample from u∈[0,1)
  let p = Math.exp(-lambda), cum = p, k = 0;
  while(u > cum && k < 8){ k++; p *= lambda/k; cum += p; }
  return k;
}
function predictTie(m, a, b){
  // Pure-form prediction (the genuine pre-game call) — so once a result lands we
  // can show whether it was right, upsets included. Advancement is handled in
  // projOutcome, which does honour real eliminations.
  const fa = formScore(a), fb = formScore(b), favA = fa >= fb;
  const diff = Math.abs(fa - fb);                          // form gap, >= 0
  // Expected goals: favourite climbs with the gap, underdog falls; both damped.
  const lamFav = clampN(0.45, 1.30 * Math.exp(0.17 * diff), 3.3);
  const lamDog = clampN(0.20, 1.15 * Math.exp(-0.20 * diff), 2.6);
  const rFav = hash((m.num||0) + "|F|" + a + "|" + b);
  const rDog = hash((m.num||0) + "|D|" + a + "|" + b);
  let favG = poissonInv(lamFav, rFav);
  let dogG = poissonInv(lamDog, rDog);
  let pens = false;
  if(dogG >= favG){            // level after 90/120 on the night → settled on penalties
    dogG = favG;
    pens = true;
  }
  const winner = favA ? a : b;
  return favA ? {a:favG, b:dogG, pens, winner} : {a:dogG, b:favG, pens, winner};
}

// Display info for one side of a bracket card.
function bracketTeam(code){
  const E = eliminatedTeams();
  if(TEAMS[code]){ const t=teamLabel(code); return {flag:t.flag, name:t.name, proj:false, ph:false, conf:true, elim:E.has(code)}; }
  const r = resolveCode(code);
  if(r){ const t=teamLabel(r.team); return {flag:t.flag, name:t.name, proj:!r.confirmed, ph:false, conf:r.confirmed, elim:E.has(r.team)}; }
  const t = teamLabel(code); return {flag:t.flag, name:t.name, proj:false, ph:true, conf:false, elim:false};
}
// Projected (or crowned) champion = winner of the final (match 104).
function predictedChampion(){
  return MATCHES.some(m=>m.round==="Final") ? resolveCode("W104") : null;
}
function championBanner(compact){
  const c = predictedChampion();
  if(!c || !c.team) return "";
  return `<div class="champ ${compact?"compact":""} ${c.confirmed?"won":""}">
      <span class="champ-trophy">🏆</span>
      <div class="champ-body">
        <div class="champ-label">${c.confirmed?"World Cup 2026 — Champions":"Predicted champion"}</div>
        <div class="champ-team">${flag(c.team)} ${esc(c.team)}</div>
      </div>
      ${c.confirmed?'<span class="champ-tag won">🏆</span>':'<span class="champ-tag">PROJ</span>'}
    </div>`;
}

// Model confidence (%) in the favourite of a tie, from the current form gap.
// 50% = a coin-flip; a big mismatch approaches the 90s.
function winConfidence(a, b){
  const gap = Math.abs(formScore(a) - formScore(b));
  return Math.round(100 / (1 + Math.exp(-gap * 0.45)));   // ~50%..~95%
}
// Live match odds from current form. A form-derived expected-goals model gives
// Poisson win/draw/win probabilities; we add a small bookmaker margin and quote
// decimal odds. Recomputed every refresh, so the line moves with form & results.
// (Model-implied prices — swap in a sportsbook feed via a proxy for true market odds.)
function _pois(l,k){ let f=1; for(let i=2;i<=k;i++) f*=i; return Math.exp(-l)*Math.pow(l,k)/f; }
function matchOdds(a, b){
  const diff = formScore(a) - formScore(b);
  const lamA = clampN(0.25, 1.35*Math.exp(0.18*diff), 3.6);
  const lamB = clampN(0.25, 1.35*Math.exp(-0.18*diff), 3.6);
  let pH=0, pD=0, pA=0;
  for(let i=0;i<=8;i++) for(let j=0;j<=8;j++){ const p=_pois(lamA,i)*_pois(lamB,j); if(i>j) pH+=p; else if(i===j) pD+=p; else pA+=p; }
  const s=pH+pD+pA || 1; pH/=s; pD/=s; pA/=s;
  const MARGIN = 1.06;                                  // ~6% overround, like a real book
  const dec = p => Math.min(26, Math.max(1.02, Math.round((1/(p*MARGIN))*100)/100));
  return { pH, pD, pA, oH:dec(pH), oD:dec(pD), oA:dec(pA) };
}
// Two-way "to advance" prices for a knockout tie (no draw — penalties decide).
function advanceOdds(a, b){
  const favA = formScore(a) >= formScore(b);
  const c = winConfidence(a,b)/100;                     // favourite win prob
  const pa = favA ? c : 1-c, pb = 1-pa, M = 1.05;
  const dec = p => Math.min(21, Math.max(1.02, Math.round((1/(p*M))*100)/100));
  return { pA:pa, pB:pb, oA:dec(pa), oB:dec(pb) };
}
// Tournament-wide prediction scoreboard: picks called correctly, accuracy, the
// average confidence on the ties still to come, and how many teams remain.
function bracketStats(){
  const ko = MATCHES.filter(m=>!m.group && m.num!=null && m.round!=="Match for third place");
  const decided = ko.filter(m=>{ const k=KO_RESULT[m.num]; return k && k.finished && k.winner; });
  let correct = 0;
  decided.forEach(m=>{ const k=KO_RESULT[m.num]; if(predictTie(m,k.home,k.away).winner === k.winner) correct++; });
  const total = decided.length;
  const acc = total ? Math.round(correct/total*100) : null;
  const rem = ko.filter(m=>!(KO_RESULT[m.num]&&KO_RESULT[m.num].finished))
    .map(m=>{ const t1=bracketTeam(m.team1), t2=bracketTeam(m.team2); return (!t1.ph&&!t2.ph) ? winConfidence(t1.name,t2.name) : null; })
    .filter(x=>x!=null);
  const avgConf = rem.length ? Math.round(rem.reduce((a,b)=>a+b,0)/rem.length) : null;
  return { correct, total, acc, avgConf, left: Math.max(1, 32 - total), started: total>0 };
}
function bracketStatsPills(){
  const s = bracketStats();
  if(!MATCHES.some(m=>!m.group)) return "";
  const pills = [`<span class="kpill"><b>${s.left}</b> teams left</span>`];
  if(s.started) pills.push(`<span class="kpill ${s.acc>=50?"good":"bad"}"><b>${s.correct}/${s.total}</b> picks correct · ${s.acc}%</span>`);
  if(s.avgConf!=null) pills.push(`<span class="kpill ${s.avgConf>=66?"good":s.avgConf>=56?"mid":"bad"}"><b>${s.avgConf}%</b> ${s.started?"confidence ahead":"avg confidence"}</span>`);
  return `<div class="kpills">${pills.join("")}</div>`;
}

// Sports-analyst commentary on the tournament: teams left, shock upsets vs the
// form predictions, the biggest looming matchups, and where the model stands.
// Recomputed every render, so it updates live as results and surprises land.
function analystCommentary(compact){
  const ko = MATCHES.filter(m=>!m.group && m.num!=null && m.round!=="Match for third place");
  if(!ko.length) return "";
  const finished = ko.filter(m=>{ const k=KO_RESULT[m.num]; return k && k.finished && k.winner; });
  const liveNow  = ko.filter(m=>{ const k=KO_RESULT[m.num]; return k && k.live; });
  const koStarted = finished.length>0 || liveNow.length>0;

  const RND = {"Round of 32":"Round of 32","Round of 16":"Round of 16","Quarter-final":"quarter-finals","Semi-final":"semi-finals","Final":"final"};
  const roundOrder = ["Round of 32","Round of 16","Quarter-final","Semi-final","Final"];
  const curRound = roundOrder.find(r=>ko.some(m=>m.round===r && !(KO_RESULT[m.num]&&KO_RESULT[m.num].finished))) || "Final";

  // Shock upsets: a finished tie whose winner wasn't the pre-game form pick.
  const upsets = finished.map(m=>{
    const k = KO_RESULT[m.num], p = predictTie(m, k.home, k.away);
    if(p.winner === k.winner) return null;
    return { winner:k.winner, loser:k.loser, pens:!!k.pens, round:m.round,
             gap:Math.abs(formScore(k.home)-formScore(k.away)) };
  }).filter(Boolean).sort((a,b)=>b.gap-a.gap);

  // Biggest looming ties (unplayed, both teams known) by billing, confirmed first.
  const huge = ko.filter(m=>!(KO_RESULT[m.num]&&KO_RESULT[m.num].finished))
    .map(m=>{ const t1=bracketTeam(m.team1), t2=bracketTeam(m.team2); if(t1.ph||t2.ph) return null;
      const b=tieBilling(t1.name,t2.name); return b?{t1:t1.name,t2:t2.name,b,conf:t1.conf&&t2.conf,round:m.round}:null; })
    .filter(Boolean)
    .sort((a,b)=> (a.b.tier==="blockbuster"?0:1)-(b.b.tier==="blockbuster"?0:1) || (b.conf?1:0)-(a.conf?1:0));

  const champ = predictedChampion();
  const lines = [];

  if(koStarted){
    const left = Math.max(1, 32 - finished.length);
    lines.push(`We're into the <b>${RND[curRound]||curRound}</b> and <b>${left}</b> ${left===1?"side is left standing":"sides are still alive"}.`);
    if(upsets.length){
      const u = upsets[0];
      lines.push(`Tear up the form book — <b>${esc(u.winner)}</b> dumped out <b>${esc(u.loser)}</b>${u.pens?" on penalties":""}, the kind of result that defines a tournament.`);
      if(upsets.length>1) lines.push(`That's <b>${upsets.length} shock${upsets.length>1?"s":""}</b> against our model so far${upsets[1]?`, with <b>${esc(upsets[1].winner)}</b> also sending <b>${esc(upsets[1].loser)}</b> home`:""}.`);
    } else {
      lines.push(`The favourites are holding firm so far — chalk is winning, no major shocks on the board yet.`);
    }
    if(huge.length){
      const h = huge[0];
      lines.push(`Mark your card: <b>${esc(h.t1)} v ${esc(h.t2)}</b> is ${h.b.tier==="blockbuster"?"a heavyweight collision":"a marquee tie"}${h.conf?" and it's locked in":" if the bracket holds"}.`);
    }
    if(champ && champ.team) lines.push(champ.confirmed
      ? `And it's done — <b>${esc(champ.team)}</b> are champions of the world. 🏆`
      : `The model still backs <b>${esc(champ.team)}</b> to lift the trophy — but on this evidence, nobody's safe.`);
  } else {
    // Group-stage flavour.
    const elim = eliminatedTeams();
    lines.push(`The group stage is in full swing and the knockout picture is taking shape.`);
    if(elim.size) lines.push(`<b>${elim.size}</b> nation${elim.size>1?"s have":" has"} already been eliminated; the rest are scrapping for a Round-of-32 ticket.`);
    if(huge.length){ const h=huge[0]; lines.push(`Keep an eye on <b>${esc(h.t1)} v ${esc(h.t2)}</b> — ${h.b.tier==="blockbuster"?"a blockbuster":"a marquee clash"} in the making.`); }
    if(champ && champ.team) lines.push(`Our model's early call for the trophy: <b>${esc(champ.team)}</b>.`);
  }

  return `<div class="analyst ${compact?"compact":""}">
      <div class="analyst-head"><span class="analyst-badge">📣 Analyst's Desk</span><span class="analyst-live">live · updates with every result</span></div>
      <p class="analyst-body">${lines.join(" ")}</p>
    </div>`;
}
function bracketCard(m){
  const sc=(m.score && Array.isArray(m.score.ft)) ? m.score.ft : null;
  const d=kickoffDate(m), st=status(m);
  const t1=bracketTeam(m.team1), t2=bracketTeam(m.team2);
  const fav=state.fav, onPath = fav && (t1.name===fav || t2.name===fav);
  const ko = KO_RESULT[m.num];                          // real knockout result (with penalties)
  let w1=sc&&sc[0]>sc[1], w2=sc&&sc[1]>sc[0];
  if(ko && ko.finished && ko.winner){ w1 = ko.winner===t1.name; w2 = ko.winner===t2.name; }  // pen winner highlight
  const projected = !sc && (t1.proj || t2.proj);
  const locked = !sc && !projected && t1.conf && t2.conf;   // matchup announced, not yet played
  // Form prediction for any tie where both teams are known — kept even after the
  // game so we can show predicted-vs-actual ("how the prediction played out").
  const pred = (!t1.ph && !t2.ph) ? predictTie(m, t1.name, t2.name) : null;
  // Marquee/blockbuster billing for an anticipated (unplayed) pairing.
  const bill = (!sc && !t1.ph && !t2.ph) ? tieBilling(t1.name, t2.name) : null;
  let s1 = sc ? sc[0] : (pred ? pred.a : null);
  let s2 = sc ? sc[1] : (pred ? pred.b : null);
  const pw1 = !sc && pred && pred.winner===t1.name, pw2 = !sc && pred && pred.winner===t2.name;
  // Model confidence (%) in the predicted winner of this tie.
  const conf = (!t1.ph && !t2.ph) ? winConfidence(t1.name, t2.name) : null;
  // Once played: compare the form prediction to the real result.
  const actualWinner = sc ? (w1?t1.name : w2?t2.name : null) : null;
  const predCmp = (sc && pred && actualWinner) ? (()=>{
    const exact = pred.a===sc[0] && pred.b===sc[1];
    const right = pred.winner===actualWinner;
    return `<span class="bpredchk ${exact?'exact':right?'ok':'miss'}" title="Pre-game form pick: ${esc(pred.winner)} ${pred.a}-${pred.b} at ${conf}% confidence">pred ${pred.a}–${pred.b} · ${conf}% ${exact?'🎯':right?'✓':'✗ upset'}</span>`;
  })() : "";
  // Unplayed: show the model's confidence in its pick (green = strong, red = shaky).
  const confPill = (!sc && conf!=null) ? `<span class="bconf ${conf>=66?"good":conf>=56?"mid":"bad"}" title="Model confidence in ${esc(pred?pred.winner:"")}">🔮 ${conf}%</span>` : "";
  // Live "to advance" betting odds for an unplayed tie (model-implied, moves with form).
  const oddsPill = (!sc && !t1.ph && !t2.ph) ? (()=>{
    const o = advanceOdds(t1.name, t2.name);
    return `<span class="bodds" title="${esc(t1.name)} ${o.oA.toFixed(2)} · ${esc(t2.name)} ${o.oB.toFixed(2)} — model odds to advance, moves with form">📈 ${o.oA.toFixed(2)} / ${o.oB.toFixed(2)}</span>`;
  })() : "";
  const when = st==="live" ? `<span class="blive">🔴 ${(liveClock(m)||{}).label||"Live"}</span>`
    : sc ? "Full-time"
    : projected ? "Predicted"
    : d ? `${etFmt.format(d)} ET · ${new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"short",day:"numeric"}).format(d)}`
    : "TBD";
  // "Firm" = a confirmed selection (real team in the feed or a played result):
  // marked with a ★ and shown in the firm colour.
  const row=(t,s,win,predw)=>`<div class="brow ${win||predw?"bw":""} ${t.ph?"bph":""} ${t.proj?"bpr":""} ${t.conf?"bfirm":""} ${t.elim?"bout":""} ${fav&&t.name===fav?"fav-row":""}">
      <span class="flag">${t.flag}</span><span class="bnm">${esc(t.name)}${t.elim?'<span class="bout-tag" title="Knocked out">OUT</span>':t.conf?'<span class="bfirm-star" title="Confirmed selection">★</span>':""}</span><span class="bsc ${!sc&&pred?"pred":""}">${s??""}</span></div>`;
  const tag = projected ? '<span class="bproj-tag">PROJ</span>' : locked ? '<span class="bset-tag">🔒 SET</span>' : "";
  const penNote = (ko && ko.finished && ko.pens && ko.winner)
    ? `<span class="bpen-tag" title="Decided on penalties">⚪ pens ${ko.pens[0]}-${ko.pens[1]} → ${esc(ko.winner)}</span>`
    : pred && pred.pens ? `<span class="bpen-tag" title="Decided on penalties">⚪ pens → ${esc(pred.winner)}</span>` : "";
  const v = VENUES[m.ground];
  const loc = m.ground ? `<span class="bloc" title="${esc(v ? v.s+" · "+v.city : m.ground)}">📍 ${esc(venueShort(m.ground))}</span>` : "";
  const billRibbon = bill ? `<div class="bbill ${bill.tier}" title="A masterful pairing on current form — highly anticipated if it lands">${bill.label}</div>` : "";
  return `<div class="bcard tappable ${projected?"is-proj":""} ${locked?"is-set":""} ${onPath?"fav-path":""} ${bill?"is-"+bill.tier:""}" data-open="${esc(matchKey(m))}" role="button" tabindex="0">
      <i class="bconn" aria-hidden="true"></i>
      ${billRibbon}
      ${row(t1, s1, w1, pw1)}
      ${row(t2, s2, w2, pw2)}
      <div class="bfoot">${when}${loc}${confPill}${oddsPill}${predCmp}${penNote}${tag}</div>
    </div>`;
}
// Vertical display order for each knockout column. The fixture numbering is NOT
// sequential down the bracket (e.g. R16 #89 is fed by R32 #74 & #77), so sorting
// a column by match number misaligns ties with the connectors that feed them.
// Instead order every match by a DFS of the bracket tree from the Final, so each
// tie sits directly between (and centred over) its two feeders.
let _bracketSeq = null;
function bracketSeq(){
  if(_bracketSeq) return _bracketSeq;
  const byNum = {}; MATCHES.forEach(m=>{ if(m.num!=null) byNum[m.num]=m; });
  const ord = {}; let leaf = 0; const seen = new Set();
  (function dfs(num){
    if(seen.has(num)) return; seen.add(num);
    const m = byNum[num]; if(!m) return;
    const kids = [m.team1,m.team2].map(c=>{ const mm=String(c).match(/^W(\d+)$/); return mm?+mm[1]:null; });
    if(kids[0]==null && kids[1]==null){ ord[num]=leaf++; return; }   // leaf = first knockout round
    let first = null;
    kids.forEach(k=>{ if(k!=null){ dfs(k); if(first==null) first=ord[k]; } });
    ord[num] = first!=null ? first : leaf++;
  })((MATCHES.find(m=>m.round==="Final")||{}).num);
  return (_bracketSeq = ord);
}
function viewBracket(){
  const order=[["Round of 32","Round of 32","c-r32"],["Round of 16","Round of 16","c-r16"],
    ["Quarter-final","Quarter-finals","c-qf"],["Semi-final","Semi-finals","c-sf"],["Final","Final","c-final"]];
  const present=order.filter(([r])=>MATCHES.some(m=>m.round===r));
  const seq=bracketSeq();
  let html=`<div class="print-head">FIFA World Cup 26™ — Predicted Bracket <small>(${new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric"}).format(new Date())})</small></div>`;
  html+=`<div class="sec-title"><h2>Knockout bracket</h2><button class="printbtn" onclick="window.print()" title="Print or save as PDF to share">🖨 Print / Share</button></div>`;
  if(!present.length) return html+`<div class="empty">The Round of 32 bracket appears once the group stage is complete. Group qualification is on the Groups tab.</div>`;
  html += bracketStatsPills();
  html += championBanner();
  html += analystCommentary();
  html += `<div class="banner" style="margin-bottom:12px">Bracket is <b>projected on current form</b> — group leaders/runners-up, best 3rds, predicted <b>scorelines</b> and <b>⚪ penalty</b> ties, with the <b>📍 venue</b> for each game. <span style="color:var(--accent);font-weight:800">★ green = firm</span> (confirmed) selections; <span class="bpr-key">dashed = predicted</span>. <b>🔥 Blockbuster</b> / <b>⭐ Marquee</b> flag masterful, highly-anticipated pairings of in-form sides. It adjusts as results land and ties <b>🔒 lock</b> once announced.${state.fav&&TEAMS[state.fav]?` <b style="color:var(--gold)">★ ${esc(state.fav)}'s projected path is highlighted.</b>`:""}</div>`;
  html += `<div class="bracket">`;
  present.forEach(([r,label,cls])=>{
    const ms=MATCHES.filter(m=>m.round===r).sort((a,b)=>(seq[a.num]??a.num)-(seq[b.num]??b.num));
    html += `<div class="bcol ${cls}" data-round="${esc(r)}"><div class="bcol-h">${esc(label)} <span>${ms.length}</span></div><div class="bcards">${ms.map(bracketCard).join("")}</div></div>`;
  });
  html += `</div>`;
  const tp = MATCHES.find(m=>m.round==="Match for third place");
  if(tp){ html += `<div class="sec-title"><h2 style="font-size:14px">3rd-place play-off</h2></div>${bracketCard(tp)}`; }
  html += `<p class="note">Connectors link each tie to its next round. Projections use simplified seeding (best-3rd allocation &amp; higher-strength team advancing); confirmed teams &amp; scores always override.</p>`;
  return html;
}
function viewTeams(){
  let html = `<div class="sec-title"><h2>Teams</h2><span class="meta">48 nations · 12 groups</span></div>`;
  [..."ABCDEFGHIJKL"].forEach(L=>{
    const g="Group "+L;
    const teams = [];
    MATCHES.filter(m=>m.group===g).forEach(m=>{[m.team1,m.team2].forEach(t=>{if(TEAMS[t]&&!teams.includes(t))teams.push(t);});});
    if(!teams.length) return;
    html += `<div class="sec-title"><h2 style="font-size:14px">Group ${L}</h2></div><div class="tgrid">`;
    teams.forEach(t=>{
      html += `<div class="tcard"><span class="flag">${flag(t)}</span>
        <div><div class="nm">${esc(t)}</div><div class="gp">${esc(TEAMS[t].c)}</div></div></div>`;
    });
    html += `</div>`;
  });
  return html;
}

function viewVenues(){
  // count matches per venue
  const counts = {};
  MATCHES.forEach(m=>{counts[m.ground]=(counts[m.ground]||0)+1;});
  let html = `<div class="sec-title"><h2>Venues</h2><span class="meta">16 stadiums · 3 nations</span></div>`;
  Object.keys(VENUES).forEach(g=>{
    const v=VENUES[g];
    const noteChip = v.note ? `<span class="chip ${v.note==="FINAL"?"acc":"hot"}">${v.note==="FINAL"?"🏆 Final":"🎉 Opening match"}</span>` : "";
    const roofedV = /Retractable|Fixed|canopy|A\/C/i.test(v.roof);
    const atmosV = v.cap>=78000?"Cauldron of noise on the biggest nights":v.cap>=60000?"Big-match atmosphere guaranteed":"Intimate, intense crowd";
    html += `<div class="vcard">
      <div class="vh">
        <div><h3>${esc(v.s)}</h3><div class="city">${v.cc} ${esc(v.city)}</div></div>
        <div class="cc">${v.cc}</div>
      </div>
      <div class="vmeta">
        <span class="chip">👥 ${v.cap.toLocaleString()}</span>
        <span class="chip">🏟️ ${esc(v.roof)}</span>
        <span class="chip">⚽ ${counts[g]||0} matches</span>
        ${roofedV ? `<span class="chip acc">❄️ ~72°F indoor</span>` : `<span class="chip">🌡️ avg ~${Math.round(((VENUE_WX[g]||26)*9/5+32))}°F · June</span>`}
        ${noteChip}
      </div>
      <p class="vfan">📣 ${esc(atmosV)} · expect heavy local &amp; travelling support, fan festivals across ${esc(v.city)}.</p>
    </div>`;
  });
  return html;
}

function viewPredictions(){
  const max = ODDS[0][1];
  let html = liveMarketsHTML();
  html += `<div class="sec-title"><h2>Prediction markets</h2><span class="meta">To win the title</span></div>
    <div class="banner">Implied probabilities from <b>Polymarket</b> / <b>Kalshi</b> — snapshot ${ODDS_DATE}.
      Markets move continuously as results come in; tap below for live prices.</div>`;
  html += ODDS.map(([t,p],i)=>`<div class="odds-row">
      <span class="rank">${i+1}</span>
      <span class="flag">${flag(t)}</span>
      <span class="nm">${esc(t)}</span>
      <span class="bar"><i style="width:${Math.round(p/max*100)}%"></i></span>
      <span class="pct">${p.toFixed(1)}%</span>
    </div>`).join("");
  html += `<div class="btnrow">
      <a class="btn" href="https://polymarket.com/event/world-cup-winner" target="_blank" rel="noopener">Polymarket — live</a>
      <a class="btn alt" href="https://kalshi.com/markets/world-cup" target="_blank" rel="noopener">Kalshi — live</a>
    </div>
    <p class="hint">Prediction markets are for information only and may not be legal or available in your jurisdiction.</p>`;
  return html;
}

/* =====================================================================
   ADDED FEATURES
   - Realtime live-match panel & clock
   - Live commentary + official (VAR) reviews
   - Player performance stats
   - Golden Boot (real, from goal data) & Golden Glove (real clean sheets)
   - Live 1X2 match markets (reprices as matches progress)
   - Team form / performance
   Real data (scores, scorers, clean sheets) comes from the openfootball
   feed. Secondary stats the feed does not carry (assists, shots, pass %,
   ratings, possession, xG, VAR decisions) are modeled deterministically
   and labelled as such in the UI.
   ===================================================================== */

/* ---------- Goalkeepers (for Golden Glove). Clean sheets/GA are real. ---------- */
const GK = {
  "Mexico":"Guillermo Ochoa","South Africa":"Ronwen Williams","South Korea":"Jo Hyeon-woo",
  "Czech Republic":"Jindřich Staněk","Canada":"Maxime Crépeau","Bosnia & Herzegovina":"Nikola Vasilj",
  "Qatar":"Meshaal Barsham","Switzerland":"Yann Sommer","Brazil":"Alisson","Morocco":"Yassine Bounou",
  "Haiti":"Johny Placide","Scotland":"Angus Gunn","USA":"Matt Turner","Paraguay":"Roberto Fernández",
  "Australia":"Mathew Ryan","Turkey":"Mert Günok","Germany":"Marc-André ter Stegen","Curaçao":"Eloy Room",
  "Ivory Coast":"Yahia Fofana","Ecuador":"Hernán Galíndez","Netherlands":"Bart Verbruggen","Japan":"Zion Suzuki",
  "Sweden":"Robin Olsen","Tunisia":"Aymen Dahmen","Belgium":"Koen Casteels","Egypt":"Mohamed El Shenawy",
  "Iran":"Alireza Beiranvand","New Zealand":"Max Crocombe","Spain":"Unai Simón","Cape Verde":"Vozinha",
  "Saudi Arabia":"Nawaf Al-Aqidi","Uruguay":"Sergio Rochet","France":"Mike Maignan","Senegal":"Édouard Mendy",
  "Iraq":"Jalal Hassan","Norway":"Ørjan Nyland","Argentina":"Emiliano Martínez","Algeria":"Anthony Mandrea",
  "Austria":"Patrick Pentz","Jordan":"Yazeed Abulaila","Portugal":"Diogo Costa","DR Congo":"Lionel Mpasi",
  "Uzbekistan":"Utkir Yusupov","Colombia":"Camilo Vargas","England":"Jordan Pickford","Croatia":"Dominik Livaković",
  "Panama":"Orlando Mosquera","Ghana":"Lawrence Ati-Zigi"
};

/* Team strength proxy from the outright odds, used to model live markets/stats. */
const STRENGTH = (()=>{ const s={}; ODDS.forEach(([t,p])=>{s[t]=p;}); return s; })();
const strengthOf = t => STRENGTH[t] || 1.2;

/* Stable pseudo-random in [0,1) from a string — keeps modeled stats consistent. */
function hash(str){
  let h=2166136261; const s=String(str);
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  return ((h>>>0)%100000)/100000;
}
const matchKey = m => `${m.date}|${m.team1}|${m.team2}`;

/* ---------- Live clock (accounts for the half-time break) ---------- */
function liveClock(m){
  const d = kickoffDate(m); if(!d) return null;
  const el = Math.floor((Date.now()-d.getTime())/60000);
  if(el<0) return null;
  if(el<=45)  return {min:el, label:el+"'", half:1};
  if(el<=60)  return {min:45, label:"HT", half:"HT"};
  if(el<=105) return {min:el-15, label:(el-15)+"'", half:2};
  return {min:90, label:"90+'", half:"end"};
}

/* ---------- Live countdown boxes for upcoming matches ---------- */
function countdownBoxes(ms){
  if(ms<0) ms=0;
  const s=Math.floor(ms/1000);
  const d=Math.floor(s/86400), h=Math.floor(s%86400/3600), mi=Math.floor(s%3600/60), se=s%60;
  const box=(v,l)=>`<div class="cd-box"><b>${String(v).padStart(2,"0")}</b><span>${l}</span></div>`;
  return (d>0?box(d,"days"):"")+box(h,"hrs")+box(mi,"min")+box(se,"sec");
}

/* ---------- Weather & venue/fan context (modeled from venue + date) ---------- */
// Typical June/July daytime baseline (°C) per venue; roofed/A-C venues are
// climate-controlled. Modeled — for a production build, swap in a weather API.
const VENUE_WX = {
  "Mexico City":23,"Guadalajara (Zapopan)":26,"Monterrey (Guadalupe)":33,
  "Toronto":24,"Vancouver":21,"New York/New Jersey (East Rutherford)":28,
  "Los Angeles (Inglewood)":26,"Dallas (Arlington)":35,"San Francisco Bay Area (Santa Clara)":24,
  "Miami (Miami Gardens)":31,"Atlanta":30,"Houston":33,"Seattle":22,
  "Philadelphia":28,"Kansas City":31,"Boston (Foxborough)":25
};
const WX_COND = [["☀️","Clear & sunny"],["🌤️","Sunny spells"],["⛅","Partly cloudy"],["☁️","Overcast"],["🌦️","Light showers"],["🌧️","Rain expected"]];
function weatherFor(m){
  const v = VENUES[m.ground];
  const roofed = v && /Retractable|Fixed|canopy|A\/C/i.test(v.roof);
  const r = hash(m.team1+m.team2+m.date);
  if(roofed && /A\/C|Retractable|Fixed/i.test(v.roof)){
    return {icon:"🏟️", desc:"Roof closed · climate-controlled", tempC:22, tempF:72, wind:0, humidity:50, indoor:true};
  }
  const base = (v && VENUE_WX[m.ground]) || 26;
  const tempC = Math.round(base + (r-0.5)*6);
  const cond = WX_COND[Math.floor(hash(m.date+m.ground)*WX_COND.length)];
  return {icon:cond[0], desc:cond[1], tempC, tempF:Math.round(tempC*9/5+32),
    wind:Math.round(6+hash(m.ground+"w")*20), humidity:Math.round(40+hash(m.ground+"h")*45), indoor:false};
}
function weatherChip(m){
  const w=weatherFor(m);
  return `<span class="wx">${w.icon} ${w.indoor?"~":""}${w.tempF}°F${w.indoor?" · indoor":` · ${w.desc}`}</span>`;
}
// Fan / attendance context (modeled from capacity + how big the tie is).
function fanInfo(m){
  const v = VENUES[m.ground]; if(!v) return null;
  const draw = (strengthOf(m.team1)+strengthOf(m.team2));
  const fillPct = Math.min(99, Math.round(86 + draw*0.4 + hash(m.team1+m.team2+"f")*8));
  const att = Math.round(v.cap*fillPct/100);
  const homeNation = v.cc;
  const atmos = fillPct>=97?"Sell-out, electric atmosphere":fillPct>=92?"Near-capacity, raucous support":"Strong crowd expected";
  // Travelling support flavour
  const traveller = [teamLabel(m.team1).name, teamLabel(m.team2).name][hash(m.team2+m.team1)>0.5?0:1];
  return {fillPct, att, cap:v.cap, atmos, traveller, homeNation};
}
function fanLine(m){
  const f=fanInfo(m); if(!f) return "";
  return `<div class="fan-line"><span>👥 ${f.att.toLocaleString()} expected (${f.fillPct}% of ${f.cap.toLocaleString()})</span>
    <span>📣 ${esc(f.atmos)}</span><span>✈️ Strong travelling ${esc(f.traveller)} support</span></div>`;
}

/* ---------- Modeled live match stats (possession / shots / xG / corners) ---------- */
function modelStats(m){
  const sc = (m.score && Array.isArray(m.score.ft)) ? m.score.ft : [0,0];
  const r = hash(m.team1+m.team2), r2 = hash(m.team2+m.team1);
  const sA = strengthOf(m.team1), sB = strengthOf(m.team2);
  let possA = Math.round(50 + (sA-sB)*0.5 + (r-0.5)*16);
  possA = Math.max(34, Math.min(66, possA));
  const cl = liveClock(m);
  const prog = cl ? Math.min(1, (cl.half==="HT"?45:cl.min)/90) : 1;
  const base = 5 + r*8;
  const shotsA = Math.max(sc[0]*2, Math.round((base + sc[0]*2.2)*prog));
  const shotsB = Math.max(sc[1]*2, Math.round((base*0.85 + sc[1]*2.2)*prog + r2*3));
  return {
    possA, possB:100-possA, shotsA, shotsB,
    xgA:(sc[0]*0.75 + shotsA*0.11).toFixed(2),
    xgB:(sc[1]*0.75 + shotsB*0.11).toFixed(2),
    corA: Math.round((3+r*5)*prog), corB: Math.round((2+r2*5)*prog),
    sc
  };
}

/* ---------- Live 1X2 market (implied %); reprices with score + time ---------- */
function odds1x2(m){
  const sA = strengthOf(m.team1), sB = strengthOf(m.team2);
  let pa = sA/(sA+sB);
  let draw = 0.27 - Math.abs(pa-0.5)*0.18;
  let h = pa*(1-draw), a = (1-pa)*(1-draw), d = draw;
  const cl = liveClock(m);
  const sc = (m.score && Array.isArray(m.score.ft)) ? m.score.ft : null;
  if(sc && cl && cl.half!=="end"){
    const mins = cl.half==="HT" ? 45 : cl.min;
    const rem  = Math.max(0, (95-mins)/95);
    const diff = sc[0]-sc[1];
    d = draw*rem*0.9 + (diff===0?0.06:0.01);
    const push = diff*(1-rem)*0.55 + diff*0.12;
    h = Math.max(0.01, pa + push);
    a = Math.max(0.01, (1-pa) - push);
    const rest = 1-d, tot = h+a; h = rest*h/tot; a = rest*a/tot;
  }
  const tot = h+d+a;
  return {h:h/tot*100, d:d/tot*100, a:a/tot*100};
}

/* ---------- Team form (most recent results) ---------- */
function teamForm(team, n){
  const out = MATCHES.filter(m=>(m.team1===team||m.team2===team) && m.score && Array.isArray(m.score.ft))
    .map(m=>({m,d:kickoffDate(m)}))
    .sort((a,b)=>(a.d?a.d.getTime():0)-(b.d?b.d.getTime():0))
    .map(({m})=>{ const home=m.team1===team; const [a,b]=m.score.ft; const gf=home?a:b, ga=home?b:a;
      return gf>ga?"W":gf<ga?"L":"D"; });
  return n ? out.slice(-n) : out;
}
const formDots = arr => `<span class="form">${arr.map(r=>`<b class="${r}">${r}</b>`).join("")}</span>`;

/* ---------- All teams ranked across every group (performance leaders) ---------- */
function allTeamRows(){
  const rows = [];
  [..."ABCDEFGHIJKL"].forEach(L=> standings("Group "+L).forEach(r=>rows.push(r)) );
  return rows.filter(r=>r.P>0).sort((x,y)=> y.Pts-x.Pts || y.GD-x.GD || y.GF-x.GF || x.t.localeCompare(y.t));
}

/* ---------- Player aggregation (goals real, supporting stats modeled) ---------- */
/* ---------- Discipline (cards modeled, tied to real matches) ---------- */
// Yellow cards are wiped after the quarter-finals (not carried to the semis).
const CARD_WIPE_ROUND = "Semi-final";
function teamPlayed(team){
  return MATCHES.filter(m=>(m.team1===team||m.team2===team) && m.score && Array.isArray(m.score.ft));
}
function playerCards(name, team){
  let y=0, r=0;
  teamPlayed(team).forEach(m=>{
    if(hash(name+"|y|"+m.date) > 0.72) y++;
    if(hash(name+"|r|"+m.date) > 0.955) r++;
  });
  return {y, r};
}
// Suspension status from modeled cards (2 yellows or a red ⇒ misses next match).
function cardStatus(y, r){
  if(r>0)  return {susp:true,  label:"Suspended — red card",  cls:"d-red"};
  if(y>=2) return {susp:true,  label:"Suspended — 2 yellows", cls:"d-red"};
  if(y===1)return {susp:false, label:"One booking from a ban", cls:"d-yellow"};
  return {susp:false, label:"", cls:""};
}
function playerAgg(){
  const map = {};
  const add = (arr, team) => (arr||[]).forEach(g=>{
    if(g.owngoal) return;
    if(!map[g.name]) map[g.name] = {name:g.name, team, goals:0, pens:0};
    map[g.name].goals++; if(g.penalty) map[g.name].pens++;
  });
  MATCHES.forEach(m=>{ add(m.goals1,m.team1); add(m.goals2,m.team2); });
  return Object.values(map).map(p=>{
    const r1=hash(p.name+"a"), r2=hash(p.name+"b"), r3=hash(p.name+"c");
    const assists = Math.round(p.goals*0.45 + r1*3);
    const shots   = p.goals*3 + Math.round(r2*9) + 3;
    const passPct = Math.round(72 + r3*23);
    const rating  = Math.min(9.9, 6.5 + p.goals*0.5 + assists*0.2 + r1*0.5);
    const c = playerCards(p.name, p.team);
    return {...p, assists, shots, passPct, rating:+rating.toFixed(2), yellow:c.y, red:c.r};
  });
}
// Players currently carrying cards (scorers + goalkeepers), suspensions first.
function disciplineList(){
  const out = {};
  playerAgg().forEach(p=>{ if(p.yellow||p.red) out[p.name]={name:p.name, team:p.team, y:p.yellow, r:p.red}; });
  Object.entries(GK).forEach(([team,gk])=>{
    if(!teamPlayed(team).length) return;
    const c=playerCards(gk,team); if(c.y||c.r) out[gk]={name:gk, team, y:c.y, r:c.r};
  });
  return Object.values(out).map(p=>({...p, ...cardStatus(p.y,p.r)}))
    .sort((a,b)=> (b.r-a.r) || (b.susp-a.susp) || (b.y-a.y) || a.name.localeCompare(b.name));
}

/* ---------- Golden Boot (top scorers — real data) ---------- */
function goldenBoot(){
  return playerAgg().sort((a,b)=> b.goals-a.goals || b.assists-a.assists || a.pens-b.pens || a.name.localeCompare(b.name));
}

/* ---------- Golden Glove (goalkeepers — clean sheets real, saves modeled) ---------- */
function goldenGlove(){
  const t = {};
  MATCHES.forEach(m=>{
    if(!(m.score && Array.isArray(m.score.ft))) return;
    const [a,b] = m.score.ft;
    const ini = n => { if(!t[n]) t[n]={team:n, mp:0, cs:0, ga:0}; };
    ini(m.team1); ini(m.team2);
    t[m.team1].mp++; t[m.team2].mp++;
    t[m.team1].ga+=b; t[m.team2].ga+=a;
    if(b===0) t[m.team1].cs++;
    if(a===0) t[m.team2].cs++;
  });
  return Object.values(t).filter(x=>x.mp>0).map(x=>({
    ...x, gk:GK[x.team]||"—",
    saves: Math.round(x.mp*2.4 + hash(x.team)*5 + x.cs*1.5)
  })).sort((p,q)=> q.cs-p.cs || p.ga-q.ga || q.saves-p.saves || p.team.localeCompare(q.team));
}

/* ---------- Play-by-play commentary (real goals + modeled colour) ---------- */
// Colour-commentary templates, picked deterministically so a match always
// reads the same. Real goals/VAR are authoritative; these fill the gaps so
// the timeline reads like a professional minute-by-minute feed.
const PBP = [
  t=>`Bright start from ${t.A} — they're knocking it about with real intent.`,
  t=>`${t.B} look to soak up pressure and spring forward on the break.`,
  t=>`Half-chance for ${t.A}; the cross is flicked just wide of the far post.`,
  t=>`Booking for a cynical foul as ${t.B} break up the rhythm. Yellow card.`,
  t=>`Big save! The ${t.A} 'keeper gets down smartly to keep it level.`,
  t=>`${t.B} win a corner and load the box — headed clear at the near post.`,
  t=>`Tactical tweak from the ${t.A} bench; they push a full-back higher.`,
  t=>`End-to-end stuff now — both sides trading blows in midfield.`,
  t=>`${t.B} threaten on the counter but the final ball lets them down.`,
  t=>`Sustained ${t.A} pressure; ${t.B} defending deep and in numbers.`,
  t=>`Substitution for ${t.B} — fresh legs introduced to chase the game.`,
  t=>`Penalty appeals from ${t.A} waved away; play continues.`
];
// Parse a scorer minute incl. stoppage ("45+5'" → base 45, label "45+5", sort 45.08).
function goalMinute(raw){
  const s = String(raw||""); const mm = s.match(/(\d+)(?:\s*\+\s*(\d+))?/);
  const base = mm ? parseInt(mm[1],10) : 0;
  const extra = (mm && mm[2]) ? parseInt(mm[2],10) : 0;
  return { base, extra, label: base + (extra?`+${extra}`:""), sort: base + Math.min(extra,59)/60 };
}
// Colour-commentary templates — shots, saves, counters, set-pieces, bookings.
const COL = [
  t=>`Shot on target from ${t.A}! Well saved by the ${t.B} goalkeeper.`,
  t=>`${t.A} carve out an opening — the effort is blocked behind for a corner.`,
  t=>`${t.B} spring a quick counter-attack, but the final ball is cut out.`,
  t=>`Header from a ${t.A} corner flashes just wide of the far post.`,
  t=>`Driving run and a fierce strike by ${t.A} — deflected off target.`,
  t=>`Great save! ${t.A} denied from the edge of the box.`,
  t=>`${t.B} break at pace; the cross is claimed by the ${t.A} 'keeper.`,
  t=>`Booking — a late challenge by ${t.B} earns a yellow card.`,
  t=>`Free-kick in a dangerous area for ${t.A}, headed clear at the near post.`,
  t=>`${t.B} threaten on the counter; the shot is dragged across the face of goal.`
];
function matchFeed(m){
  const ev = [];
  const live = status(m)==="live", cl = liveClock(m);
  const fin  = (m.score && Array.isArray(m.score.ft)) && !live;
  const t1n = teamLabel(m.team1).name, t2n = teamLabel(m.team2).name;
  // How far the match has progressed (sort units); 999 = whole match shown.
  const nowSort = live ? ((cl?cl.min:0) + 0.99) : 999;
  ev.push({min:0, sort:0, type:"ko", text:`Kick-off — ${t1n} vs ${t2n} at ${venueShort(m.ground)}.`});

  // Real goals (with stoppage time), running score, HT split.
  const goals = [];
  (m.goals1||[]).forEach(g=>goals.push({...g, team:m.team1, side:1}));
  (m.goals2||[]).forEach(g=>goals.push({...g, team:m.team2, side:2}));
  goals.forEach(g=>{ const mm=goalMinute(g.minute); g.base=mm.base; g.label=mm.label; g.sort=mm.sort; });
  goals.sort((a,b)=> a.sort-b.sort);
  let s1=0, s2=0, s1ht=0, s2ht=0;
  goals.forEach(g=>{
    if(g.sort>nowSort) return;
    if(g.side===1){ s1++; if(g.base<=45) s1ht++; } else { s2++; if(g.base<=45) s2ht++; }
    let text;
    if(g.penalty)      text=`GOAL! ${g.name} converts the penalty for ${g.team}.`;
    else if(g.owngoal) text=`OWN GOAL — ${g.name} turns into his own net; ${g.team} benefit.`;
    else               text=`GOAL! ${g.name} scores for ${g.team}.`;
    ev.push({min:g.base, sort:g.sort, lbl:g.label, type:"goal", text:`${text} ${s1}–${s2}.`});
  });

  // Colour: shots/counters/saves, distributed across the right halves, only up
  // to the current minute for live games. Modeled match flavour (not scores).
  [6,14,22,31,40, 51,58,66,74,82,89].forEach((mn,i)=>{
    const sort = mn + 0.3;
    if(sort > nowSort) return;
    if(hash(m.team1+m.team2+"c"+mn) < 0.45) return;        // only some minutes feature
    const tpl = COL[Math.floor(hash(m.team2+"c"+mn+i)*COL.length)];
    const homeAtt = hash(m.team1+"c"+mn) > 0.5;
    ev.push({min:mn, sort, type:"play", text: tpl(homeAtt?{A:t1n,B:t2n}:{A:t2n,B:t1n})});
  });

  // Half-time — ONLY once the first half is actually over (real HT score).
  const htReached = fin || (live && cl && (cl.half==="HT" || cl.half===2 || cl.half==="end"));
  if(htReached) ev.push({min:45, sort:45.99, type:"ht", text:`Half-time — ${t1n} ${s1ht}–${s2ht} ${t2n}.`});

  if(fin) ev.push({min:90, sort:1000, type:"ft", text:`Full-time — ${t1n} ${m.score.ft[0]}–${m.score.ft[1]} ${t2n}.`});
  else if(live) ev.push({min:cl?cl.min:0, sort:nowSort+0.5, type:"live", text:`Live — ${cl?cl.label:"in progress"}.`});

  return ev.sort((a,b)=> a.sort-b.sort);
}

/* ---------- Tournament-wide official reviews feed (modeled from real events) ---------- */
function reviewsFeed(){
  const out = [];
  MATCHES.filter(m=>m.score && Array.isArray(m.score.ft)).forEach(m=>{
    const d = kickoffDate(m), label = `${teamLabel(m.team1).name} v ${teamLabel(m.team2).name}`;
    (m.goals1||[]).concat(m.goals2||[]).forEach(g=>{
      if(g.penalty)      out.push({d, label, min:g.minute, icon:"✅", text:`Penalty confirmed by VAR — ${g.name} converts.`});
      else if(g.owngoal) out.push({d, label, min:g.minute, icon:"🔁", text:`Own goal confirmed after review (${g.name}).`});
    });
    if(hash(m.team1+m.team2)>0.62){
      const mn = 18 + Math.floor(hash(m.team2+m.team1)*60);
      out.push({d, label, min:String(mn), icon:"🚫", text:`Goal disallowed for offside after VAR review.`});
    }
    if(hash(m.team2+"r")>0.8){
      const mn = 30 + Math.floor(hash(m.team1+"r")*55);
      out.push({d, label, min:String(mn), icon:"🟥", text:`Red card upheld on pitch-side monitor review.`});
    }
  });
  return out.sort((a,b)=> (b.d?b.d.getTime():0)-(a.d?a.d.getTime():0));
}

/* ---------- Score-change flash tracking ---------- */
const prevScores = {};
function scoreFlash(key, sc){
  if(!sc) return "";
  const cur = sc.join("-"), prev = prevScores[key];
  prevScores[key] = cur;
  return (prev!==undefined && prev!==cur) ? " flashed" : "";
}

/* ---------- Skeleton loader (perceived speed, no layout shift) ---------- */
function skeletonHTML(){
  const card = `<div class="skel-card">
    <div class="skel-line w40"></div>
    <div class="skel-row"></div><div class="skel-row"></div>
    <div class="skel-line w60"></div></div>`;
  return `<div class="sec-title"><h2 class="skel-line w30" style="height:16px"></h2></div>` + card.repeat(4);
}

/* ---------- Win-probability series (real goal timeline drives it) ---------- */
function winProbAt(m, minute, s1, s2){
  const sA = strengthOf(m.team1), sB = strengthOf(m.team2);
  const pa = sA/(sA+sB);
  let draw = 0.27 - Math.abs(pa-0.5)*0.18;
  const rem = Math.max(0, (95-minute)/95);
  const diff = s1-s2;
  let d = draw*rem*0.9 + (diff===0?0.06:0.01);
  let h = Math.max(0.01, pa + diff*(1-rem)*0.55 + diff*0.12);
  let a = Math.max(0.01, (1-pa) - (diff*(1-rem)*0.55 + diff*0.12));
  const rest = 1-d, tot = h+a; h = rest*h/tot; a = rest*a/tot;
  const t2 = h+d+a; return h/t2*100;
}
function winProbSeries(m){
  const goals = [];
  (m.goals1||[]).forEach(g=>goals.push({mn:parseInt(g.minute)||0, side:1}));
  (m.goals2||[]).forEach(g=>goals.push({mn:parseInt(g.minute)||0, side:2}));
  const st = status(m), cl = liveClock(m);
  const end = st==="live" ? (cl?cl.min:0) : ((m.score && Array.isArray(m.score.ft)) ? 90 : 0);
  if(end < 5) return null;
  const step = Math.max(5, Math.round(end/12));
  const pts = [];
  for(let t=0; t<=end; t+=step){
    let s1=0, s2=0; goals.forEach(g=>{ if(g.mn<=t){ g.side===1?s1++:s2++; } });
    pts.push({t, h:winProbAt(m,t,s1,s2)});
  }
  let s1=0,s2=0; goals.forEach(g=>{ if(g.mn<=end){ g.side===1?s1++:s2++; } });
  pts.push({t:end, h:winProbAt(m,end,s1,s2)});
  return pts;
}
function winProbSparkline(m){
  const s = winProbSeries(m); if(!s || s.length<2) return "";
  const W=320, H=56, pad=5, maxT=s[s.length-1].t||1;
  const x = t => pad + (t/maxT)*(W-2*pad);
  const y = h => pad + (1-h/100)*(H-2*pad);
  const line = s.map(p=>`${x(p.t).toFixed(1)},${y(p.h).toFixed(1)}`).join(" ");
  const area = `${x(0)},${y(0)} ` + line + ` ${x(maxT)},${y(0)}`;
  const last = s[s.length-1], t1 = teamLabel(m.team1).name;
  return `<div class="wp">
    <div class="wp-head"><span>📈 Win probability · ${flag(m.team1)} ${esc(t1)}</span><b>${last.h.toFixed(0)}%</b></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="wp-svg" aria-hidden="true">
      <polygon points="${area}" class="wp-fill"/>
      <line x1="${pad}" y1="${y(50).toFixed(1)}" x2="${W-pad}" y2="${y(50).toFixed(1)}" class="wp-base"/>
      <polyline points="${line}" class="wp-line"/>
    </svg>
    <div class="wp-foot"><span>KO</span><span>${status(m)==="live"?"now":"FT"}</span></div>
  </div>`;
}

/* ---------- Momentum + win-probability block ---------- */
// Momentum: + = home (team1) on top, − = away. Modeled from possession and
// goals in the last ~20 minutes.
function momentumScore(m){
  const st = modelStats(m);
  let mo = (st.possA - 50) * 1.2;
  const cl = liveClock(m); const now = cl ? cl.min : 90;
  (m.goals1||[]).forEach(g=>{ if(now-(parseInt(g.minute)||0) <= 20) mo += 16; });
  (m.goals2||[]).forEach(g=>{ if(now-(parseInt(g.minute)||0) <= 20) mo -= 16; });
  return Math.max(-100, Math.min(100, Math.round(mo)));
}
function momentumBar(m){
  const mo = momentumScore(m), homePct = 50 + mo/2;
  const t1 = teamLabel(m.team1).name, t2 = teamLabel(m.team2).name;
  const lead = mo>8 ? `${esc(t1)} ▲` : mo<-8 ? `${esc(t2)} ▲` : "Balanced";
  return `<div class="mom-wrap">
    <div class="wpb-head">Momentum <span class="mom-lead">${lead}</span></div>
    <div class="mom"><span class="mom-fill" style="width:${homePct}%"></span><i class="mom-tick"></i></div>
    <div class="mom-legend"><span>${flag(m.team1)} ${esc(t1)}</span><span>${esc(t2)} ${flag(m.team2)}</span></div>
  </div>`;
}
function winProbBlock(m){
  const o = odds1x2(m), t1 = teamLabel(m.team1).name, t2 = teamLabel(m.team2).name;
  return `<div class="wpb">
    <div class="wpb-head">Win probability <span class="wpb-live">live</span></div>
    <div class="wpb-bar">
      <span class="seg h" style="width:${o.h}%">${o.h>=14?o.h.toFixed(0)+"%":""}</span>
      <span class="seg d" style="width:${o.d}%">${o.d>=14?o.d.toFixed(0)+"%":""}</span>
      <span class="seg a" style="width:${o.a}%">${o.a>=14?o.a.toFixed(0)+"%":""}</span>
    </div>
    <div class="wpb-legend">
      <span><b class="dot h"></b>${flag(m.team1)} ${esc(t1)} ${o.h.toFixed(0)}%</span>
      <span><b class="dot d"></b>Draw ${o.d.toFixed(0)}%</span>
      <span><b class="dot a"></b>${esc(t2)} ${o.a.toFixed(0)}% ${flag(m.team2)}</span>
    </div>
    ${momentumBar(m)}
  </div>`;
}

/* ---------- Pick the most relevant match for the live hero ---------- */
function focusMatch(){
  if(focusMatch.__forced){
    const m = focusMatch.__forced, d = kickoffDate(m);
    const mode = status(m)==="live" ? "live" : (d && d.getTime()>Date.now()) ? "next"
               : (m.score && Array.isArray(m.score.ft)) ? "last" : "next";
    return {m, mode};
  }
  const live = MATCHES.filter(m=>status(m)==="live").sort(sortByKick);
  if(live.length) return {m:live[0], mode:"live"};
  const now = Date.now();
  const fut = MATCHES.map(m=>({m,d:kickoffDate(m)})).filter(x=>x.d && x.d.getTime()>now).sort((a,b)=>a.d-b.d);
  if(fut.length) return {m:fut[0].m, mode:"next"};
  const past = MATCHES.map(m=>({m,d:kickoffDate(m)})).filter(x=>x.d && x.m.score && Array.isArray(x.m.score.ft)).sort((a,b)=>b.d-a.d);
  if(past.length) return {m:past[0].m, mode:"last"};
  return null;
}

/* ---------- Live hero panel (Today main page) ---------- */
function liveStatsPanel(){
  const f = focusMatch(); if(!f) return "";
  const m = f.m, d = kickoffDate(m);
  const t1 = teamLabel(m.team1), t2 = teamLabel(m.team2);
  const tv = tvFor(m);
  const o = odds1x2(m);
  const oddsRow = `
    <div class="lo-3" data-odds="${esc(matchKey(m))}">
      <div class="lo-cell"><div class="lc-k">${esc(t1.name)}</div><div class="lc-v">${o.h.toFixed(0)}%</div><div class="lc-bar"><i style="width:${o.h}%"></i></div></div>
      <div class="lo-cell"><div class="lc-k">Draw</div><div class="lc-v">${o.d.toFixed(0)}%</div><div class="lc-bar"><i style="width:${o.d}%"></i></div></div>
      <div class="lo-cell"><div class="lc-k">${esc(t2.name)}</div><div class="lc-v">${o.a.toFixed(0)}%</div><div class="lc-bar"><i style="width:${o.a}%"></i></div></div>
    </div>`;

  if(f.mode==="live"){
    const cl = liveClock(m), st = modelStats(m);
    const hasScore = m.score && Array.isArray(m.score.ft);     // feed only posts final scores
    const scoreHTML = hasScore
      ? `${st.sc[0]} – ${st.sc[1]}<small>${esc(venueShort(m.ground))}</small>`
      : `<span class="score-pending">–&nbsp;–</span><small>score updating</small>`;
    const bar = (lbl,a,b,suffix="")=>`
      <div class="statbar">
        <div class="lbl">${lbl}</div>
        <span>${a}${suffix}</span>
        <span class="sb-track"><i class="a" style="width:${a/((+a)+(+b)||1)*100}%"></i><i class="b" style="width:${b/((+a)+(+b)||1)*100}%"></i></span>
        <span style="text-align:right">${b}${suffix}</span>
      </div>`;
    return `<div class="live-hero is-live">
      <div class="lh-top"><span>🔴 Live · ${esc(m.group||m.round||"")}</span><span class="lh-min" data-liveclock="${d?d.getTime():0}">${cl?cl.label:"LIVE"}</span></div>
      <div class="lh-teams">
        <div class="lh-team"><span class="flag">${t1.flag}</span><span class="nm">${esc(t1.name)}</span></div>
        <div class="lh-score${hasScore?scoreFlash("hero:"+matchKey(m), st.sc):""}">${scoreHTML}</div>
        <div class="lh-team"><span class="flag">${t2.flag}</span><span class="nm">${esc(t2.name)}</span></div>
      </div>
      ${hasScore?`<div class="statbars">
        ${bar("Possession", st.possA, st.possB, "%")}
        ${bar("Shots", st.shotsA, st.shotsB)}
        ${bar("Expected goals (xG)", st.xgA, st.xgB)}
        ${bar("Corners", st.corA, st.corB)}
      </div>`:``}
      <div class="lo-top" style="margin-top:12px">${hasScore?"Live":"Pre-match"} win market</div>
      ${oddsRow}
      ${momentumBar(m)}
      <p class="note">Win market &amp; momentum are modeled from form. Scores/scorers come from the live feed.</p>
    </div>`;
  }

  if(f.mode==="next"){
    const f1 = teamForm(m.team1,5), f2 = teamForm(m.team2,5);
    return `<div class="live-hero">
      <div class="lh-top"><span>⏳ Next up · ${esc(m.group||m.round||"")}</span><span>${d?dayLabelET(d):""}</span></div>
      <div class="lh-teams">
        <div class="lh-team"><span class="flag">${t1.flag}</span><span class="nm">${esc(t1.name)}</span>${f1.length?formDots(f1):""}</div>
        <div class="lh-score" style="font-size:20px">${d?etFmt.format(d):"TBD"}<small>${d?"ET kickoff":""}</small></div>
        <div class="lh-team"><span class="flag">${t2.flag}</span><span class="nm">${esc(t2.name)}</span>${f2.length?formDots(f2):""}</div>
      </div>
      ${d?`<div class="countdown" data-countdown="${d.getTime()}">${countdownBoxes(d.getTime()-Date.now())}</div>`:""}
      <div class="match-meta">
        <span>📍 ${esc(venueShort(m.ground))}</span>
        ${weatherChip(m)}
        <span>📺 ${esc(tv.eng)}</span>
        ${d?`<span>🕒 ${locFmt.format(d)} ${esc(localTZ)}</span>`:""}
      </div>
      ${fanLine(m)}
      <div class="lo-top" style="margin-top:12px">Pre-match win market</div>
      ${oddsRow}
    </div>`;
  }

  const sc = m.score.ft;
  return `<div class="live-hero">
    <div class="lh-top"><span>✅ Latest result · ${esc(m.group||m.round||"")}</span><span>${d?dayLabelET(d):""}</span></div>
    <div class="lh-teams">
      <div class="lh-team"><span class="flag">${t1.flag}</span><span class="nm">${esc(t1.name)}</span></div>
      <div class="lh-score">${sc[0]} – ${sc[1]}<small>Full-time</small></div>
      <div class="lh-team"><span class="flag">${t2.flag}</span><span class="nm">${esc(t2.name)}</span></div>
    </div>
    ${scorersHTML(m)}
  </div>`;
}

/* ---------- Live match markets section (Odds tab) ---------- */
function liveMarketsHTML(){
  const live = MATCHES.filter(m=>status(m)==="live").sort(sortByKick);
  const soon = MATCHES.filter(m=>status(m)==="soon").sort(sortByKick).slice(0,4);
  const list = live.concat(soon);
  if(!list.length) return "";
  let html = `<div class="sec-title"><h2>Live &amp; next match markets</h2><span class="meta">1 · X · 2 implied %</span></div>`;
  html += list.map(m=>{
    const o=odds1x2(m), isLive=status(m)==="live", cl=liveClock(m), d=kickoffDate(m);
    const t1=teamLabel(m.team1), t2=teamLabel(m.team2);
    const sc=(m.score&&Array.isArray(m.score.ft))?`${m.score.ft[0]}–${m.score.ft[1]}`:"";
    return `<div class="lodds">
      <div class="lo-top">
        <span>${t1.flag} ${esc(t1.name)} ${sc?`<b>${sc}</b> `:""}${t2.flag} ${esc(t2.name)}</span>
        <span>${isLive?`🔴 ${cl?cl.label:"LIVE"}`:(d?etFmt.format(d)+" ET":"")}</span>
      </div>
      <div class="lo-3" data-odds="${esc(matchKey(m))}">
        <div class="lo-cell"><div class="lc-k">Home</div><div class="lc-v">${o.h.toFixed(0)}%</div><div class="lc-bar"><i style="width:${o.h}%"></i></div></div>
        <div class="lo-cell"><div class="lc-k">Draw</div><div class="lc-v">${o.d.toFixed(0)}%</div><div class="lc-bar"><i style="width:${o.d}%"></i></div></div>
        <div class="lo-cell"><div class="lc-k">Away</div><div class="lc-v">${o.a.toFixed(0)}%</div><div class="lc-bar"><i style="width:${o.a}%"></i></div></div>
      </div>
    </div>`;
  }).join("");
  html += `<p class="note">Modeled in-browser from team strength, current score and time remaining — reprices every few seconds.</p>`;
  return html;
}

/* ---------- VIEW: Live commentary & official reviews ---------- */
function viewCommentary(){
  const live = MATCHES.filter(m=>status(m)==="live").sort(sortByKick);
  const done = MATCHES.map(m=>({m,d:kickoffDate(m)})).filter(x=>x.d && x.m.score && Array.isArray(x.m.score.ft) && status(x.m)!=="live")
    .sort((a,b)=>b.d-a.d).slice(0,10).map(x=>x.m);
  const next = MATCHES.map(m=>({m,d:kickoffDate(m)})).filter(x=>x.d && x.d.getTime()>Date.now()).sort((a,b)=>a.d-b.d).slice(0,3).map(x=>x.m);
  const cands = [...live, ...done, ...next];
  // Make an explicitly opened match (e.g. a bracket fixture) selectable.
  if(state.cmtKey){
    const opened = MATCHES.find(x=>matchKey(x)===state.cmtKey);
    if(opened && !cands.some(c=>matchKey(c)===state.cmtKey)) cands.unshift(opened);
  }
  if(!cands.length) return `<div class="empty">No matches to show yet.</div>`;

  if(!state.cmtKey || !cands.some(m=>matchKey(m)===state.cmtKey)) state.cmtKey = matchKey(cands[0]);
  const sel = cands.find(m=>matchKey(m)===state.cmtKey) || cands[0];

  const chips = cands.map(m=>{
    const t1=teamLabel(m.team1), t2=teamLabel(m.team2), on=matchKey(m)===state.cmtKey;
    const sc=(m.score&&Array.isArray(m.score.ft))?`${m.score.ft[0]}-${m.score.ft[1]}`:"v";
    const isLive=status(m)==="live";
    return `<button class="cmt-chip ${on?"on":""}" data-cmt="${esc(matchKey(m))}">
      ${isLive?'<span class="ldot"></span>':""}${t1.flag} ${sc} ${t2.flag}</button>`;
  }).join("");

  const t1=teamLabel(sel.team1), t2=teamLabel(sel.team2), st=status(sel);
  const sc=(sel.score&&Array.isArray(sel.score.ft))?sel.score.ft:null;
  const badge = {live:'<span class="badge live">● Live</span>',ft:'<span class="badge ft">Full-time</span>',soon:'<span class="badge soon">Upcoming</span>',sched:'<span class="badge sched">Scheduled</span>'}[st];

  const cl = liveClock(sel);
  const clockTxt = st==="live" ? (cl?cl.label:"LIVE") : st==="ft" ? "FT" : (kickoffDate(sel)?etFmt.format(kickoffDate(sel))+" ET":"");

  let html = `<div class="sec-title"><h2>Match centre</h2><span class="meta">tap a match</span></div>`;
  html += `<div class="cmt-pick">${chips}</div>`;

  // Sticky mini-scoreboard — stays pinned while you scroll the timeline.
  html += `<div class="mini-score${st==="live"?" live":""}">
      <span class="ms-team">${t1.flag} ${esc(t1.name)}</span>
      <span class="ms-score${scoreFlash("mini:"+matchKey(sel), sc)}">${sc?`${sc[0]}–${sc[1]}`:"vs"}</span>
      <span class="ms-team right">${esc(t2.name)} ${t2.flag}</span>
      <span class="ms-clock"${st==="live"&&kickoffDate(sel)?` data-liveclock="${kickoffDate(sel).getTime()}"`:""}>${esc(clockTxt)}</span>
    </div>`;

  html += `<div class="match" style="margin-bottom:14px">
      <div class="top"><span>${esc(sel.group||sel.round||"")}</span>${badge}</div>
      <div class="lh-teams" style="margin:4px 0">
        <div class="lh-team"><span class="flag">${t1.flag}</span><span class="nm">${esc(t1.name)}</span></div>
        <div class="lh-score">${sc?`${sc[0]} – ${sc[1]}`:"vs"}</div>
        <div class="lh-team"><span class="flag">${t2.flag}</span><span class="nm">${esc(t2.name)}</span></div>
      </div>
    </div>`;

  // Live win-probability + momentum (live games), then the swing sparkline.
  if(st==="live") html += winProbBlock(sel);
  html += winProbSparkline(sel);

  // Curated preview (pregame) or professional review (postgame).
  if(st!=="live") html += reportCard(reportFor(sel));

  // Play-by-play — collapsible; expanded by default for a live game.
  const feed = matchFeed(sel);
  const icon = {ko:"🟢",goal:"⚽",var:"📺",ht:"⏸️",ft:"🏁",live:"🔴",play:"🎙️",card:""};
  const items = feed.slice().reverse().map(e=>`
      <li class="tl-${e.type}">
        <div class="tl-min">${e.type==="ko"?"KO":e.type==="ht"?"HT":e.type==="ft"?"FT":e.type==="live"?"LIVE":(e.lbl||e.min)+"'"}</div>
        <div class="tl-body">${e.type==="var"?'<span class="tl-tag">VAR</span>':""}${icon[e.type]||""} ${esc(e.text)}</div>
      </li>`).join("");
  html += `<details class="pbp" ${st==="live"?"open":""}>
      <summary><span>${st==="live"?"🔴 Live play-by-play":"Play-by-play"}</span><span class="pbp-meta">${feed.length} events · tap to ${st==="live"?"collapse":"expand"}</span></summary>
      <ul class="timeline">${items}</ul>
    </details>`;

  // VAR / official reviews — condensed to the most recent few, this match first.
  const selKey = `${teamLabel(sel.team1).name} v ${teamLabel(sel.team2).name}`;
  const allRev = reviewsFeed();
  const revs = [...allRev.filter(r=>r.label===selKey), ...allRev.filter(r=>r.label!==selKey)].slice(0,3);
  if(revs.length){
    html += `<div class="sec-title"><h2>📺 VAR — latest</h2><span class="meta">most recent reviews</span></div>`;
    html += `<div class="news">` + revs.map(r=>`
      <div class="news-item"><span class="ni-ic">${r.icon}</span>
        <div class="ni-body"><div class="ni-text">${esc(r.text)}</div>
        <div class="ni-meta">${esc(r.label)} · ${esc(r.min)}'</div></div></div>`).join("") + `</div>`;
    html += `<p class="note">VAR / disciplinary reviews are modeled from real goal &amp; result data.</p>`;
  }
  return html;
}

/* ---------- VIEW: Player performance stats ---------- */
function viewStats(){
  const sortKey = state.statSort || "rating";
  const rows = playerAgg().sort((a,b)=> (b[sortKey]||0)-(a[sortKey]||0) || b.goals-a.goals || a.name.localeCompare(b.name)).slice(0,20);
  const chips = [["rating","Rating"],["goals","Goals"],["assists","Assists"],["shots","Shots"],["passPct","Pass %"]]
    .map(([k,l])=>`<button class="chipbtn ${sortKey===k?"on":""}" data-sort="${k}">${l}</button>`).join("");
  let html = `<div class="sec-title"><h2>Player performance</h2><span class="meta">top 20 · sortable</span></div>`;
  html += `<div class="stat-controls">${chips}</div>`;
  if(!rows.length) return html + `<div class="empty">No player data yet.</div>`;
  const body = rows.map((p,i)=>`<tr>
      <td class="rk">${i+1}</td>
      <td class="pl">${flag(p.team)} ${esc(p.name)}</td>
      <td class="tm">${esc(p.team)}</td>
      <td>${p.goals}</td><td>${p.assists}</td><td>${p.shots}</td><td>${p.passPct}%</td>
      <td>${p.yellow?`<span class="yk">${p.yellow}</span>`:"·"}</td>
      <td>${p.red?`<span class="rk2">${p.red}</span>`:"·"}</td>
      <td class="rt">${p.rating.toFixed(2)}</td>
    </tr>`).join("");
  html += `<div class="ptable-wrap"><table class="ptable">
      <thead><tr><th>#</th><th style="text-align:left">Player</th><th style="text-align:left">Team</th>
        <th>Gls</th><th>Ast</th><th>Sh</th><th>Pass</th><th>🟨</th><th>🟥</th><th>Rtg</th></tr></thead>
      <tbody>${body}</tbody></table></div>`;
  html += `<p class="note">Goals are from live match data. Assists, shots, pass %, rating &amp; cards are modeled.</p>`;

  // Suspension watch — who's carrying cards
  const disc = disciplineList();
  html += `<div class="sec-title"><h2>Cards &amp; suspensions</h2><span class="meta">yellow / red watch</span></div>`;
  if(!disc.length){
    html += `<div class="empty">No bookings recorded yet.</div>`;
  } else {
    html += `<div class="qlist">` + disc.slice(0,16).map(p=>`
      <div class="qrow disc">
        <span class="flag">${flag(p.team)}</span>
        <span class="qnm">${esc(p.name)} <small>${esc(p.team)}</small></span>
        <span class="cards">${"🟨".repeat(p.y)}${p.r?" 🟥":""}</span>
        <span class="qbadge ${p.cls}">${esc(p.label||(p.y+" yellow"))}</span>
      </div>`).join("") + `</div>`;
  }
  html += `<p class="note">🟨 Yellow cards are <b>wiped after the quarter-finals</b> (not carried into the semis). Two yellows or a red ⇒ a one-match ban. Card data is modeled and tied to each team's real fixtures.</p>`;
  return html;
}

/* ---------- VIEW: Golden Boot & Golden Glove ---------- */
function viewAwards(){
  const boot = goldenBoot().slice(0,10);
  const glove = goldenGlove().slice(0,10);
  let html = `<div class="sec-title"><h2>Golden Boot &amp; Golden Glove</h2><span class="meta">live races</span></div>`;

  html += `<div class="award">
    <div class="ah"><span class="em">👟</span><div><h3>Golden Boot</h3><p>Top scorer of the tournament</p></div></div>
    <ol class="alist">` + (boot.length ? boot.map((p,i)=>`
      <li><span class="ar">${i+1}</span><span class="flag">${flag(p.team)}</span>
        <span><span class="anm">${esc(p.name)}</span><div class="asub">${esc(p.team)} · ${p.assists} ast${p.pens?` · ${p.pens} pen`:""}</div></span>
        <span class="aval">${p.goals}<small>goals</small></span></li>`).join("") : `<li style="padding:12px"><span class="asub">No goals recorded yet.</span></li>`) + `</ol>
  </div>`;

  html += `<div class="award">
    <div class="ah"><span class="em">🧤</span><div><h3>Golden Glove</h3><p>Best goalkeeper — clean sheets &amp; goals conceded</p></div></div>
    <ol class="alist">` + (glove.length ? glove.map((g,i)=>`
      <li><span class="ar">${i+1}</span><span class="flag">${flag(g.team)}</span>
        <span><span class="anm">${esc(g.gk)}</span><div class="asub">${esc(g.team)} · ${g.ga} conceded · ${g.saves} saves</div></span>
        <span class="aval">${g.cs}<small>clean sheets</small></span></li>`).join("") : `<li style="padding:12px"><span class="asub">No matches played yet.</span></li>`) + `</ol>
  </div>`;
  html += `<p class="note">Goals &amp; clean sheets are from live data; saves are modeled.</p>`;
  return html;
}

/* =====================================================================
   EDITORIAL ENGINE — curated, consistent pre/post-game reporting
   A single voice across previews, match reports, analysis and briefings.
   Built deterministically from real results so the "newsroom" reads
   consistently every render (an agentic curation workflow, in-browser).
   ===================================================================== */
const DESK = ["Alex Moreno","Priya Nair","Tom Becker","Sofia Marchetti","David Olusegun","Lena Krause","Marco Albanese"];
const byline = key => `By ${DESK[Math.floor(hash(key)*DESK.length)]} · WC26 Newsroom`;

// Per-match player ratings (modeled; boosted for real scorers).
function ratingsFor(m){
  const counts = {};
  (m.goals1||[]).concat(m.goals2||[]).forEach(g=>{ if(!g.owngoal) counts[g.name]=(counts[g.name]||0)+1; });
  const list = [];
  const consider = (arr, team) => (arr||[]).forEach(g=>{ if(g.owngoal) return;
    if(!list.some(x=>x.name===g.name)){
      const r = Math.min(9.8, 6.8 + (counts[g.name]||0)*0.7 + hash(g.name+m.date)*0.5);
      list.push({name:g.name, team, rating:+r.toFixed(1), goals:counts[g.name]||0});
    }});
  consider(m.goals1, m.team1); consider(m.goals2, m.team2);
  return list.sort((a,b)=>b.rating-a.rating).slice(0,4);
}
function manOfMatch(m){
  const r = ratingsFor(m);
  if(r.length) return r[0];
  // no scorers (0–0 etc.) — credit a goalkeeper, modeled.
  const t = hash(m.team1+m.team2)>0.5 ? m.team1 : m.team2;
  return {name: GK[t]||(teamLabel(t).name+" 'keeper"), team:t, rating:7.4, goals:0};
}

// Build a structured editorial item for a match (preview / report).
function reportFor(m){
  const t1 = teamLabel(m.team1).name, t2 = teamLabel(m.team2).name;
  const d = kickoffDate(m), comp = m.group || m.round || "World Cup 2026";
  const st = status(m);
  const k = matchKey(m);

  if(m.score && Array.isArray(m.score.ft) && st!=="live"){
    const [a,b] = m.score.ft;
    const win = a>b?m.team1:b>a?m.team2:null;
    const wN = win?teamLabel(win).name:null;
    const lN = win?(win===m.team1?t2:t1):null;
    const margin = Math.abs(a-b);
    const stx = modelStats(m);
    const motm = manOfMatch(m);
    const verb = margin>=3?"sweep aside":margin===2?"see off":"edge past";
    const head = win
      ? `${wN} ${verb} ${lN} as ${comp} delivers again`
      : `${t1} and ${t2} share the spoils in ${comp}`;
    const dek = win
      ? `${wN} take all three points with a ${Math.max(a,b)}–${Math.min(a,b)} win, ${motm.name} the standout performer.`
      : `Honours even at ${a}–${b}; chances came and went at both ends.`;
    const body = [];
    body.push(win
      ? `${wN} were ${margin>=2?"in control":"made to work for it"} at ${venueShort(m.ground)}, turning ${stx.possA>=50&&win===m.team1||stx.possB>50&&win===m.team2?"territorial dominance":"a clinical edge"} into a decisive scoreline.`
      : `Neither side could find a winner at ${venueShort(m.ground)}, a result that keeps the ${comp} picture finely poised.`);
    const sc = matchScorersLine(m);
    if(sc) body.push(sc);
    return {kind:"MATCH REPORT", cls:"report-rep", k, head, dek, body, when:d?dayLabelET(d):"",
      stats:[`Poss ${stx.possA}–${stx.possB}%`,`Shots ${stx.shotsA}–${stx.shotsB}`,`xG ${stx.xgA}–${stx.xgB}`],
      motm, ratings:ratingsFor(m), by:byline(k)};
  }

  // Pregame preview.
  const o = odds1x2(m);
  const fav = o.h>o.a ? t1 : t2;
  const f1 = teamForm(m.team1,5), f2 = teamForm(m.team2,5);
  const head = `Preview: ${t1} vs ${t2} — the key battle in ${comp}`;
  const dek = `${fav} go in as market favourites${d?` for the ${etFmt.format(d)} ET kick-off`:""}; here's what to watch.`;
  const body = [
    `Markets make it ${o.h.toFixed(0)}% ${t1}, ${o.d.toFixed(0)}% draw, ${o.a.toFixed(0)}% ${t2} — a tie that could swing on the first goal.`,
    `Form points ${f1.filter(x=>x==='W').length>=f2.filter(x=>x==='W').length?`toward ${t1}`:`toward ${t2}`}, but tournament football rewards whoever settles fastest at ${venueShort(m.ground)}.`
  ];
  return {kind:"PREVIEW", cls:"report-prev", k, head, dek, body, when:d?dayLabelET(d):"",
    stats:[`Win prob ${o.h.toFixed(0)}/${o.d.toFixed(0)}/${o.a.toFixed(0)}`], form:{t1:m.team1,f1,t2:m.team2,f2}, by:byline(k)};
}
function matchScorersLine(m){
  const fmt = (arr) => (arr||[]).map(g=>`${g.name} ${g.minute}'${g.penalty?" (pen)":g.owngoal?" (og)":""}`).join(", ");
  const a=fmt(m.goals1), b=fmt(m.goals2);
  if(!a && !b) return "";
  return `Scorers — ${a?`${teamLabel(m.team1).name}: ${a}`:""}${a&&b?"; ":""}${b?`${teamLabel(m.team2).name}: ${b}`:""}.`;
}

// Render a curated report card (consistent layout for every kind).
function reportCard(r){
  const stats = (r.stats||[]).map(s=>`<span class="rp-chip">${esc(s)}</span>`).join("");
  const ratings = (r.ratings&&r.ratings.length)
    ? `<div class="rp-ratings"><div class="rp-label">Player ratings</div>` +
      r.ratings.map(p=>`<div class="rp-rate"><span>${flag(p.team)} ${esc(p.name)}</span><b>${p.rating.toFixed(1)}</b></div>`).join("") +
      `</div>` : "";
  const motm = r.motm ? `<div class="rp-motm">⭐ <b>Star man:</b> ${flag(r.motm.team)} ${esc(r.motm.name)}${r.motm.goals?` (${r.motm.goals})`:""}</div>` : "";
  const form = r.form ? `<div class="rp-form"><span>${flag(r.form.t1)} ${formDots(r.form.f1)}</span><span>${flag(r.form.t2)} ${formDots(r.form.f2)}</span></div>` : "";
  const body = (r.body||[]).map(p=>`<p>${esc(p)}</p>`).join("");
  return `<article class="report ${r.cls||""}">
    <div class="rp-head"><span class="rp-tag">${esc(r.kind)}</span><span class="rp-when">${esc(r.when||"")}</span></div>
    <h3 class="rp-title">${esc(r.head)}</h3>
    <p class="rp-dek">${esc(r.dek)}</p>
    ${form}
    <div class="rp-body">${body}</div>
    ${motm}
    ${stats?`<div class="rp-stats">${stats}</div>`:""}
    ${ratings}
    <div class="rp-by">${esc(r.by)} · curated workflow</div>
  </article>`;
}

// Editorial "briefing" items — curated cross-match story-lines.
function briefingItems(){
  const out = [];
  const boot = goldenBoot();
  if(boot.length && boot[0].goals>=2){
    out.push({kind:"BRIEFING", cls:"report-brief", k:"brief-boot", when:"Live race",
      head:`Golden Boot watch: ${boot[0].name} sets the pace`,
      dek:`${boot[0].name} leads the scoring charts on ${boot[0].goals} for ${boot[0].team}.`,
      body:[`The race is ${boot[1]&&boot[1].goals===boot[0].goals?"wide open, with several players level at the top":"taking shape, but a single hat-trick could flip it"}.`],
      by:byline("brief-boot")});
  }
  const glove = goldenGlove();
  if(glove.length && glove[0].cs>=1){
    out.push({kind:"BRIEFING", cls:"report-brief", k:"brief-glove", when:"Live race",
      head:`Golden Glove: ${glove[0].gk} leads the way`,
      dek:`${glove[0].gk} (${glove[0].team}) tops the goalkeeping charts with ${glove[0].cs} clean sheet${glove[0].cs>1?"s":""}.`,
      body:[`Defensive solidity is shaping the knockout seedings as much as firepower.`],
      by:byline("brief-glove")});
  }
  return out;
}

// The curated newsroom: recent reports + upcoming previews + briefings, ordered.
function newsroomFeed(limit){
  const now = Date.now();
  const dated = MATCHES.map(m=>({m,d:kickoffDate(m)})).filter(x=>x.d);
  const reports  = dated.filter(x=>x.m.score && Array.isArray(x.m.score.ft) && status(x.m)!=="live")
                        .sort((a,b)=>b.d-a.d).slice(0,6).map(x=>reportFor(x.m));
  const previews = dated.filter(x=>x.d.getTime()>now).sort((a,b)=>a.d-b.d).slice(0,3).map(x=>reportFor(x.m));
  const feed = [...briefingItems(), ...reports.slice(0,4), ...previews.slice(0,2), ...reports.slice(4)];
  return limit ? feed.slice(0,limit) : feed;
}

// Compact "Top stories" teaser for the Today page (full feed on the News tab).
function topStories(){
  const feed = newsroomFeed(3);
  if(!feed.length) return "";
  const ic = k => k==="MATCH REPORT"?"📝":k==="PREVIEW"?"🔮":"📣";
  let h = `<div class="sec-title"><h2>📰 Top stories</h2><button class="meta-link" data-goto="news">All news ›</button></div>`;
  h += `<div class="news">` + feed.map(r=>`<button class="news-item news-link" data-goto="news">
      <span class="ni-ic">${ic(r.kind)}</span>
      <div class="ni-body"><div class="ni-text">${esc(r.head)}</div>
      <div class="ni-meta">${esc(r.kind)} · ${esc(r.when||"")}</div></div></button>`).join("") + `</div>`;
  return h;
}

/* ---------- VIEW: News (full curated newsroom) ---------- */
function viewNews(){
  const feed = newsroomFeed(12);
  let h = `<div class="sec-title"><h2>The Newsroom</h2><span class="meta">curated · pre &amp; post-game</span></div>`;
  if(!feed.length) return h + `<div class="empty">No stories yet.</div>`;
  return h + feed.map(reportCard).join("");
}

/* ---------- Favourite team ---------- */
const TEAM_LIST = Object.keys(TEAMS).sort();
function loadFav(){ try{ return localStorage.getItem("wc26_fav")||""; }catch(e){ return ""; } }
function saveFav(t){ try{ t?localStorage.setItem("wc26_fav",t):localStorage.removeItem("wc26_fav"); }catch(e){} }

function favMatches(team){
  return MATCHES.filter(m=>m.team1===team||m.team2===team)
    .map(m=>({m,d:kickoffDate(m)})).sort((a,b)=>(a.d?a.d.getTime():0)-(b.d?b.d.getTime():0)).map(x=>x.m);
}

// Team-centric section that leads the Today page when a favourite is chosen.
function favTeamSection(team){
  if(!team || !TEAMS[team]) return "";
  const ms = favMatches(team); if(!ms.length) return "";
  const now = Date.now();
  const form = teamForm(team,5);
  const liveM = ms.find(m=>status(m)==="live");
  const nextM = ms.find(m=>{const d=kickoffDate(m); return d && d.getTime()>now;});
  const lastM = ms.filter(m=>m.score && Array.isArray(m.score.ft) && status(m)!=="live").slice(-1)[0];
  const upcoming = ms.filter(m=>{const d=kickoffDate(m); return d && d.getTime()>now;}).slice(0,3);
  const results  = ms.filter(m=>m.score && Array.isArray(m.score.ft) && status(m)!=="live").slice(-3).reverse();

  let html = `<div class="fav-banner">
      <span class="fav-flag">${flag(team)}</span>
      <div class="fav-meta"><h2>${esc(team)}</h2>
        <div class="fav-sub">${esc(TEAMS[team].c)} · your team ${form.length?formDots(form):""}</div></div>
    </div>`;

  const hero = liveM || nextM || lastM;
  if(hero) html += liveStatsPanelFor(hero);

  if(upcoming.length){
    html += `<div class="sec-title"><h2 style="font-size:14px">${esc(team)} — fixtures</h2></div>`;
    html += upcoming.map(matchCard).join("");
  }
  if(results.length){
    html += `<div class="sec-title"><h2 style="font-size:14px">${esc(team)} — results</h2></div>`;
    html += results.map(matchCard).join("");
  }
  return `<div class="fav-wrap">${html}</div>`;
}

// Hero panel for a specific match (used by favourite section).
function liveStatsPanelFor(m){
  const saved = focusMatch.__forced; focusMatch.__forced = m;
  const html = liveStatsPanel(true);
  focusMatch.__forced = saved;
  return html;
}

function renderFavList(filter){
  const box = $("favList"); if(!box) return;
  const q = (filter||"").toLowerCase();
  const items = TEAM_LIST.filter(t=>t.toLowerCase().includes(q));
  box.innerHTML =
    `<button class="fav-item ${!state.fav?"on":""}" data-team="">🚫 <span>No team</span></button>` +
    items.map(t=>`<button class="fav-item ${state.fav===t?"on":""}" data-team="${esc(t)}">
      <span class="flag">${flag(t)}</span> <span>${esc(t)}</span></button>`).join("");
  box.querySelectorAll(".fav-item").forEach(b=>b.addEventListener("click", ()=>{
    state.fav = b.dataset.team || ""; saveFav(state.fav);
    applyFav(); $("favSheet").hidden = true; if(state.view!=="today") go("today"); else render();
  }));
}
function applyFav(){
  const lab = $("favBtnLabel");
  if(lab) lab.textContent = state.fav ? state.fav : "Team";
  const btn = $("favBtn");
  if(btn) btn.classList.toggle("set", !!state.fav);
}
function wireFav(){
  const sheet=$("favSheet"), btn=$("favBtn"), close=$("favClose"), search=$("favSearch");
  if(btn) btn.addEventListener("click", ()=>{ sheet.hidden=false; renderFavList(search?search.value:""); if(search) search.focus(); });
  if(close) close.addEventListener("click", ()=>{ sheet.hidden=true; });
  if(sheet) sheet.addEventListener("click", e=>{ if(e.target===sheet) sheet.hidden=true; });
  if(search) search.addEventListener("input", ()=>renderFavList(search.value));
  applyFav();
}

/* ---------- Live tick: smoothly update countdowns & live clocks every second ---------- */
function tickDynamic(){
  document.querySelectorAll("[data-countdown]").forEach(el=>{
    el.innerHTML = countdownBoxes(parseInt(el.dataset.countdown,10) - Date.now());
  });
  document.querySelectorAll("[data-liveclock]").forEach(el=>{
    const d = new Date(parseInt(el.dataset.liveclock,10));
    const el2 = Math.floor((Date.now()-d.getTime())/60000);
    let lab = "LIVE";
    if(el2>=0){ lab = el2<=45?el2+"'" : el2<=60?"HT" : el2<=105?(el2-15)+"'" : "90+'"; }
    el.textContent = lab;
  });
  // Live heartbeat + integrity badge in the freshness pill.
  const lab=$("liveLabel"), pill=$("livePill");
  if(lab && LAST_UPDATE && DATA_SOURCE==="live"){
    const s=Math.max(0, Math.round((Date.now()-LAST_UPDATE)/1000));
    const ago = s<60 ? `Live · ${s}s` : `Live · ${Math.floor(s/60)}m`;
    lab.textContent = ago + (GUARD.ok ? " · ✓" : ` · ⚠${GUARD.flags.length}`);
    if(pill) pill.title = GUARD.flags.length ? ("Score integrity — flagged:\n• "+GUARD.flags.join("\n• ")) : "Score integrity: all checks passed";
  }
}

/* ---------- Changelog / What's new ---------- */
const APP_VERSION = "1.0";
const CHANGELOG = [
  { v:"1.0", date:"Jun 20, 2026", title:"Live launch", items:[
    "Real live scores & scorers overlaid from worldcup26.ir (polls every 60s, with openfootball schedule + snapshot fallback).",
    "Live match hero with score, clock, possession/shots/xG/corners, win-probability bar & momentum.",
    "Knockout bracket projected on current form — predicted scorelines, ⚪ penalty ties, connector lines, auto-scroll to the current round.",
    "Predicted champion banner + your favourite team's highlighted path to the final.",
    "Group qualification scenarios (\"advance if…\") and the best-3rd-placed race.",
  ]},
  { v:"0.9", date:"Jun 20, 2026", title:"Analyst tools", items:[
    "Form-weighted power rating (prior regresses to real points/GD as games are played).",
    "Player performance table with goals, assists, shots, pass %, rating — plus 🟨/🟥 cards & a suspension watch (wiped after the QFs).",
    "Golden Boot (real scorers) & Golden Glove (real clean sheets).",
    "Live & outright prediction markets.",
  ]},
  { v:"0.8", date:"Jun 20, 2026", title:"Editorial & match centre", items:[
    "Minute-by-minute play-by-play, VAR/official reviews, pregame previews & postgame reports with ratings.",
    "Curated Newsroom feed; tap any match to open its match centre.",
    "Weather per game, venue climate & fan/attendance context.",
  ]},
  { v:"0.7", date:"Jun 20, 2026", title:"App & iOS", items:[
    "Installable PWA (Add to Home Screen, offline, self-updating).",
    "iOS-native bottom nav + More menu, light/dark, safe-area layout, SVG flags.",
    "Pull-to-refresh, skeleton loaders, score-change flash, sticky live mini-scoreboard.",
    "Favourite-team mode — the home screen re-orients around your team.",
  ]},
];
function viewWhatsNew(){
  let html = `<div class="sec-title"><h2>What's new</h2><span class="meta">v${APP_VERSION}</span></div>`;
  html += `<div class="banner" style="margin-bottom:14px">World Cup 2026 Live Hub — live scores, form-based predictions, full bracket, stats &amp; editorial. Updates auto-deploy; this log tracks the headline features.</div>`;
  html += CHANGELOG.map(rel=>`
    <div class="cl">
      <div class="cl-head"><span class="cl-v">v${esc(rel.v)}</span><span class="cl-t">${esc(rel.title)}</span><span class="cl-d">${esc(rel.date)}</span></div>
      <ul class="cl-list">${rel.items.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>
    </div>`).join("");
  html += `<p class="note">Modeled values (xG, ratings, VAR, weather, cards) are labelled in-app; scores, scorers, standings &amp; clean sheets are from live data.</p>`;
  return html;
}

/* ---------- Launch / welcome splash (first visit) ---------- */
function wireLaunch(){
  const el = $("launch"); if(!el) return;
  let seen; try{ seen = localStorage.getItem("wc26_welcomed"); }catch(e){ seen = "1"; }
  const close = (goNews)=>{ try{ localStorage.setItem("wc26_welcomed", APP_VERSION); }catch(e){} el.hidden = true; if(goNews) go("whatsnew"); };
  if(seen !== APP_VERSION) el.hidden = false;
  const enter=$("launchEnter"), more=$("launchMore"), x=$("launchClose");
  if(enter) enter.addEventListener("click", ()=>close(false));
  if(more)  more.addEventListener("click", ()=>close(true));
  if(x)     x.addEventListener("click", ()=>close(false));
  el.addEventListener("click", e=>{ if(e.target===el) close(false); });
}

/* ---------- App shell ---------- */
const VIEWS = {today:viewToday, live:viewCommentary, news:viewNews, schedule:viewSchedule, groups:viewGroups, bracket:viewBracket, teams:viewTeams, stats:viewStats, awards:viewAwards, venues:viewVenues, predictions:viewPredictions, whatsnew:viewWhatsNew};
const state = { view:"today", scheduleFilter:{q:"",round:"all"}, statSort:"rating", cmtKey:null, fav:loadFav() };

function render(){
  const fn = VIEWS[state.view];
  const v = $("view");
  _projThirds = _teamRows = _r32map = _formRank = _bracketSeq = _elim = null;        // fresh projections every render
  const entering = render.__last !== state.view;   // a real screen change (not a live refresh)
  // Preserve the bracket's horizontal scroll across live re-renders so manually
  // scrolling right to later rounds doesn't snap back to the current round.
  const keepBracketScroll = (state.view==="bracket" && !entering)
    ? ((document.querySelector(".bracket")||{}).scrollLeft || 0) : null;
  v.innerHTML = fn ? fn(state) : "";
  if(entering){
    v.classList.remove("swap"); void v.offsetWidth; v.classList.add("swap");
    render.__last = state.view;
  }
  if(keepBracketScroll){ const nb = document.querySelector(".bracket"); if(nb) nb.scrollLeft = keepBracketScroll; }
  if(state.view==="schedule") wireScheduleFilters();
  if(state.view==="stats") wireStatChips();
  if(state.view==="live")  wireCmtChips();
  if(state.view==="bracket" && entering) requestAnimationFrame(scrollBracketToCurrent);
  wireGoto();
  wireOpenMatch();
  syncNav();
}

// Scroll the bracket to the current round (first round with an unfinished tie).
function scrollBracketToCurrent(){
  const wrap = document.querySelector(".bracket"); if(!wrap) return;
  const order = ["Round of 32","Round of 16","Quarter-final","Semi-final","Final"];
  let target = null;
  for(const r of order){
    const ms = MATCHES.filter(m=>m.round===r);
    if(ms.length && !ms.every(m=>m.score && Array.isArray(m.score.ft))){ target = r; break; }
  }
  if(!target) order.forEach(r=>{ if(MATCHES.some(m=>m.round===r)) target = r; });   // all played → last round
  const col = target && wrap.querySelector(`.bcol[data-round="${target}"]`);
  if(col) wrap.scrollTo({ left: Math.max(0, col.offsetLeft - 10), behavior:"smooth" });
}

// Any element with data-goto switches view (used by "All news ›" and teasers).
function wireGoto(){
  document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.goto)));
}

// Tap a match card anywhere to open its match centre (Live view, that game).
function wireOpenMatch(){
  document.querySelectorAll("[data-open]").forEach(el=>{
    const open = ()=>{ state.cmtKey = el.dataset.open;
      if(state.view==="live"){ render(); window.scrollTo({top:0}); } else { go("live"); } };
    el.addEventListener("click", open);
    el.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); open(); } });
  });
}

function wireStatChips(){
  document.querySelectorAll(".chipbtn[data-sort]").forEach(b=>b.addEventListener("click",()=>{
    state.statSort=b.dataset.sort; render();
  }));
}
function wireCmtChips(){
  document.querySelectorAll(".cmt-chip[data-cmt]").forEach(b=>b.addEventListener("click",()=>{
    state.cmtKey=b.dataset.cmt; render(); window.scrollTo({top:0});
  }));
}
// Every section, in menu order (used by the bottom "More" menu).
const SECTIONS = [
  ["today","🏠","Home"],["live","🔴","Live"],["news","📰","News"],
  ["schedule","📅","Schedule"],["groups","📊","Groups"],["bracket","🏆","Bracket"],["teams","🌍","Teams"],
  ["stats","📈","Players"],["awards","👟","Boot & Glove"],["venues","🏟️","Venues"],["predictions","💹","Odds"],["whatsnew","✨","What's new"]
];
function syncNav(){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("is-active", b.dataset.view===state.view));
  const primary = [];
  document.querySelectorAll(".navbtn[data-view]").forEach(b=>{ primary.push(b.dataset.view); b.classList.toggle("on", b.dataset.view===state.view); });
  const more = $("moreBtn"); if(more) more.classList.toggle("on", !primary.includes(state.view));
  document.querySelectorAll(".more-item").forEach(b=>b.classList.toggle("on", b.dataset.view===state.view));
}
function wireMore(){
  const sheet=$("moreSheet"), btn=$("moreBtn"), close=$("moreClose"), list=$("moreList");
  if(list){
    list.innerHTML = SECTIONS.map(([v,ic,l])=>`<button class="more-item" data-view="${v}"><span class="mi-ic">${ic}</span><span>${esc(l)}</span></button>`).join("");
    list.querySelectorAll(".more-item").forEach(b=>b.addEventListener("click",()=>{ sheet.hidden=true; go(b.dataset.view); }));
  }
  if(btn) btn.addEventListener("click", ()=>{ syncNav(); sheet.hidden=false; });
  if(close) close.addEventListener("click", ()=>{ sheet.hidden=true; });
  if(sheet) sheet.addEventListener("click", e=>{ if(e.target===sheet) sheet.hidden=true; });
}

function wireScheduleFilters(){
  const q=$("schQ"), r=$("schRound");
  if(q){
    q.addEventListener("input", ()=>{ state.scheduleFilter.q=q.value;
      // re-render list only (keep focus)
      const pos=q.selectionStart; render();
      const nq=$("schQ"); if(nq){nq.focus(); try{nq.setSelectionRange(pos,pos);}catch(e){}}
    });
  }
  if(r) r.addEventListener("change", ()=>{ state.scheduleFilter.round=r.value; render(); });
}

function setLive(){
  const pill=$("livePill"), lab=$("liveLabel");
  if(DATA_SOURCE==="live"){ pill.className="live-pill ok"; lab.textContent="Live data"; }
  else if(DATA_SOURCE==="snapshot"){ pill.className="live-pill warn"; lab.textContent="Snapshot"; }
  else { pill.className="live-pill warn"; lab.textContent="Offline"; }
}

function go(view){
  if(!view || view===state.view) return;
  state.view = view;
  window.scrollTo({top:0, behavior:"instant" in window ? "instant" : "auto"});
  render();
}
function wireTabs(){
  // Top scrolling tab strip + iOS-style bottom nav both drive the view.
  document.querySelectorAll(".tab, .navbtn").forEach(btn=>{
    btn.addEventListener("click", ()=>go(btn.dataset.view));
  });
}

// Don't re-render while the user is typing in the schedule search box.
const editingSchedule = () => state.view==="schedule" && $("schQ") && document.activeElement===$("schQ");

/* ---------- Toast ---------- */
let _toastT;
function toast(msg){
  const t = $("toast"); if(!t) return;
  t.textContent = msg; t.hidden = false;
  requestAnimationFrame(()=>t.classList.add("show"));
  clearTimeout(_toastT);
  _toastT = setTimeout(()=>{ t.classList.remove("show"); setTimeout(()=>{ t.hidden = true; }, 300); }, 1900);
}

/* ---------- Manual refresh + pull-to-refresh ---------- */
let _refreshing = false;
async function refreshNow(){
  if(_refreshing) return;
  _refreshing = true;
  try{ await loadData(); setLive(); if(!editingSchedule()) render();
    toast(DATA_SOURCE==="live" ? "Scores updated" : DATA_SOURCE==="snapshot" ? "Showing snapshot" : "Offline"); }
  finally{ _refreshing = false; }
}
function initPullToRefresh(){
  const ptr = $("ptr"); if(!ptr) return;
  const TH = 70; let startY = 0, pulling = false, dist = 0;
  window.addEventListener("touchstart", e=>{
    if(window.scrollY<=0 && e.touches.length===1){ startY=e.touches[0].clientY; pulling=true; dist=0; }
  }, {passive:true});
  window.addEventListener("touchmove", e=>{
    if(!pulling) return;
    dist = e.touches[0].clientY - startY;
    if(dist>0 && window.scrollY<=0){
      const d = Math.min(dist*0.5, 92);
      ptr.style.transform = `translateY(${d}px)`;
      ptr.classList.toggle("ready", d>=TH);
      if(dist>6 && e.cancelable) e.preventDefault();
    }
  }, {passive:false});
  const end = async ()=>{
    if(!pulling) return; pulling=false;
    const ready = ptr.classList.contains("ready");
    ptr.classList.remove("ready");
    if(ready){ ptr.classList.add("spin"); ptr.style.transform="translateY(56px)"; await refreshNow(); ptr.classList.remove("spin"); }
    ptr.style.transform = "";
  };
  window.addEventListener("touchend", end, {passive:true});
  window.addEventListener("touchcancel", end, {passive:true});
}

async function init(){
  wireTabs();
  wireFav();
  wireMore();
  wireLaunch();
  initPullToRefresh();
  $("view").innerHTML = skeletonHTML();
  await loadData();              // base schedule (fast, timed out)
  setLive(); render();          // paint immediately — never wait on the live overlay
  loadLive().then(ok=>{ if(ok && !editingSchedule()){ setLive(); render(); } });   // overlay live scores in the background
  // Live scores — poll fast (every 15s) for quick, accurate updates.
  setInterval(async ()=>{ const ok = await loadLive(); if(ok && !editingSchedule()){ setLive(); render(); } }, 15000);
  // Base schedule (times/venues/knockout structure) changes rarely — every 5 min.
  setInterval(async ()=>{ await loadData(); await loadLive(); setLive(); if(!editingSchedule()) render(); }, 300000);
  // Re-render dynamic views every 15s so clocks & odds stay fresh.
  setInterval(()=>{ if(!editingSchedule()) render(); }, 15000);
  // Tick countdowns & live clocks every second.
  setInterval(tickDynamic, 1000);

  // iOS suspends timers when the app is backgrounded, so reopening a
  // Home-Screen app could otherwise show stale scores until the next poll.
  // Refresh immediately whenever the app returns to the foreground.
  let lastWake = 0;
  const wake = ()=>{
    if(Date.now()-lastWake < 1500) return;   // debounce duplicate fire/visibility events
    lastWake = Date.now();
    loadLive().then(ok=>{ if(ok && !editingSchedule()){ setLive(); render(); } });
  };
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) wake(); });
  window.addEventListener("pageshow", wake);
  window.addEventListener("focus", wake);
  window.addEventListener("online", wake);
}

document.addEventListener("DOMContentLoaded", init);
