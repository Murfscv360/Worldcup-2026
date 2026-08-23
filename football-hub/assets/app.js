/* Football Hub — Premier League + Championship + Champions League
   2026-27 league fixtures/results: openfootball (public domain), fetched live in-browser
   with a same-origin-safe fallback chain (JSON feed -> parsed .txt source -> bundled
   snapshot). Club meta, transfers, news and title odds are hand-curated, dated
   snapshots — see data/*.json headers and docs/FOOTBALL-HUB.md. */
'use strict';

/* ---------- Competitions ---------- */

const COMPS = {
  epl: {
    key: "epl", label: "Premier League",
    remoteJson: "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/en.1.json",
    remoteTxt:  "https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premierleague.txt",
    localFixtures: "data/epl-2026-27.json",
    localArchive:  "data/epl-2025-26.json",
    localMeta:     "data/epl.json"
  },
  championship: {
    key: "championship", label: "Championship",
    remoteJson: "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/en.2.json",
    remoteTxt:  "https://raw.githubusercontent.com/openfootball/england/master/2026-27/2-championship.txt",
    localFixtures: "data/championship-2026-27.json",
    localArchive:  "data/championship-2025-26.json",
    localMeta:     "data/championship.json"
  }
};

// This season's real, confirmed opening date per competition (used only as a
// last-resort season-state fallback if the fixture list somehow fails to load).
const SEASON_OPENER = { epl: "2026-08-21", championship: "2026-08-14" };

const DATA = {};          // DATA[compKey] = {meta, matches, leagueMatches, table, archive, dataSource, currentClubs}
let EPL = null, CHA = null, UCL = null, NEWS = null, TRANSFERS = null, PLAYERS = null;
let CLUB_BY_FULL = {};    // "Arsenal FC" -> club meta (comp-agnostic, covers any club in either feed)
let CLUB_BY_SHORT = {};   // "Arsenal" -> club meta (this season's 44 clubs, comp-correct)

function fetchT(url, ms){
  let ctrl, timer;
  try{ ctrl = new AbortController(); timer = setTimeout(()=>ctrl.abort(), ms||8000); }catch(e){ ctrl = null; }
  return fetch(url, {cache:"no-store", signal:ctrl?ctrl.signal:undefined}).finally(()=>{ if(timer) clearTimeout(timer); });
}
async function getJSON(url, ms){ const r = await fetchT(url, ms); if(!r.ok) throw new Error(String(r.status)); return r.json(); }
async function getText(url, ms){ const r = await fetchT(url, ms); if(!r.ok) throw new Error(String(r.status)); return r.text(); }

/* Parses the openfootball "football.txt" source format directly, so the app can
   read the current season's real fixtures/results even before openfootball's
   JSON generator has republished them (it historically lags the source repo). */
function parseFootballTxt(text){
  const MONTHS = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
  const dayRe = /^\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Za-z]{3})\s+(\d{1,2})(?:\s+(\d{4}))?\s*$/;
  const roundRe = /^\s*▪\s*(.+?)\s*$/;
  const matchRe = /^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)(?:\s{2,}(\d+)-(\d+)\s*(?:\((\d+)-(\d+)\))?)?\s*$/;
  let round = null, date = null, time = null, year = null;
  const matches = [];
  text.split("\n").forEach(raw=>{
    const line = raw.replace(/\r$/, "");
    if(!line.trim() || line.startsWith("=") || line.startsWith("#")) return;
    let m = roundRe.exec(line);
    if(m){ round = m[1]; time = null; return; }
    m = dayRe.exec(line);
    if(m){
      if(m[3]) year = parseInt(m[3], 10);
      date = `${year}-${String(MONTHS[m[1]]).padStart(2,"0")}-${String(parseInt(m[2],10)).padStart(2,"0")}`;
      time = null; return;
    }
    if(line.indexOf(" v ") === -1) return;
    m = matchRe.exec(line);
    if(!m || !round || !date) return;
    if(m[1]) time = m[1];
    const team1 = m[2].replace(/\s{2,}/g, " ").trim();
    const team2 = m[3].replace(/\s{2,}/g, " ").trim();
    const entry = { round, date, team1, team2 };
    if(time) entry.time = time;
    if(m[4] !== undefined){
      entry.score = { ft: [parseInt(m[4],10), parseInt(m[5],10)] };
      if(m[6] !== undefined) entry.score.ht = [parseInt(m[6],10), parseInt(m[7],10)];
    }
    matches.push(entry);
  });
  return matches;
}

function computeTable(matches, roster){
  const teams = {};
  const row = t => teams[t] || (teams[t] = {name:t, p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0});
  if(roster) roster.forEach(row);
  matches.forEach(x=>{
    const sc = x.score; const ft = sc && (Array.isArray(sc) ? sc : sc.ft);
    if(!ft) return;
    const [hg, ag] = ft;
    const rh = row(x.team1), ra = row(x.team2);
    rh.p++; ra.p++; rh.gf+=hg; rh.ga+=ag; ra.gf+=ag; ra.ga+=hg;
    if(hg>ag){ rh.w++; rh.pts+=3; ra.l++; }
    else if(hg<ag){ ra.w++; ra.pts+=3; rh.l++; }
    else { rh.d++; ra.d++; rh.pts++; ra.pts++; }
  });
  const tbl = Object.values(teams).map(r=>({...r, gd:r.gf-r.ga}));
  tbl.sort((a,b)=> b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);
  tbl.forEach((r,i)=> r.pos = i+1);
  return tbl;
}

async function loadCompetition(comp, meta, roster){
  const archiveFile = await getJSON(comp.localArchive);
  let matches, dataSource;
  try{
    const d = await getJSON(comp.remoteJson, 6000);
    matches = d.matches; dataSource = "Live results (2026-27 JSON feed)";
  }catch(e1){
    try{
      const text = await getText(comp.remoteTxt, 6000);
      matches = parseFootballTxt(text);
      if(!matches.length) throw new Error("empty");
      dataSource = matches.some(m=>m.score) ? "Live results (2026-27)" : "2026-27 fixtures (live network, season not started)";
    }catch(e2){
      try{
        const d = await getJSON(comp.localFixtures, 6000);
        matches = d.matches; dataSource = "2026-27 fixtures (offline snapshot)";
      }catch(e3){
        matches = []; dataSource = "Unavailable";
      }
    }
  }
  const leagueMatches = matches.filter(m=> m.round !== "Playoffs");
  const table = computeTable(leagueMatches, roster);
  return { meta, matches, leagueMatches, table, archive: archiveFile.matches, dataSource };
}

/* Champions League source — same public-domain openfootball project, same
   football.txt format the domestic parser above already reads, published at
   openfootball/champions-league once each season's fixtures exist. Verified
   by hand (raw.githubusercontent.com) that 2025-26/cl.txt is live in that
   exact format; 2026-27/cl.txt doesn't exist yet as of this build — the
   league-phase draw is 27 Aug 2026, Matchday 1 is 8-10 Sep — so this
   fetches the real URL and simply shows "not published yet" until
   openfootball adds the file after the draw. No separate maintenance step
   needed once that happens; the next page load just picks it up. */
const UCL_TXT_URL = "https://raw.githubusercontent.com/openfootball/champions-league/master/2026-27/cl.txt";
const UCL_ENGLISH_CLUBS = ["Arsenal FC", "Manchester City FC", "Manchester United FC", "Aston Villa FC", "Liverpool FC"];

// The CL source tags every club with its FA's 3-letter code, e.g. "Arsenal FC (ENG)" —
// domestic full names (used everywhere else for crest/club lookups) don't carry that suffix.
// Extra-time/penalty knockout scores ("3-2 a.e.t. (3-0, 1-0)") don't fit the shared
// match-line regex's plain score group, so they end up glued onto team2 instead — stripped
// here first so a name is never shown with leftover score text or a trailing country code.
function stripCountryCode(name){
  return name.replace(/\s+\d+-\d+.*$/, "").replace(/\s*\([A-Z]{2,4}\)\s*$/, "").trim();
}
// Round headers read "League, Matchday 3" — trim the redundant "League, " prefix for display;
// later knockout-stage headers (Round of 16, etc.) have no such prefix and pass through untouched.
function normalizeUclRound(round){ return round.replace(/^League,\s*/, ""); }

async function loadUclMatches(){
  try{
    const text = await getText(UCL_TXT_URL, 6000);
    const raw = parseFootballTxt(text);
    if(!raw.length) throw new Error("empty");
    const matches = raw.map(m=> Object.assign({}, m, {
      team1: stripCountryCode(m.team1), team2: stripCountryCode(m.team2), round: normalizeUclRound(m.round)
    }));
    const leaguePhase = matches.filter(m=> /^Matchday \d+$/.test(m.round));
    const table = computeTable(leaguePhase);
    const englishMatches = matches.filter(m=> UCL_ENGLISH_CLUBS.includes(m.team1) || UCL_ENGLISH_CLUBS.includes(m.team2));
    const dataSource = matches.some(m=>m.score) ? "Live results (2026-27, openfootball)" : "2026-27 fixtures (live network, league phase not started)";
    return { matches, englishMatches, table, dataSource };
  }catch(e){
    return { matches:[], englishMatches:[], table:[], dataSource:"Not published yet — league-phase draw is 27 Aug 2026, Matchday 1 is 8-10 Sep" };
  }
}

async function loadData(){
  [NEWS, TRANSFERS, UCL, PLAYERS] = await Promise.all([getJSON("data/news.json"), getJSON("data/transfers.json"), getJSON("data/ucl.json"), getJSON("data/players.json")]);
  [EPL, CHA] = await Promise.all([getJSON(COMPS.epl.localMeta), getJSON(COMPS.championship.localMeta)]);

  CLUB_BY_FULL = {};
  EPL.clubs.forEach(c => CLUB_BY_FULL[c.full] = c);
  EPL.promoted2627.forEach(c => CLUB_BY_FULL[c.full] = c);
  CHA.clubs.forEach(c => CLUB_BY_FULL[c.full] = c);

  const eplRoster = EPL.clubs.filter(c=>!c.relegated).concat(EPL.promoted2627).map(c=>c.full);
  const chaRoster = CHA.clubs.concat(EPL.clubs.filter(c=>c.relegated)).map(c=>c.full);

  const [eplData, chaData] = await Promise.all([
    loadCompetition(COMPS.epl, EPL, eplRoster),
    loadCompetition(COMPS.championship, CHA, chaRoster)
  ]);
  DATA.epl = eplData; DATA.championship = chaData;

  DATA.epl.currentClubs = EPL.clubs.filter(c=>!c.relegated).concat(EPL.promoted2627).map(c=>({...c, comp:"epl"}));
  DATA.championship.currentClubs = CHA.clubs.concat(EPL.clubs.filter(c=>c.relegated)).map(c=>({...c, comp:"championship"}));

  CLUB_BY_SHORT = {};
  DATA.epl.currentClubs.concat(DATA.championship.currentClubs).forEach(c=> CLUB_BY_SHORT[c.name] = c);

  // Fired only once DATA.epl/DATA.championship/CLUB_BY_SHORT are all set above, so a
  // re-render they trigger can never race viewToday()/myTeamCard() reading undefined data.
  loadUclMatches().then(d=>{ DATA.ucl = d; if(state.view==="live" || state.view==="ucl") render(); });
  loadLiveNews().then(items=>{ DATA.liveNews = items; if(state.view==="news" || state.view==="today" || state.view==="myteams") render(); });
}

function seasonState(){
  if(DATA.epl.matches.some(m=>m.score)) return "in-season";
  return new Date() < new Date(SEASON_OPENER.epl + "T00:00:00Z") ? "preseason" : "in-season";
}

/* ---------- Club helpers ---------- */

function code3(full){
  const c = CLUB_BY_FULL[full];
  const short = (c && c.name) || full.replace(/ FC$| AFC$/,"").replace(/^AFC /,"");
  const words = short.replace(/&/g,"").split(/\s+/).filter(Boolean);
  if(words.length===1) return words[0].slice(0,3).toUpperCase();
  return words.map(w=>w[0]).join("").slice(0,3).toUpperCase();
}
function clubName(full){ return (CLUB_BY_FULL[full] && CLUB_BY_FULL[full].name) || full; }
function clubColor(full){ return (CLUB_BY_FULL[full] && CLUB_BY_FULL[full].color) || "#8c5cff"; }
function crest(full, size){
  size = size || 30;
  const bg = clubColor(full);
  const dark = /^#f/i.test(bg) || bg.toUpperCase()==="#FFFFFF";
  const fg = dark ? "#0a0713" : "#fff";
  return `<span class="crest" style="width:${size}px;height:${size}px;line-height:${size}px;font-size:${Math.round(size*0.34)}px;background:${bg};color:${fg}">${code3(full)}</span>`;
}
function clubMeta(nameKey){ return CLUB_BY_SHORT[nameKey]; } // this season's meta, comp-correct
function compLabel(comp){ return comp==="epl" ? "Premier League" : comp==="ucl" ? "Champions League" : "Championship"; }

/* ---------- Small formatters ---------- */

function fmtDate(iso, opts){
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", Object.assign({month:"short", day:"numeric", year:"numeric", timeZone:"UTC"}, opts||{}));
}
function daysUntil(iso){
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const target = new Date(iso + "T00:00:00Z");
  return Math.max(0, Math.round((target-today)/86400000));
}
function ftOf(m){ const sc = m.score; return sc ? (Array.isArray(sc)?sc:sc.ft) : null; }

/* ---------- Timezones: kickoff times in the fixture data are UK local
   (Europe/London). Convert to a real UTC instant via the Intl API so BST/GMT
   is handled correctly (no fixed-offset assumption), then format for US
   Central time (Chicago) — the abbreviation (CDT/CST) follows automatically. */

function zonedWallClockToUTC(dateStr, timeStr, timeZone){
  const guess = new Date(`${dateStr}T${timeStr}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12:false,
    year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit"
  });
  const p = fmt.formatToParts(guess).reduce((a,x)=>{ if(x.type!=="literal") a[x.type]=x.value; return a; }, {});
  const shown = new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
  return new Date(guess.getTime() + (guess.getTime() - shown.getTime()));
}
function kickoffInstant(dateStr, timeStr){ return zonedWallClockToUTC(dateStr, timeStr, "Europe/London"); }
function fmtCentral(dateStr, timeStr){
  return new Intl.DateTimeFormat("en-US", {
    timeZone:"America/Chicago", hour:"numeric", minute:"2-digit", hour12:true, timeZoneName:"short"
  }).format(kickoffInstant(dateStr, timeStr));
}
function tvNote(comp){
  if(comp==="epl") return "📺 Peacock · marquee matches also on NBC/USA Network (US)";
  if(comp==="ucl") return "📺 TNT Sports (UK) · Paramount+, marquee matches also on CBS (US)";
  return "📺 Paramount+ · marquee matches also on CBS Sports Network (US)";
}

/* ---------- Live radio (real UK broadcasters — see docs/FOOTBALL-HUB.md §6 for sourcing) ---------- */

// Region reality, verified: as of July 2025 the BBC restricted BBC Sounds
// (and with it Radio 5 Live's stream) to UK IP addresses, and talkSPORT's
// own site stream is UK-licensed too — which is exactly why talkSPORT
// partnered with TuneIn to sell a *legitimate* US/Canada/Mexico product
// (TuneIn Premium) rather than that audience just using the UK stream.
// This app links to the real UK stream (useful for UK-based followers or
// anyone actually in the UK) and separately, clearly, to the real paid
// product that's actually licensed for US listeners — it does not suggest
// or facilitate VPNs/proxies to route around either broadcaster's
// territorial rights, which their terms of service prohibit.
const RADIO = {
  talksport: { name: "talkSPORT", url: "https://talksport.com", region: "UK only" },
  bbc5live:  { name: "BBC Radio 5 Live", url: "https://www.bbc.co.uk/5live", region: "UK only" },
  tunein:    { name: "talkSPORT via TuneIn Premium", url: "https://tunein.com/radio/talkSPORT-1089-s17077/", region: "US/Canada/Mexico — paid subscription" }
};
// talkSPORT is the Premier League's official UK radio partner and (per its
// published coverage pattern) carries live commentary of every Friday- and
// Monday-night match, plus Saturday 12:30 and Saturday 15:00 kickoffs. We
// only assert talkSPORT coverage for matches that fit that documented
// pattern — everything else just gets the general listen-live options,
// not a specific (unverifiable) per-match claim.
function talkSportLikely(m){
  if(!m.time) return false;
  const dow = new Date(m.date + "T00:00:00Z").getUTCDay(); // 0=Sun ... 5=Fri, 6=Sat, 1=Mon
  if(dow===5 || dow===1) return true;
  return dow===6 && (m.time==="12:30" || m.time==="15:00");
}
function radioBlock(comp, m){
  if(comp==="ucl"){
    return `<div class="match-meta"><span>📻 Champions League commentary is typically via <a href="https://talksport.com" target="_blank" rel="noopener">talkSPORT</a> or <a href="https://www.bbc.co.uk/5live" target="_blank" rel="noopener">BBC Radio 5 Live</a> (UK only) or the match broadcaster's own commentary (region varies)</span></div>`;
  }
  if(comp!=="epl"){
    return `<div class="match-meta"><span>📻 EFL Championship coverage is typically via your club's local <a href="https://www.bbc.co.uk/sounds" target="_blank" rel="noopener">BBC radio station</a> (UK only) or the club's own official commentary (often subscription-based, region varies)</span></div>`;
  }
  const links = [];
  if(talkSportLikely(m)){
    links.push(`<a href="${RADIO.talksport.url}" target="_blank" rel="noopener">📻 ${RADIO.talksport.name}</a> <small>(${RADIO.talksport.region})</small>`);
  }
  links.push(`<a href="${RADIO.bbc5live.url}" target="_blank" rel="noopener">📻 ${RADIO.bbc5live.name}</a> <small>(${RADIO.bbc5live.region})</small>`);
  links.push(`<a href="${RADIO.tunein.url}" target="_blank" rel="noopener">🎧 ${RADIO.tunein.name}</a> <small>(${RADIO.tunein.region})</small>`);
  return `<div class="match-meta">${links.map(l=>`<span>${l}</span>`).join("")}</div>
    <p class="note">UK streams require a UK connection (broadcaster-enforced since Jul 2025) — outside the UK, TuneIn Premium is the legitimate licensed option. This app doesn't link VPN/proxy services to route around that.</p>`;
}

/* ---------- Real-time countdown (ticks every second) ---------- */

function countdownTargetMs(dateStr, timeStr){
  return timeStr ? kickoffInstant(dateStr, timeStr).getTime() : new Date(dateStr + "T00:00:00Z").getTime();
}
function countdownBoxes(targetMs){
  return `<div class="countdown" data-countdown="${targetMs}">
    <div class="cd-box"><b class="cd-d">–</b><span>Days</span></div>
    <div class="cd-box"><b class="cd-h">–</b><span>Hours</span></div>
    <div class="cd-box"><b class="cd-m">–</b><span>Min</span></div>
    <div class="cd-box"><b class="cd-s">–</b><span>Sec</span></div>
  </div>`;
}
function tickCountdowns(){
  document.querySelectorAll("[data-countdown]").forEach(el=>{
    const target = parseInt(el.dataset.countdown, 10);
    let diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff/86400000); diff -= d*86400000;
    const h = Math.floor(diff/3600000); diff -= h*3600000;
    const m = Math.floor(diff/60000); diff -= m*60000;
    const s = Math.floor(diff/1000);
    el.querySelector(".cd-d").textContent = d;
    el.querySelector(".cd-h").textContent = String(h).padStart(2,"0");
    el.querySelector(".cd-m").textContent = String(m).padStart(2,"0");
    el.querySelector(".cd-s").textContent = String(s).padStart(2,"0");
  });
}

/* ---------- Match status + professional commentary (generated from real
   table/form data only — no fabricated stats, no play-by-play we don't have) ---------- */

const MATCH_ENVELOPE_MS = 115 * 60000; // kickoff -> full-time incl. stoppage + break, for the simulated clock only
function matchStatus(m){
  if(m.score) return { state:"ft" };
  if(!m.time) return { state:"upcoming" };
  const kickoff = kickoffInstant(m.date, m.time).getTime();
  const now = Date.now();
  if(now < kickoff) return { state:"upcoming", kickoff };
  if(now < kickoff + MATCH_ENVELOPE_MS) return { state:"live", kickoff, clock: liveClockText(now-kickoff) };
  return { state:"pending", kickoff };
}
function liveClockText(elapsedMs){
  const mins = Math.floor(elapsedMs/60000);
  if(mins < 45) return `${mins}'`;
  if(mins < 60) return "HT";
  const second = mins - 15;
  return second <= 90 ? `${second}'` : "90+'";
}
function ordinal(n){
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}
function formStreak(comp, fullName){
  return clubMatches(comp, fullName).filter(m=>m.score).slice(-5).map(x=>{
    const ft = ftOf(x), isHome = x.team1===fullName;
    const gf = isHome?ft[0]:ft[1], ga = isHome?ft[1]:ft[0];
    return gf>ga ? "W" : gf<ga ? "L" : "D";
  }).join("");
}
function commentaryFor(m, comp){
  const d = DATA[comp];
  const homeRow = d.table.find(r=>r.name===m.team1), awayRow = d.table.find(r=>r.name===m.team2);
  const home = clubName(m.team1), away = clubName(m.team2);
  const ft = ftOf(m);
  if(ft){
    const [hg,ag] = ft, margin = Math.abs(hg-ag);
    const result = hg>ag ? `${home} take all three points` : hg<ag ? `${away} leave with the win` : "the spoils are shared";
    const tone = margin>=3 ? "a comprehensive scoreline" : margin===0 ? "a tightly-fought stalemate" : "a hard-fought result";
    const posLine = (homeRow && awayRow) ? ` ${home} sit ${ordinal(homeRow.pos)} on ${homeRow.pts} points, ${away} ${ordinal(awayRow.pos)} on ${awayRow.pts}, after this round.` : "";
    return `<p><b>${home} ${hg}-${ag} ${away}</b> — ${tone} in ${m.round}, as ${result}.${posLine}</p>`;
  }
  const hf = formStreak(comp, m.team1), af = formStreak(comp, m.team2);
  const formLine = (hf || af) ? ` Recent league form: ${home} ${hf||"—"}, ${away} ${af||"—"}.` : "";
  const posLine = (homeRow && awayRow)
    ? ` ${home} currently sit ${ordinal(homeRow.pos)} on ${homeRow.pts} points, with ${away} ${ordinal(awayRow.pos)} on ${awayRow.pts}.`
    : " Neither side has played a 2026-27 league fixture yet, so this is a clean slate.";
  return `<p><b>${home} vs ${away}</b> — ${m.round}, ${compLabel(comp)}.${posLine}${formLine}</p>`;
}

/* ---------- Followed clubs (localStorage, multi-select, spans both competitions) ---------- */

const FAV_KEY = "fh_favs";
function getFavs(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }catch(e){ return []; } }
function setFavs(arr){ try{ localStorage.setItem(FAV_KEY, JSON.stringify(arr)); }catch(e){} }
function toggleFav(name){ const f = getFavs(); const i = f.indexOf(name); if(i>=0) f.splice(i,1); else f.push(name); setFavs(f); return f; }
function updateFavBtn(){
  const favs = getFavs();
  document.getElementById("favBtnLabel").textContent = favs.length===0 ? "Clubs" : favs.length===1 ? favs[0] : `${favs.length} Clubs`;
  document.getElementById("favBtn").classList.toggle("set", favs.length>0);
}

/* ---------- Club fixture/news lookups (for My Teams) ---------- */

function clubMatches(comp, fullName){ return (DATA[comp].matches || []).filter(m=> m.team1===fullName || m.team2===fullName); }
function lastResultFor(comp, fullName){ const ms = clubMatches(comp, fullName).filter(m=>m.score); return ms.length ? ms[ms.length-1] : null; }
function nextFixtureFor(comp, fullName){ const ms = clubMatches(comp, fullName).filter(m=>!m.score); return ms.length ? ms[0] : null; }

/* ---------- Views ---------- */

function sectionHead(title, meta){
  return `<div class="sec-title"><h2>${title}</h2>${meta?`<span class="meta">${meta}</span>`:""}</div>`;
}
function compSwitcher(){
  return `<div class="stat-controls">
    <button class="chipbtn ${state.comp==='epl'?'on':''}" data-comp="epl">Premier League</button>
    <button class="chipbtn ${state.comp==='championship'?'on':''}" data-comp="championship">Championship</button>
  </div>`;
}

function viewToday(){
  const favs = getFavs();
  const seasonSt = seasonState();
  let html = "";

  if(seasonSt==="preseason"){
    const om = EPL.season2627.openingMatch;
    html += sectionHead("2026-27 season kicks off", `${fmtDate(om.date)}`);
    html += countdownBoxes(countdownTargetMs(om.date, om.time));
    html += `<div class="banner"><b>${om.home} vs ${om.away}</b> — ${om.venue}<br>${om.note}<br>
      <b>Kickoff:</b> ${om.time} UK · ${fmtCentral(om.date, om.time)} Central · ${tvNote("epl")}</div>`;
    html += `<div class="match"><div class="top"><span>Community Shield</span><span>${fmtDate(EPL.season2627.communityShield.date)}</span></div>
      <div class="rows"><div class="team"><span class="flag">${crest(CLUB_BY_FULL["Arsenal FC"]?.full||"",21)}</span><span class="name">${EPL.season2627.communityShield.home}</span></div><div></div></div>
      <div class="rows"><div class="team"><span class="flag">${crest(CLUB_BY_FULL["Manchester City FC"]?.full||"",21)}</span><span class="name">${EPL.season2627.communityShield.away}</span></div><div></div></div>
      <div class="foot"><span>${EPL.season2627.communityShield.venue}</span><span>${EPL.season2627.communityShield.note}</span></div></div>
      <p class="subtle">Championship kicks off ${fmtDate(CHA.season2627.openingMatch.date)} — a week earlier — with ${CHA.season2627.openingMatch.home} vs ${CHA.season2627.openingMatch.away}.</p>`;
  } else {
    html += sectionHead("Latest results", "Premier League");
    DATA.epl.matches.filter(m=>m.score).slice(-5).reverse().forEach(m=> html += matchCard(m, "epl"));
  }
  html += `<button class="meta-link" data-goto="live">🔴 Live scores, TV &amp; kickoff times →</button>`;

  if(favs.length){
    html += sectionHead("My Teams", `${favs.length} followed`);
    html += `<div class="perf">`;
    favs.slice(0,4).forEach(name=>{
      const c = CLUB_BY_SHORT[name]; if(!c) return;
      const d = DATA[c.comp];
      const next = nextFixtureFor(c.comp, c.full);
      const sub = next ? `Next: vs ${clubName(next.team1===c.full?next.team2:next.team1)} · ${fmtDate(next.date)}` : compLabel(c.comp);
      html += `<div class="perf-row">${crest(c.full,24)}<div class="perf-nm">${name}</div><div class="perf-pts" style="grid-column:span 2"><small>${sub}</small></div></div>`;
    });
    html += `</div><button class="meta-link" data-goto="myteams">See My Teams →</button>`;
  }

  html += `<div class="champ won"><span class="champ-trophy">🏆</span><div>
      <div class="champ-label">2025-26 Premier League Champions</div>
      <div class="champ-team">Arsenal</div>
    </div><span class="champ-tag won">Defending in 2026-27</span></div>`;

  html += sectionHead("Newsroom", "latest");
  (DATA.liveNews||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,2).forEach(n=> html += newsCard(n));
  NEWS.items.slice(0,3).forEach(n=> html += newsCard(n));
  html += `<button class="meta-link" data-goto="news">See all news →</button>`;

  html += sectionHead("Transfer window", `closes ${fmtDate(TRANSFERS.windowCloses)}`);
  TRANSFERS.deals.slice(0,3).forEach(d=> html += transferCard(d));
  html += `<button class="meta-link" data-goto="transfers">See all transfers →</button>`;

  return html;
}

function matchCard(m, comp){
  comp = comp || "epl";
  const home = clubName(m.team1), away = clubName(m.team2);
  const ft = ftOf(m);
  const when = fmtDate(m.date) + (!ft && m.time ? ` · ${m.time} UK` : "");
  const meta = (!ft && m.time) ? `<div class="match-meta"><span>🕐 ${fmtCentral(m.date, m.time)} Central</span><span>${tvNote(comp)}</span></div>` : "";
  return `<div class="match"><div class="top"><span>${m.round}</span><span>${when}</span></div>
    <div class="rows">
      <div class="team ${ft && ft[0]>ft[1]?"win":ft && ft[0]<ft[1]?"loss":""}"><span class="flag">${crest(m.team1,21)}</span><span class="name">${home}</span></div>
      <div class="score">${ft?ft[0]:"–"}</div>
      <div class="team ${ft && ft[1]>ft[0]?"win":ft && ft[1]<ft[0]?"loss":""}"><span class="flag">${crest(m.team2,21)}</span><span class="name">${away}</span></div>
      <div class="score">${ft?ft[1]:"–"}</div>
    </div>${meta}</div>`;
}

function newsCard(n){
  return `<div class="report"><div class="rp-head"><span class="rp-tag">${n.live?"🔴 ":""}${n.tag}</span><span class="rp-when">${fmtDate(n.date)}</span></div>
    <h3 class="rp-title">${n.title}</h3><div class="rp-body"><p>${n.body||""}</p></div>
    ${n.live && n.link?`<a class="meta-link" href="${n.link}" target="_blank" rel="noopener">Read on BBC Sport →</a>`:""}</div>`;
}
function viewNews(){
  const live = DATA.liveNews || [];
  let html = "";
  html += sectionHead("Live from BBC Sport", live.length?`${live.length} headlines`:"loading…");
  if(live.length){
    live.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).forEach(n=> html += newsCard(n));
  } else {
    html += `<p class="note">Real-time BBC Sport football headlines, fetched live — nothing loaded yet (or the feed is temporarily unreachable). This app's own editorial roundup is below regardless.</p>`;
  }
  html += sectionHead("Newsroom", `${NEWS.items.length} stories — editorial roundup`);
  NEWS.items.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach(n=> html += newsCard(n));
  return html;
}

function transferCard(d){
  return `<div class="news-item">
    <div class="ni-ic">🔁</div>
    <div style="flex:1"><div class="ni-text"><b>${d.player}</b> — ${d.from} → ${d.to}</div>
      <div class="ni-meta">${fmtDate(d.date)} · ${d.fee}${d.note?" · "+d.note:""}</div></div>
  </div>`;
}
function viewTransfers(){
  let html = sectionHead("Transfer tracker", `window closes ${fmtDate(TRANSFERS.windowCloses)}`);
  html += `<p class="subtle">Confirmed deals involving Premier League clubs, most recent first.</p>`;
  TRANSFERS.deals.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach(d=> html += transferCard(d));
  html += `<p class="note">Fees are press-reported and may be rounded or estimated. Source: FootballTransfers, CaughtOffside, Sky Sports (see docs/FOOTBALL-HUB.md).</p>`;
  return html;
}

function zoneFor(pos, comp, total){
  if(comp==="epl"){
    if(pos<=5) return {cls:"qual", tag:"UCL", kind:"acc"};
    if(pos<=7) return {cls:"", tag:"UEL", kind:""};
    if(pos>=18) return {cls:"", tag:"REL", kind:"rel"};
  } else {
    if(pos<=2) return {cls:"qual", tag:"UP", kind:"acc"};
    if(pos<=6) return {cls:"", tag:"P/O", kind:""};
    if(pos>total-3) return {cls:"", tag:"REL", kind:"rel"};
  }
  return {cls:"", tag:"", kind:""};
}
function tableRows(tbl, comp){
  const total = tbl.length;
  return tbl.map(r=>{
    const z = zoneFor(r.pos, comp, total);
    const chip = z.tag ? `<span class="chip ${z.kind==="acc"?"acc":""}" style="margin-left:6px${z.kind==="rel"?";color:var(--live);border-color:#5a2030":""}">${z.tag}</span>` : "";
    const ded = r.deduction ? ` <span class="chip" style="color:var(--warn);border-color:#5a4a1e" title="Points deduction applied">-${r.deduction}pts</span>` : "";
    return `<tr class="${z.cls}"><td class="pos">${r.pos}</td><td class="t">${crest(r.name,18)} ${clubName(r.name)}${chip}${ded}</td>
      <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd>0?"+":""}${r.gd}</td><td class="pts">${r.pts}</td></tr>`;
  }).join("");
}
function zoneLegend(comp){
  return comp==="epl"
    ? `<div class="vmeta" style="margin:10px 2px"><span class="chip acc">Champions League (top 5)</span><span class="chip">Europa / Conference (6-7)</span><span class="chip" style="color:var(--live);border-color:#5a2030">Relegation (18-20)</span></div>`
    : `<div class="vmeta" style="margin:10px 2px"><span class="chip acc">Automatic promotion (top 2)</span><span class="chip">Play-offs (3-6)</span><span class="chip" style="color:var(--live);border-color:#5a2030">Relegation (bottom 3)</span></div>`;
}
function viewTable(){
  const comp = state.comp, d = DATA[comp];
  let html = compSwitcher();
  const opener = d.meta.season2627.openingMatch || d.meta.season2627.communityShield;
  const started = d.leagueMatches.some(m=>m.score);
  if(!started){
    html += sectionHead(`${compLabel(comp)} 2026-27`, "season not yet started");
    html += `<div class="banner">Kicks off <b>${fmtDate(opener.date)}</b> (${daysUntil(opener.date)} days away). The table below fills in automatically, matchday by matchday, once real results start landing — no app update needed.</div>`;
    html += sectionHead(`${d.meta.lastSeason.year} final table`, "reference");
    html += `<div class="gcard"><table class="stand">
      <thead><tr><th>#</th><th style="text-align:left">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>${tableRows(d.meta.lastSeason.table, comp)}</tbody></table></div>`;
    html += zoneLegend(comp);
    if(comp==="championship"){
      html += `<div class="banner"><b>Play-off winners: ${d.meta.lastSeason.playoffWinner.club}</b><br>${d.meta.lastSeason.playoffWinner.note}</div>`;
      html += `<p class="note">${d.meta.lastSeason.relegationNote}</p>`;
    }
  } else {
    html += sectionHead(`${compLabel(comp)} table`, "2026-27 (live)");
    html += `<div class="gcard"><table class="stand">
      <thead><tr><th>#</th><th style="text-align:left">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>${tableRows(d.table, comp)}</tbody></table></div>`;
    html += zoneLegend(comp);
  }
  return html;
}

function viewFixtures(){
  const comp = state.comp, d = DATA[comp];
  let html = compSwitcher();
  html += sectionHead(`${compLabel(comp)} 2026-27 fixtures`, `${d.matches.length} matches`);
  html += `<input id="fxSearch" placeholder="Filter by club…" style="width:100%;background:var(--card);border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:9px 11px;font-size:13px;font-weight:600;margin-bottom:10px" />`;
  const rounds = {};
  d.matches.forEach(m=>{ (rounds[m.round] = rounds[m.round]||[]).push(m); });
  const roundKeys = Object.keys(rounds).sort((a,b)=>{
    const na = parseInt((a.match(/\d+/)||[0])[0],10), nb = parseInt((b.match(/\d+/)||[0])[0],10);
    return na-nb;
  });
  const firstUnplayed = roundKeys.find(k=> rounds[k].some(m=>!m.score));
  html += `<div id="fxList">`;
  roundKeys.forEach(rnd=>{
    const open = rnd===firstUnplayed ? " open" : "";
    html += `<details class="pbp"${open}><summary>${rnd}<span class="pbp-meta">${rounds[rnd].length} matches</span></summary><div style="padding:6px 14px 12px">`;
    rounds[rnd].forEach(m=> html += matchCard(m, comp));
    html += `</div></details>`;
  });
  html += `</div>`;
  html += `<p class="note">Full season fixture list sourced from the openfootball project (released ${fmtDate(d.meta.season2627.fixturesReleased)}). Scores fill in live as matches are played; see the freshness pill for the current data source.</p>`;

  html += sectionHead(`${d.meta.lastSeason.year} results archive`, `${d.archive.length} matches`);
  html += `<details class="pbp"><summary>Show last season's results<span class="pbp-meta">${d.archive.length} matches</span></summary><div style="padding:6px 14px 12px" id="fxArchive">`;
  const aRounds = {};
  d.archive.forEach(m=>{ (aRounds[m.round] = aRounds[m.round]||[]).push(m); });
  Object.keys(aRounds).forEach(rnd=>{
    html += `<details class="pbp"><summary>${rnd}<span class="pbp-meta">${aRounds[rnd].length} matches</span></summary><div style="padding:6px 14px 12px">`;
    aRounds[rnd].forEach(m=> html += matchCard(m, comp));
    html += `</div></details>`;
  });
  html += `</div></details>`;
  return html;
}

function teamCard(c){
  return `<div class="tcard">${crest(c.full,32)}<div><div class="nm">${c.name}</div><div class="gp">${c.nick} · ${c.ground}</div></div></div>`;
}
function viewTeams(){
  const comp = state.comp, d = DATA[comp];
  let html = compSwitcher();
  html += sectionHead(`2026-27 ${compLabel(comp)} clubs`, `${d.currentClubs.length} clubs`);
  html += `<div class="tgrid">`;
  d.currentClubs.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=> html += teamCard(c));
  html += `</div>`;
  if(comp==="epl"){
    html += sectionHead("Promoted from the Championship");
    html += `<div class="tgrid">`;
    EPL.promoted2627.forEach(c=> html += `<div class="tcard">${crest(c.full,32)}<div><div class="nm">${c.name}</div><div class="gp">${c.note}</div></div></div>`);
    html += `</div>`;
    html += sectionHead("Relegated to the Championship");
    html += `<div class="tgrid">`;
    EPL.clubs.filter(c=>c.relegated).forEach(c=> html += `<div class="tcard">${crest(c.full,32)}<div><div class="nm">${c.name}</div><div class="gp">${c.nick} · ${c.ground}</div></div></div>`);
    html += `</div>`;
  } else {
    html += sectionHead("Promoted to the Premier League");
    html += `<div class="tgrid">`;
    CHA.promotedToEPL2627.forEach(name=>{ const c = CLUB_BY_SHORT[name]; if(c) html += teamCard(c); });
    html += `</div>`;
    html += sectionHead("Relegated from the Premier League");
    html += `<div class="tgrid">`;
    CHA.relegatedIn2627.forEach(name=>{ const c = CLUB_BY_SHORT[name]; if(c) html += teamCard(c); });
    html += `</div>`;
    html += sectionHead("Up from League One");
    html += `<div class="tgrid">`;
    CHA.promotedFromLeagueOne2627.forEach(name=>{ const c = d.currentClubs.find(x=>x.name===name); if(c) html += teamCard(c); });
    html += `</div>`;
    html += sectionHead("Down to League One");
    html += `<div class="tgrid">`;
    CHA.relegatedToLeagueOne2627.forEach(name=> html += `<div class="tcard"><span class="crest" style="width:32px;height:32px;line-height:32px;font-size:11px;background:#4a3f66;color:#fff">${name.split(" ").map(w=>w[0]).join("").slice(0,3)}</span><div><div class="nm">${name}</div><div class="gp">Now in League One</div></div></div>`);
    html += `</div>`;
  }
  return html;
}

function viewUCL(){
  const s26 = UCL.season2526, s27 = UCL.season2627;
  let html = sectionHead("2025-26 Champions League", "final recap");
  html += `<div class="report report-rep"><div class="rp-head"><span class="rp-tag">Final</span><span class="rp-when">${fmtDate(s26.date)}</span></div>
    <h3 class="rp-title">${s26.champion} win it again</h3>
    <div class="rp-dek">${s26.result} — ${s26.runnerUp} runners-up</div>
    <div class="rp-body"><p>${s26.note}</p></div>
    <div class="rp-motm">⭐ Man of the Match: <b>${s26.manOfTheMatch}</b></div>
    <div class="rp-by">${s26.venue}</div></div>`;

  html += sectionHead("2026-27 Champions League", "preview");
  html += `<div class="banner"><b>League-phase draw:</b> ${fmtDate(s27.leaguePhaseDraw)} (${daysUntil(s27.leaguePhaseDraw)} days away)<br>
    <b>Matchday 1:</b> ${s27.matchday1}</div>`;
  html += `<p class="subtle">${s27.format}</p>`;
  html += sectionHead("English clubs qualified", `${s27.englishClubs.length} clubs`);
  s27.englishClubs.forEach(c=>{
    const meta = clubMeta(c.name);
    html += `<div class="perf-row">${meta?crest(meta.full,24):""}<div class="perf-nm">${c.name}</div><div class="perf-pts" style="grid-column:span 2"><small>${c.qualified}</small></div></div>`;
  });
  html += `<p class="note">${s27.note}</p>`;

  html += sectionHead("English clubs — 2026-27 league phase", "results & fixtures");
  const uclMatches = (DATA.ucl && DATA.ucl.englishMatches) || [];
  if(uclMatches.length){
    uclMatches.slice().sort((a,b)=>(a.date+String(a.time||"")).localeCompare(b.date+String(b.time||""))).forEach(m=> html += liveMatchCard(m, "ucl"));
  } else {
    html += `<div class="empty">${DATA.ucl?DATA.ucl.dataSource:"Loading…"} — fetched live from the same public-domain openfootball project as the Premier League/Championship data, so this fills in automatically once fixtures are published; no separate update needed.</div>`;
  }
  return html;
}

function viewOdds(){
  const o = EPL.titleOdds;
  let html = sectionHead("Premier League title winner", `snapshot ${fmtDate(o.asOf)}`);
  html += `<div class="banner">${o.note}</div>`;
  o.market.forEach((row,i)=>{
    const [name, pct] = row;
    const meta = clubMeta(name);
    html += `<div class="odds-row"><span class="rank">${i+1}</span><span class="flag">${meta?crest(meta.full,22):""}</span>
      <span class="nm">${name}</span><span class="bar"><i style="width:${Math.min(100,pct*2.4)}%"></i></span><span class="pct">${pct.toFixed(1)}%</span></div>`;
  });
  html += `<p class="note">Source: <a href="${o.sourceUrl}" target="_blank" rel="noopener">${o.source}</a>. A dated snapshot, not a live feed.</p>`;

  html += sectionHead("Opening weekend", "Matchday 1");
  const upcoming = DATA.epl.matches.filter(m=>!m.score).slice(0,10);
  if(!upcoming.length){
    html += `<div class="empty">No upcoming fixtures loaded yet.</div>`;
  } else {
    upcoming.forEach(m=>{
      html += `<div class="lodds"><div class="lo-top"><b>${clubName(m.team1)}</b> vs <b>${clubName(m.team2)}</b><span>${fmtDate(m.date)}${m.time?" · "+m.time:""}</span></div>
        <div class="lo-3"><div class="lo-cell"><div class="lc-k">Home</div><div class="lc-v">–</div></div>
        <div class="lo-cell"><div class="lc-k">Draw</div><div class="lc-v">–</div></div>
        <div class="lo-cell"><div class="lc-k">Away</div><div class="lc-v">–</div></div></div></div>`;
    });
  }
  html += `<p class="note">Match-winner predictions are modeled once a form baseline exists after a few rounds — informational only, not a real betting market.</p>`;
  return html;
}

const POS_LABELS = { GK:"Goalkeepers", DEF:"Defenders", MID:"Midfielders", FWD:"Forwards" };
const FPL_ELEMENT_POS = { 1:"GKP", 2:"DEF", 3:"MID", 4:"FWD" };
const FPL_KEY = "fh_fpl_id";
/* The official FPL API doesn't reliably allow direct cross-origin requests
   from third-party browser JS (confirmed by hand — the direct fetch failed
   on the deployed preview). Route through this app's own Netlify Function
   proxy instead, which fetches server-side where CORS doesn't apply.
   On a netlify.app host, use a relative path so each deploy (production or
   a PR preview) talks to its own freshly-deployed function; everywhere
   else (e.g. GitHub Pages), call the production Netlify function directly
   — it sets permissive CORS headers so any origin can read it. */
const FPL_PROXY = location.hostname.endsWith("netlify.app")
  ? "/.netlify/functions/fpl-proxy"
  : "https://worldcupfootball26.netlify.app/.netlify/functions/fpl-proxy";
function fplProxyUrl(path){ return `${FPL_PROXY}?path=${encodeURIComponent(path)}`; }

/* Live news — same relative/absolute host-detection pattern as the FPL
   proxy, for the same reason: a direct browser fetch of BBC Sport's RSS
   feed fails CORS, so netlify/functions/news-proxy.js re-fetches it
   server-side and returns real, parsed BBC headlines as JSON. */
const NEWS_PROXY = location.hostname.endsWith("netlify.app")
  ? "/.netlify/functions/news-proxy"
  : "https://worldcupfootball26.netlify.app/.netlify/functions/news-proxy";
async function loadLiveNews(){
  try{
    const d = await getJSON(`${NEWS_PROXY}?feed=football`, 7000);
    return (d.items||[]).map(it=>{
      const parsed = new Date(it.pubDate);
      if(isNaN(parsed)) return null;
      return { date: parsed.toISOString().slice(0,10), tag: "BBC Sport", title: it.title, body: it.description, link: it.link, live: true };
    }).filter(Boolean);
  }catch(e){ return []; }
}
// Matches known current-season club short names (Object.keys(CLUB_BY_SHORT), populated
// once loadData's competition fetches resolve) against free text — used only to tag
// which followed club(s) a live headline is relevant to, never to assert anything the
// headline itself doesn't already say.
function tagClubsInText(text){
  if(!text) return [];
  return Object.keys(CLUB_BY_SHORT).filter(name=> text.includes(name));
}
let ALFRED = null;  // Alfred's authoritative GW decision (data/alfred-fpl.json)
let FPL = { id:null, event:null, loading:false, error:null, bootstrap:null, entry:null, picks:null, history:null, league:null, leagueStandings:null };

/* Picks which of the visitor's real FPL leagues (entry.leagues.classic) to
   compare against. FPL auto-enrols everyone in system-wide leagues (the
   global "Overall" league, country/region leagues) alongside any private
   mini-league they've actually joined with friends — "people in my league"
   means the latter, so a private league (league_type "x", per the FPL API)
   is preferred when one exists. Falls back to the first league on the
   account if no private one is found, so this never fabricates a league —
   it just uses whichever real one the API returns, labelled with its own
   real name. */
function fplPickLeague(entry){
  const leagues = (entry && entry.leagues && entry.leagues.classic) || [];
  if(!leagues.length) return null;
  return leagues.find(l=>l.league_type==="x") || leagues[0];
}

function fantasySwitcher(){
  return `<div class="stat-controls">
    <button class="chipbtn ${state.fantasySub!=="myteam"?"on":""}" data-fsub="best">Best XI</button>
    <button class="chipbtn ${state.fantasySub==="myteam"?"on":""}" data-fsub="myteam">My Team</button>
  </div>`;
}
function viewFantasy(){
  let html = fantasySwitcher();
  html += state.fantasySub==="myteam" ? viewFantasyMyTeam() : viewFantasyBest();
  return html;
}
function viewFantasyBest(){
  let html = sectionHead("Fantasy watch — best XI", `snapshot ${fmtDate(PLAYERS.asOf)}`);
  html += `<div class="banner">${PLAYERS.note}</div>`;
  Object.keys(POS_LABELS).forEach(pos=>{
    const list = PLAYERS.positions[pos] || [];
    html += `<div class="posgroup"><div class="posgroup-h"><h3>${POS_LABELS[pos]}</h3><span>Top 3</span></div>`;
    list.forEach(p=>{
      const meta = CLUB_BY_FULL[p.club];
      html += `<div class="pcard"><div class="pcard-top">${meta?crest(p.club,30):""}
        <div><div class="pcard-nm">${p.name}</div><div class="pcard-club">${meta?meta.name:p.club}</div></div>
        <span class="pcard-stat">${p.stat}</span></div>
        <p class="pcard-note">${p.note}</p></div>`;
    });
    html += `</div>`;
  });
  html += `<p class="note">Premier League only, based on real 2025-26 season honours and stats (Golden Boot, Golden Glove, Playmaker of the Season, Team of the Season). This is a curated editorial guide, not a live per-gameweek Fantasy Premier League points feed — see docs/FOOTBALL-HUB.md for sources.</p>`;
  return html;
}

/* ---------- Live "My FPL Team" (official Fantasy Premier League API) ---------- */

function storedFplId(){ try{ return localStorage.getItem(FPL_KEY); }catch(e){ return null; } }

async function loadFplTeam(id){
  FPL = { id, event: FPL.event, loading:true, error:null, bootstrap:null, entry:null, picks:null, history:null, fixtures:null, dreamTeam:null, dreamTeamEvent:null, league:null, leagueStandings:null };
  try{ localStorage.setItem(FPL_KEY, id); }catch(e){}
  if(state.view==="fantasy") render();
  try{
    /* ALFRED OVERRIDE. The public FPL API only exposes COMPLETED gameweeks, so the squad
       fetched below is a gameweek behind — it listed Mitchell/F.Kadioglu/Calvert-Lewin long after
       they were transferred out, and suggested moves that could not be made. data/alfred-fpl.json
       is the session-maintained golden record. Fetched defensively: any failure leaves ALFRED null
       and the page behaves exactly as it did before. */
    try {
      const _ar = await fetch("/data/alfred-fpl.json", { cache: "no-store" });
      ALFRED = _ar.ok ? await _ar.json() : null;
    } catch (e) { ALFRED = null; }

    /* OVERRIDE THE SQUAD ITSELF, not just the banner. Showing an "Alfred says" card above a squad
       list still full of Mitchell / F.Kadioglu / Calvert-Lewin is worse than useless — the stale
       list reads as fact and drives the transfer suggestions underneath it. When Alfred's decision
       is AHEAD of the gameweek the public API can see, rebuild FPL.picks from the golden record so
       every section below (defenders, midfielders, forwards, recommendations, transfers) renders
       the squad John actually owns. Resolution is by exact web_name within the club, and if ANY of
       the 15 fails to resolve we abandon the override entirely rather than show a half-real squad. */
    try {
      if (ALFRED && ALFRED.xi && bootstrap && bootstrap.elements) {
        const short = {}; (bootstrap.teams||[]).forEach(t => short[t.id] = t.short_name);
        const fold = x => (x||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\./g,"").trim();
        const find = (nm, club) => {
          const w = fold(nm);
          let c = bootstrap.elements.filter(e => short[e.team] === club && fold(e.web_name) === w);
          if (!c.length) c = bootstrap.elements.filter(e => short[e.team] === club && fold(e.web_name).indexOf(w) >= 0);
          return c.length ? c[0] : null;
        };
        const list = ALFRED.xi.concat(ALFRED.bench || []);
        const built = []; let ok = true;
        list.forEach((p, i) => {
          const e = find(p.name, p.club);
          if (!e) { ok = false; return; }
          built.push({ element: e.id, position: i + 1, multiplier: i < 11 ? 1 : 0,
                       is_captain: p.name === ALFRED.captain,
                       is_vice_captain: p.name === ALFRED.vice });
        });
        if (ok && built.length === 15) {
          FPL.picks = Object.assign({}, FPL.picks || {}, { picks: built });
          ALFRED.overrode = true;
        }
      }
    } catch (e) { /* leave the API squad in place rather than show something half-built */ }
    const bootstrap = await getJSON(fplProxyUrl("bootstrap-static/"), 9000);
    const events = bootstrap.events || [];
    const current = events.find(e=>e.is_current) || events.slice().reverse().find(e=>e.finished) || events[0];
    const event = current ? current.id : 1;
    const lastFinished = events.filter(e=>e.finished).sort((a,b)=>b.id-a.id)[0];
    const [entry, picks, history, fixtures, dreamTeam] = await Promise.all([
      getJSON(fplProxyUrl(`entry/${id}/`), 9000).catch(()=>null),
      getJSON(fplProxyUrl(`entry/${id}/event/${event}/picks/`), 9000),
      getJSON(fplProxyUrl(`entry/${id}/history/`), 9000).catch(()=>null),
      getJSON(fplProxyUrl("fixtures/"), 9000).catch(()=>null),
      lastFinished ? getJSON(fplProxyUrl(`dream-team/${lastFinished.id}/`), 9000).catch(()=>null) : Promise.resolve(null)
    ]);
    FPL.bootstrap = bootstrap; FPL.entry = entry; FPL.picks = picks; FPL.event = event; FPL.history = history; FPL.fixtures = fixtures;
    FPL.dreamTeam = dreamTeam; FPL.dreamTeamEvent = lastFinished ? lastFinished.id : null;
    const league = fplPickLeague(entry);
    FPL.league = league;
    if(league){
      FPL.leagueStandings = await getJSON(fplProxyUrl(`leagues-classic/${league.id}/standings/`), 9000).catch(()=>null);
    }
    fplTrackRecordWeek();
  }catch(e){
    FPL.error = "Couldn't load your live team right now — either the team ID doesn't exist, or the Fantasy Premier League site is temporarily unreachable. Double-check the ID and try again.";
  }
  FPL.loading = false;
  if(state.view==="fantasy") render();
  if(!FPL.error){
    fplTrackResolveOutstanding().then(changed=>{ if(changed && state.view==="fantasy") render(); });
  }
}

function fplElement(id){ return FPL.bootstrap && (FPL.bootstrap.elements||[]).find(e=>e.id===id); }
function fplTeamMeta(id){ return FPL.bootstrap && (FPL.bootstrap.teams||[]).find(t=>t.id===id); }

const FPL_FIXTURE_HORIZON = 4;
/* A team's next N fixtures with FPL's own published difficulty rating
   (1 = easiest, 5 = hardest — the same "FDR" shown on the official site),
   from the real fixtures/ endpoint. Not a rating this app invents. */
function fplUpcomingFixtures(teamId, n){
  n = n || FPL_FIXTURE_HORIZON;
  if(!FPL.fixtures || !teamId) return null;
  const upcoming = FPL.fixtures
    .filter(f=> !f.finished && (f.team_h===teamId || f.team_a===teamId))
    .sort((a,b)=> (a.event||99)-(b.event||99))
    .slice(0, n)
    .map(f=>{
      const home = f.team_h===teamId;
      const oppId = home ? f.team_a : f.team_h;
      const opp = fplTeamMeta(oppId);
      return { opponent: opp?opp.short_name||opp.name:"?", venue: home?"H":"A", difficulty: home?f.team_h_difficulty:f.team_a_difficulty };
    });
  if(!upcoming.length) return null;
  const avg = upcoming.reduce((s,f)=>s+(f.difficulty||3),0) / upcoming.length;
  return { fixtures: upcoming, avg };
}
function fplFixtureLabel(avg){
  if(avg==null) return "";
  if(avg<=2.4) return "favourable";
  if(avg>=3.8) return "tough";
  return "average";
}
function fplFixtureRunText(teamId){
  const run = fplUpcomingFixtures(teamId);
  if(!run) return "";
  const list = run.fixtures.map(f=>`${f.opponent}(${f.venue})`).join(" ");
  return `Next ${run.fixtures.length}: ${list} — ${fplFixtureLabel(run.avg)} run (avg FDR ${run.avg.toFixed(1)})`;
}
function fplStatusFlag(el){
  if(!el) return "";
  const labels = { d:"Doubtful", i:"Injured", s:"Suspended", u:"Unavailable", n:"Not available" };
  if(el.status && el.status!=="a" && labels[el.status]) return labels[el.status];
  if(el.chance_of_playing_next_round!=null && el.chance_of_playing_next_round<100) return `${el.chance_of_playing_next_round}% chance of playing`;
  return "";
}

/* Alfred's decision, rendered at the top of the Fantasy view. Read-only: it does not touch the
   squad model below, so a missing or malformed JSON leaves the rest of the page unaffected. */
function fplAlfredHtml(){
  const A = ALFRED;
  if(!A || !A.gw) return "";
  const stale = (typeof FPL.event === "number") && (A.gw > FPL.event);
  let left = "";
  try {
    const ms = new Date(String(A.deadline).replace(" ", "T")) - new Date();
    if(ms > 0){
      const h = Math.floor(ms/3600000);
      left = h >= 24 ? Math.floor(h/24)+"d "+(h%24)+"h remaining" : h+"h remaining";
    } else { left = "deadline passed"; }
  } catch(e){}
  const chg = (A.changes||[]).map(function(c){
    return "<li><b>"+c.in+"</b> into the XI &nbsp;·&nbsp; <span style=\"opacity:.6;text-decoration:line-through\">"+c.out+"</span> to the bench</li>";
  }).join("") || "<li>Starting XI is already optimal — no changes needed.</li>";
  const capLine = (A.captain === A.captain_current)
    ? "Captain <b>"+A.captain+"</b>" : "Captain <b>"+A.captain+"</b> — change from "+A.captain_current;
  const viceLine = (A.vice === A.vice_current)
    ? "Vice <b>"+A.vice+"</b>" : "Vice <b>"+A.vice+"</b> — change from "+A.vice_current;
  const src = A.overrode ? "<p class=\"note\" style=\"margin:8px 0 0\">Squad below is Alfred's current GW"+A.gw+" record, not the FPL API's older snapshot.</p>" : "";
  const warn = stale
    ? "<p class=\"note\" style=\"margin:8px 0 0\">FPL's public API still reports Gameweek "+FPL.event+", so the squad shown further down is a gameweek behind. Alfred's Gameweek "+A.gw+" decision above is the current one.</p>"
    : "";
  return sectionHead("Alfred — this week's decision", "GW"+A.gw+" · "+left) +
    "<div class=\"analyst\"><div class=\"analyst-head\"><span class=\"analyst-badge\">Alfred</span></div>" +
    "<div class=\"analyst-body\">" +
    "<ul style=\"margin:4px 0 10px;padding-left:18px\">"+chg+"</ul>" +
    "<p style=\"margin:6px 0\">"+capLine+"<br>"+viceLine+"</p>" +
    "<p class=\"note\" style=\"margin:6px 0 0\">Formation "+A.formation+" · "+((A.transfers_recommended||[]).length?"":"no transfers recommended")+" · "+((A.chips_active||[]).length?"chip active":"no chips")+"</p>" +
    "<p class=\"note\" style=\"margin:6px 0 0;font-style:italic\">Updated "+A.generated+" "+(A.tz||"")+"</p>" +
    warn + src + "</div></div>";
}

function fplRecommendations(){
  const recs = [];
  if(!FPL.picks || !FPL.bootstrap) return recs;
  const picks = FPL.picks.picks || [];
  const starting = picks.filter(p=>p.position<=11);
  const bench = picks.filter(p=>p.position>11);

  const capPick = starting.find(p=>p.is_captain);
  const capEl = capPick && fplElement(capPick.element);
  if(capEl){
    let best = null, bestEp = parseFloat(capEl.ep_next||0);
    starting.forEach(p=>{
      const el = fplElement(p.element);
      if(!el) return;
      const ep = parseFloat(el.ep_next||0);
      if(ep > bestEp){ bestEp = ep; best = el; }
    });
    if(best){
      recs.push({title:`Consider captaining ${best.web_name} instead of ${capEl.web_name}`,
        body:`${best.web_name}'s official expected points for the next gameweek (${bestEp.toFixed(1)}) is higher than your current captain's (${parseFloat(capEl.ep_next||0).toFixed(1)}).`});
    }
  }

  starting.forEach(p=>{
    const el = fplElement(p.element);
    if(!el) return;
    const flagged = (el.status && el.status!=="a") || (el.chance_of_playing_next_round!=null && el.chance_of_playing_next_round<75);
    if(!flagged) return;
    const alt = bench.map(b=>fplElement(b.element)).filter(Boolean).filter(b=>(!b.status || b.status==="a"))
      .sort((a,b)=>parseFloat(b.ep_next||0)-parseFloat(a.ep_next||0))[0];
    recs.push({title:`${el.web_name} is flagged`,
      body:`${el.news || fplStatusFlag(el) || "Reduced chance of playing this gameweek."}${alt?` Your bench has ${alt.web_name} (${parseFloat(alt.ep_next||0).toFixed(1)} expected pts) available as a fit alternative.`:""}`});
  });

  return recs;
}

/* Free transfers available, reconstructed from real per-gameweek history
   per the documented 2026-27 FPL rules: 1 free transfer per gameweek,
   banked up to a maximum of 5, and each extra transfer beyond what's
   banked costs 4 points. Playing a Wildcard or Free Hit removes that cost
   for the gameweek and leaves the banked count unchanged either way
   (confirmed via the official FPL FAQ — neither chip grows nor shrinks
   what you have saved). There's no direct "free transfers remaining"
   field in the public API, so this replays every recorded gameweek's
   transfer count and any chip played to arrive at the real current count. */
function fplFreeTransfers(){
  const h = FPL.history, picks = FPL.picks, event = FPL.event;
  if(!h || !picks || !picks.entry_history || !event) return null;
  const chipByEvent = {};
  (h.chips||[]).forEach(c=>{ chipByEvent[c.event] = c.name; });
  // Baseline: 1 free transfer at the start of the window into `event`. Real FPL keeps
  // is_current pinned to the gameweek just played (not the next one) for the whole run-up
  // to the following deadline — confirmed against a live account: FPL.event was still 1,
  // with GW1 already finished and scored, right up until GW2's deadline. So `event` here
  // can legitimately be 1 while the transfer window that matters (into GW2) is wide open;
  // `r.event<event` naturally has nothing to replay in that case (no history exists before
  // GW1), leaving `free` at the correct baseline of 1 rather than blocking the whole engine.
  let free = 1;
  (h.current||[]).filter(r=>r.event<event).sort((a,b)=>a.event-b.event).forEach(r=>{
    const chip = chipByEvent[r.event];
    if(chip==="wildcard" || chip==="freehit") return; // banked count carries over unchanged
    free = Math.min(5, Math.max(0, free - (r.event_transfers||0)) + 1);
  });
  const usedThisGw = picks.entry_history.event_transfers || 0;
  const activeChip = picks.active_chip || null;
  const unlimited = activeChip==="wildcard" || activeChip==="freehit";
  return { atGwStart: free, usedThisGw, remaining: unlimited ? Infinity : Math.max(0, free - usedThisGw), chipActive: activeChip };
}

/* Searches the full player pool for a better, affordable, fit replacement
   for each squad player, then only surfaces a swap whose expected-points
   gain next gameweek is worth it once the real transfer-cost penalty
   (0 if a free transfer is available or a Wildcard/Free Hit is active,
   else -4) is subtracted — i.e. actual net value, not just "who has a
   higher number." Budget uses each squad player's current market price as
   a stand-in for real sell value (disclosed in the UI): FPL's exact sell
   price — which can run below market price after a rise, per its
   profit-taking rule — isn't in the public, unauthenticated API.
   Among affordable options within EP_TOLERANCE expected points of the very
   best one for a slot, the cheapest is preferred (value for money) rather
   than always defaulting to the single priciest name — real squad value
   and bank are also always shown alongside these suggestions so the
   budget picture is never hidden. */
const FPL_EP_TOLERANCE = 0.3;
const FPL_MAX_PER_CLUB = 3; // real FPL squad rule: no more than 3 players from one club

/* Club counts across the current 15, optionally excluding one element
   (the player being replaced) — used to check whether adding a candidate
   would push their club over the real 3-per-club squad limit. */
function fplClubCounts(excludeElementId){
  const counts = {};
  (FPL.picks && FPL.picks.picks || []).forEach(p=>{
    if(p.element===excludeElementId) return;
    const el = fplElement(p.element);
    if(el) counts[el.team] = (counts[el.team]||0)+1;
  });
  return counts;
}

/* The best real, affordable, fit replacement for each of the 15 squad slots
   (sorted best-gain-first) — shared by fplTransferSuggestions() (which only
   keeps the ones actually worth a transfer) and fplClosestTransferCandidate()
   below (which names the best one even when it isn't), so "no transfer worth
   it" is always backed by a real, shown comparison rather than silence. */
function fplTransferCandidates(){
  if(!FPL.picks || !FPL.bootstrap) return [];
  const elements = FPL.bootstrap.elements || [];
  const squadIds = new Set((FPL.picks.picks||[]).map(p=>p.element));
  const bank = (FPL.picks.entry_history && FPL.picks.entry_history.bank) || 0;

  const candidates = [];
  (FPL.picks.picks||[]).forEach(pick=>{
    const cur = fplElement(pick.element);
    if(!cur) return;
    const budget = cur.now_cost + bank;
    const curEp = parseFloat(cur.ep_next||0);
    const clubCounts = fplClubCounts(cur.id); // excludes the player being replaced
    const fits = elements.filter(cand=>
      !squadIds.has(cand.id) && cand.element_type===cur.element_type && cand.status==="a" && cand.now_cost<=budget &&
      (clubCounts[cand.team]||0) < FPL_MAX_PER_CLUB);
    if(!fits.length) return;
    const bestEp = fits.reduce((m,c)=> Math.max(m, parseFloat(c.ep_next||0)), curEp);
    if(bestEp<=curEp) return; // no real upgrade available for this slot
    const best = fits
      .filter(c=> parseFloat(c.ep_next||0) >= bestEp-FPL_EP_TOLERANCE)
      .sort((a,b)=> a.now_cost-b.now_cost)[0]; // cheapest among near-best
    candidates.push({ out: cur, in: best, gain: parseFloat(best.ep_next||0) - curEp });
  });
  candidates.sort((a,b)=> b.gain - a.gain);
  return candidates;
}

function fplTransferSuggestions(){
  const ft = fplFreeTransfers();
  if(!ft) return [];
  const candidates = fplTransferCandidates();
  const suggestions = [];
  const usedIn = new Set(); // a single incoming player can't fill two squad slots at once
  for(const c of candidates){
    if(suggestions.length >= 2) break;
    if(usedIn.has(c.in.id)) continue;
    const cost = ft.chipActive || suggestions.length < ft.remaining ? 0 : 4;
    const net = c.gain - cost;
    if(net > 0){ suggestions.push({ out:c.out, in:c.in, gain:c.gain, cost, net }); usedIn.add(c.in.id); }
  }
  return suggestions;
}

/* Named even when nothing clears the transfer-cost bar — the single best real
   upgrade found across all 15 slots, with its exact point math, so "no
   transfer currently looks worth it" is visibly a real comparison the app
   actually ran, not just silence with no player named. */
function fplClosestTransferCandidate(){
  const ft = fplFreeTransfers();
  if(!ft) return null;
  const candidates = fplTransferCandidates();
  if(!candidates.length) return null;
  const c = candidates[0];
  const cost = ft.chipActive ? 0 : (ft.remaining>0 ? 0 : 4);
  return { out: c.out, in: c.in, gain: c.gain, cost, net: c.gain - cost };
}

function fplTransferCard(s){
  const outTeam = fplTeamMeta(s.out.team), inTeam = fplTeamMeta(s.in.team);
  const outRun = fplUpcomingFixtures(s.out.team), inRun = fplUpcomingFixtures(s.in.team);
  let fixtureNote = "";
  if(outRun && inRun){
    const outLabel = fplFixtureLabel(outRun.avg), inLabel = fplFixtureLabel(inRun.avg);
    if(inLabel==="favourable" && outLabel!=="favourable"){
      fixtureNote = `${inTeam?inTeam.name:"Their new club"} also have a favourable run ahead (avg FDR ${inRun.avg.toFixed(1)}) — backs up the swap.`;
    } else if(inLabel==="tough" && outLabel!=="tough"){
      fixtureNote = `Worth noting: ${inTeam?inTeam.name:"their new club"} face a tough run ahead (avg FDR ${inRun.avg.toFixed(1)}) — weigh that against the expected-points gain.`;
    } else if(outLabel==="favourable" && inLabel!=="favourable"){
      fixtureNote = `${outTeam?outTeam.name:"Their current club"} actually have a favourable run coming up (avg FDR ${outRun.avg.toFixed(1)}) — you may want to hold rather than sell into it.`;
    }
  }
  const outPrice = (s.out.now_cost/10).toFixed(1), inPrice = (s.in.now_cost/10).toFixed(1);
  const bankAfter = fplBankAfter(s.out, s.in);
  return `<div class="pcard"><div class="pcard-top">
    <div><div class="pcard-nm">${fplOutTag()} ${s.out.web_name} (£${outPrice}m) → ${fplInTag()} ${s.in.web_name} (£${inPrice}m)</div><div class="pcard-club">${outTeam?outTeam.name:""} → ${inTeam?inTeam.name:""}</div></div>
    <span class="pcard-stat">net ${fplSigned(s.net)}</span></div>
    <p class="pcard-note">+${s.gain.toFixed(1)} xPts next GW${s.cost?` − ${s.cost}pt hit`:""} = <b>${fplSigned(s.net)} net</b> · Bank after: <b>£${(bankAfter/10).toFixed(1)}m</b></p>
    ${fixtureNote?`<p class="pcard-note">📅 ${fixtureNote}</p>`:""}</div>`;
}

/* ---------- Chip strategy (Wildcard / Free Hit / Bench Boost / Triple Captain) ---------- */

const FPL_CHIP_NAMES = { wildcard:"Wildcard", freehit:"Free Hit", bboost:"Bench Boost", "3xc":"Triple Captain" };
const FPL_CHIP_HALF_BOUNDARY = 19; // real 2026-27 rule: first-half chips must be played before the GW19 deadline

/* Real chip usage, not a guess: each chip type is playable once per half of
   the season (2 of each in total for 2026-27) — replayed from history.chips,
   the real record of every chip this visitor has already played and when. */
function fplChipStatus(){
  if(!FPL.history || !FPL.event) return null;
  const half = FPL.event < FPL_CHIP_HALF_BOUNDARY ? 1 : 2;
  const usedThisHalf = {};
  (FPL.history.chips||[]).forEach(c=>{
    const chipHalf = c.event < FPL_CHIP_HALF_BOUNDARY ? 1 : 2;
    if(chipHalf===half) usedThisHalf[c.name] = c.event;
  });
  const activeChip = FPL.picks && FPL.picks.active_chip;
  const status = {};
  Object.keys(FPL_CHIP_NAMES).forEach(k=>{
    status[k] = { label: FPL_CHIP_NAMES[k], availableThisHalf: !usedThisHalf[k], usedEvent: usedThisHalf[k]||null, activeNow: activeChip===k };
  });
  return { half, status };
}

/* Worth boosting the bench when this week's projected bench points clearly
   exceed this visitor's own historical average (real points_on_bench from
   their gameweek history) — a personalised baseline, not a flat guess. */
function fplBenchBoostSignal(){
  if(!FPL.picks) return null;
  const bench = (FPL.picks.picks||[]).filter(p=>p.position>11);
  const benchEp = bench.reduce((s,p)=>{ const el=fplElement(p.element); return s+(el?parseFloat(el.ep_next||0):0); }, 0);
  const past = ((FPL.history && FPL.history.current) || []).map(r=>r.points_on_bench).filter(v=>v!=null);
  const avgPast = past.length ? past.reduce((a,b)=>a+b,0)/past.length : null;
  const threshold = avgPast!=null ? Math.max(8, avgPast*1.4) : 10;
  return { benchEp, avgPast, threshold, worth: benchEp>=threshold };
}

/* Worth tripling when the best captain option's own expected points are
   high in absolute terms AND their next fixture is genuinely favourable —
   both real, sourced numbers (ep_next, FDR), combined via a disclosed
   threshold rather than a hidden score. */
function fplTripleCaptainSignal(){
  if(!FPL.picks) return null;
  const starting = (FPL.picks.picks||[]).filter(p=>p.position<=11);
  let best=null, bestEp=-1;
  starting.forEach(p=>{ const el=fplElement(p.element); if(!el) return; const ep=parseFloat(el.ep_next||0); if(ep>bestEp){ bestEp=ep; best=el; } });
  if(!best) return null;
  const run = fplUpcomingFixtures(best.team, 1);
  const fdr = run ? run.avg : null;
  return { player: best, ep: bestEp, fdr, worth: bestEp>=8 && fdr!=null && fdr<=2.4 };
}

/* Worth wildcarding when a meaningful share of the squad has a materially
   better (>=1.5 xPts), affordable, fit replacement sitting in the player
   pool — the same real search fplTransferSuggestions() uses per slot, just
   counted across all 15 rather than picking the best one or two. */
function fplWildcardSignal(){
  if(!FPL.picks || !FPL.bootstrap) return null;
  const elements = FPL.bootstrap.elements || [];
  const squadIds = new Set((FPL.picks.picks||[]).map(p=>p.element));
  const bank = (FPL.picks.entry_history && FPL.picks.entry_history.bank) || 0;
  let meaningfulUpgrades = 0;
  (FPL.picks.picks||[]).forEach(pick=>{
    const cur = fplElement(pick.element);
    if(!cur) return;
    const budget = cur.now_cost + bank;
    const curEp = parseFloat(cur.ep_next||0);
    const clubCounts = fplClubCounts(cur.id);
    const hasUpgrade = elements.some(cand=>
      !squadIds.has(cand.id) && cand.element_type===cur.element_type && cand.status==="a" &&
      cand.now_cost<=budget && parseFloat(cand.ep_next||0)-curEp>=1.5 &&
      (clubCounts[cand.team]||0) < FPL_MAX_PER_CLUB);
    if(hasUpgrade) meaningfulUpgrades++;
  });
  return { meaningfulUpgrades, worth: meaningfulUpgrades>=5 };
}

/* Real blank/double-gameweek detection for this specific squad, from the
   same fixtures/ data used for the difficulty index — counts how many of
   the visitor's own 15 players have zero (blank) or two-plus (double)
   fixtures in the next gameweek. This is exactly the situation Free Hit
   (and, for doubles, Bench Boost/Triple Captain) exists for. */
function fplBlankDoubleForSquad(){
  if(!FPL.fixtures || !FPL.picks || !FPL.event) return null;
  const targetEvent = FPL.event + 1;
  const countByTeam = {};
  FPL.fixtures.filter(f=>f.event===targetEvent).forEach(f=>{
    countByTeam[f.team_h] = (countByTeam[f.team_h]||0)+1;
    countByTeam[f.team_a] = (countByTeam[f.team_a]||0)+1;
  });
  let blankPlayers=0, doublePlayers=0;
  (FPL.picks.picks||[]).forEach(p=>{
    const el = fplElement(p.element);
    if(!el) return;
    const c = countByTeam[el.team]||0;
    if(c===0) blankPlayers++; else if(c>=2) doublePlayers++;
  });
  return { targetEvent, blankPlayers, doublePlayers };
}

function fplChipRecommendations(){
  const chips = fplChipStatus();
  if(!chips) return [];
  const out = [];
  const bb = fplBenchBoostSignal();
  if(bb){
    const avail = chips.status.bboost.availableThisHalf;
    out.push({ chip:"Bench Boost", available:avail, worth: avail && bb.worth,
      body:`Your bench is projected for ${bb.benchEp.toFixed(1)} points this gameweek${bb.avgPast!=null?` (your own average is ${bb.avgPast.toFixed(1)})`:""}.` });
  }
  const tc = fplTripleCaptainSignal();
  if(tc){
    const avail = chips.status["3xc"].availableThisHalf;
    out.push({ chip:"Triple Captain", available:avail, worth: avail && tc.worth,
      body:`${tc.player.web_name} projects ${tc.ep.toFixed(1)} points next gameweek${tc.fdr!=null?` against a ${fplFixtureLabel(tc.fdr)} fixture (FDR ${tc.fdr.toFixed(1)})`:""}.` });
  }
  const wc = fplWildcardSignal();
  if(wc){
    const avail = chips.status.wildcard.availableThisHalf;
    out.push({ chip:"Wildcard", available:avail, worth: avail && wc.worth,
      body:`${wc.meaningfulUpgrades} of your 15 squad slots have a meaningfully better (≥1.5 xPts), affordable replacement available.` });
  }
  const bd = fplBlankDoubleForSquad();
  if(bd){
    const avail = chips.status.freehit.availableThisHalf;
    out.push({ chip:"Free Hit", available:avail, worth: avail && bd.blankPlayers>=3,
      body:`${bd.blankPlayers} of your 15 players have no fixture in Gameweek ${bd.targetEvent}${bd.doublePlayers?`, and ${bd.doublePlayers} have two`:""}.` });
  }
  return out;
}

/* FPL only allows ONE chip per gameweek — Wildcard/Free Hit/Bench Boost/
   Triple Captain can't be combined. When more than one clears its own bar
   the same week, this applies a disclosed priority so the app always
   recommends exactly one chip, never a combination that isn't legal:
   1. Free Hit — for the specific situation it exists for (a bad week of
      blanks), which no other chip fixes.
   2. Wildcard — a real structural rebuild opportunity (many meaningfully
      better options across the squad), worth more than a single week's
      Bench Boost/Triple Captain bump.
   3. Whichever of Bench Boost or Triple Captain has the larger real,
      directly comparable point value for this specific gameweek. */
function fplSingleChipDecision(){
  const chips = fplChipStatus();
  if(!chips) return null;
  const bd = fplBlankDoubleForSquad();
  const wc = fplWildcardSignal();
  const bb = fplBenchBoostSignal();
  const tc = fplTripleCaptainSignal();

  if(bd && chips.status.freehit.availableThisHalf && bd.blankPlayers>=3){
    return { chip:"Free Hit", reason:`${bd.blankPlayers} of your 15 players have no fixture in Gameweek ${bd.targetEvent} — exactly the situation Free Hit exists for.` };
  }
  if(wc && chips.status.wildcard.availableThisHalf && wc.worth){
    return { chip:"Wildcard", reason:`${wc.meaningfulUpgrades} of your 15 squad slots have a meaningfully better alternative — enough that a one-off rebuild is worth it.` };
  }
  const bbOk = bb && chips.status.bboost.availableThisHalf && bb.worth;
  const tcOk = tc && chips.status["3xc"].availableThisHalf && tc.worth;
  if(bbOk && tcOk){
    return bb.benchEp >= tc.ep
      ? { chip:"Bench Boost", reason:`Your bench (${bb.benchEp.toFixed(1)} projected points) is worth more than tripling your captain (+${tc.ep.toFixed(1)} extra) this week.` }
      : { chip:"Triple Captain", reason:`Tripling ${tc.player.web_name} (+${tc.ep.toFixed(1)} extra) is worth more than boosting your bench (${bb.benchEp.toFixed(1)} projected) this week.` };
  }
  if(bbOk) return { chip:"Bench Boost", reason:`Your bench is projected for ${bb.benchEp.toFixed(1)} points this gameweek.` };
  if(tcOk) return { chip:"Triple Captain", reason:`${tc.player.web_name} projects ${tc.ep.toFixed(1)} points against a favourable fixture.` };
  return null;
}

function fplChipCard(rec, isThePick){
  const statusLabel = !rec.available ? "Already used" : isThePick ? `▶ Play for GW${FPL.event+1}` : rec.worth ? "Eligible, not picked" : "Hold";
  return `<div class="pcard"><div class="pcard-top">
    <div class="pcard-nm">${rec.chip}</div><span class="pcard-stat">${statusLabel}</span></div>
    <p class="pcard-note">${rec.body}${!rec.available?" You've already played this chip this half of the season.":rec.worth&&!isThePick?" Cleared its own bar this week, but only one chip can be played — see the priority pick above.":""}</p></div>`;
}

/* ---------- Scout's Desk: a weekly briefing, a 10-second checklist, and a
   per-position in/out list, for the manual weekly check with nothing to
   hunt for. Built entirely from the same real functions above — this
   doesn't compute anything new, it just condenses what's already there to
   the top. ---------- */

function fplHealthChecklist(){
  const recs = fplRecommendations();
  const capRec = recs.find(r=>r.title.startsWith("Consider captaining"));
  const flagged = recs.filter(r=>r.title.endsWith("is flagged"));
  const transfers = fplTransferSuggestions();
  const chipPick = fplSingleChipDecision();
  return { capRec, flagged, transfers, chipPick };
}

function fplHealthChecklistHtml(){
  const h = fplHealthChecklist();
  const lines = [];
  lines.push(h.capRec
    ? `⚠️ ${h.capRec.body}`
    : `✅ Captaincy looks right — no better option in your starting XI.`);
  lines.push(h.flagged.length
    ? `⚠️ ${h.flagged.length} player${h.flagged.length>1?"s":""} flagged: ${h.flagged.map(f=>f.title.replace(" is flagged","")).join(", ")}.`
    : `✅ No injury/rotation flags on your starters.`);
  lines.push(h.transfers.length
    ? `🔁 ${h.transfers.length} transfer${h.transfers.length>1?"s":""} worth making for Gameweek ${FPL.event+1} — see below.`
    : `✅ No transfer for Gameweek ${FPL.event+1} clears the point cost — hold.`);
  lines.push(h.chipPick
    ? `🎴 Play now, for Gameweek ${FPL.event+1}: ${h.chipPick.chip}.`
    : `✅ No chip needed for Gameweek ${FPL.event+1} — save them.`);
  return `<div class="pcard">${lines.map(l=>`<p class="pcard-note">${l}</p>`).join("")}</div>`;
}

/* One real in/out pair per position, at a glance — every position with any
   real, affordable, fit upgrade shows it (the single best one for that
   position by expected-points gain), even when it doesn't clear the
   transfer-cost bar the main Suggested Transfers section requires. That bar
   still applies to whether it's worth USING a transfer on (shown via net),
   but a visitor asking "who's in and out for this position" gets a real
   answer either way instead of "no change needed" whenever nothing happens
   to be one of the (at most 2) squad-wide suggestions. */
function fplPositionSummary(){
  const groups = { GKP:[], DEF:[], MID:[], FWD:[] };
  (FPL.picks.picks||[]).forEach(p=>{
    const el = fplElement(p.element);
    if(!el) return;
    const pos = FPL_ELEMENT_POS[el.element_type];
    if(groups[pos]) groups[pos].push(el);
  });
  const ft = fplFreeTransfers();
  const candByOutId = {};
  fplTransferCandidates().forEach(c=>{ candByOutId[c.out.id] = c; });
  return Object.keys(groups).map(pos=>{
    const best = groups[pos].map(p=>candByOutId[p.id]).filter(Boolean).sort((a,b)=>b.gain-a.gain)[0] || null;
    let swap = null;
    if(best && ft){
      const cost = ft.chipActive ? 0 : (ft.remaining>0 ? 0 : 4);
      swap = { out: best.out, in: best.in, gain: best.gain, cost, net: best.gain - cost };
    }
    return { pos, players: groups[pos], swap };
  });
}

/* Club short-name tag next to a player's name, so a visitor never selects
   the wrong player among two with a similar first/last name — the FPL
   picks/entry data has no other way to disambiguate this in the UI. */
function fplClubTag(el){
  const t = el && fplTeamMeta(el.team);
  return t ? ` (${t.short_name})` : "";
}
function fplBankAfter(out, inEl){
  const bank = (FPL.picks.entry_history && FPL.picks.entry_history.bank) || 0;
  return bank - (inEl.now_cost - out.now_cost);
}
function fplSigned(n){ return `${n>=0?"+":""}${n.toFixed(1)}`; }
// Green "IN" / red "OUT" tags used everywhere a swap is shown, so it's obvious
// at a glance which player is arriving and which is leaving without reading text.
function fplInTag(){ return `<span style="color:#22c55e;font-weight:800">▲ IN</span>`; }
function fplOutTag(){ return `<span style="color:var(--live);font-weight:800">▼ OUT</span>`; }
function fplPositionSummaryHtml(){
  const groups = fplPositionSummary();
  return groups.map(g=>{
    const names = g.players.map(p=>`${p.web_name}${fplClubTag(p)}`).join(", ");
    let action = `<span class="note">No real upgrade found — hold.</span>`;
    if(g.swap){
      const bankAfter = fplBankAfter(g.swap.out, g.swap.in);
      const worthIt = g.swap.net > 0;
      action = `${fplOutTag()} ${g.swap.out.web_name}${fplClubTag(g.swap.out)} → ${fplInTag()} ${g.swap.in.web_name}${fplClubTag(g.swap.in)} <span class="pcard-stat" style="margin-left:6px">net ${fplSigned(g.swap.net)}</span><br>
        <span class="note">Bank after: £${(bankAfter/10).toFixed(1)}m${worthIt?"":" — gains points but doesn't clear the transfer-cost bar, so it's not in Suggested Transfers below"}</span>`;
    }
    return `<div class="pcard"><div class="pcard-nm">${POS_LABELS[g.pos==="GKP"?"GK":g.pos]||g.pos}</div>
      <p class="pcard-note">${names}</p>
      <p class="pcard-note">${action}</p></div>`;
  }).join("");
}

/* A short, plain-English weekly briefing — template-generated from the
   same real, already-computed values used everywhere else on this tab
   (projected points, fixture-difficulty labels, the top transfer
   suggestion, chip verdicts, the real Dream Team overlap). Same "Analyst's
   Desk" discipline as the rest of the app: every sentence traces back to a
   real number, nothing invented or guessed. */
function fplWeeklyBriefing(){
  const parts = [];
  const starting = (FPL.picks.picks||[]).filter(p=>p.position<=11);
  let projected = 0;
  starting.forEach(p=>{ const el=fplElement(p.element); if(el) projected += parseFloat(el.ep_next||0) * (p.multiplier||1); });
  parts.push(`Gameweek ${FPL.event}: your starting XI projects for around <b>${projected.toFixed(0)} points</b>, per FPL's own expected-points model.`);

  const runs = (FPL.picks.picks||[]).map(p=>{
    const el = fplElement(p.element); if(!el) return null;
    const run = fplUpcomingFixtures(el.team); return run ? { el, run } : null;
  }).filter(Boolean);
  const favourable = [...new Set(runs.filter(r=>fplFixtureLabel(r.run.avg)==="favourable").map(r=>r.el.web_name))];
  const tough = [...new Set(runs.filter(r=>fplFixtureLabel(r.run.avg)==="tough").map(r=>r.el.web_name))];
  if(favourable.length) parts.push(`${favourable.slice(0,3).join(", ")} ${favourable.length===1?"has":"have"} a favourable run of fixtures coming up.`);
  if(tough.length) parts.push(`${tough.slice(0,3).join(", ")} face${tough.length===1?"s":""} a tougher run — worth keeping an eye on.`);

  const suggestions = fplTransferSuggestions();
  if(suggestions.length){
    const top = suggestions[0];
    parts.push(`The strongest move for Gameweek ${FPL.event+1} is <b>${top.out.web_name} → ${top.in.web_name}</b>, worth a net +${top.net.toFixed(1)} points.`);
  }
  const chipPick = fplSingleChipDecision();
  if(chipPick) parts.push(`<b>${chipPick.chip}</b> looks worth playing for Gameweek ${FPL.event+1} — ${chipPick.reason}`);

  const dt = fplDreamTeamCompare();
  if(dt) parts.push(`${dt.matched.length} of your players made the official Gameweek ${dt.event} Dream Team.`);

  const h2h = fplHeadToHead();
  if(h2h){
    const diff = h2h.diff;
    parts.push(diff===0 ? `You're tied with ${h2h.rival.entry_name} in ${h2h.leagueName}.` : `You're ${diff>0?"ahead of":"behind"} ${h2h.rival.entry_name} by <b>${Math.abs(diff)} points</b> in ${h2h.leagueName}.`);
  } else {
    const league = fplLeagueSummary();
    if(league && league.entryRank) parts.push(`You're currently <b>#${league.entryRank}</b> in ${league.name}.`);
  }

  return parts.join(" ");
}

/* How this squad compared to the real, official highest-scoring XI last
   gameweek (FPL's own dream-team/{event}/ endpoint) — a genuine after-the-
   fact benchmark, not something this app computes or estimates itself. */
function fplDreamTeamCompare(){
  if(!FPL.dreamTeam || !FPL.picks) return null;
  const dreamIds = new Set((FPL.dreamTeam.team||[]).map(t=>t.element));
  const squadIds = (FPL.picks.picks||[]).map(p=>p.element);
  const matched = squadIds.filter(id=>dreamIds.has(id)).map(id=>fplElement(id)).filter(Boolean);
  return { event: FPL.dreamTeamEvent, total: dreamIds.size, matched };
}

/* Weekly comparison against the visitor's real mini-league (see
   fplPickLeague above) — the league's own name and every rank/points value
   below come straight from FPL's leagues-classic/{id}/standings/ endpoint
   and the visitor's own entry.leagues.classic record; nothing here is
   estimated. Standings are paginated by the FPL API (page 1 = roughly the
   top 50), so if the visitor isn't on that first page this only shows
   their real rank/total from their own entry record, not a fabricated row. */
// FPL.id is the string from the ID input; a standings row's entry is a real
// number from the API — compared as strings so "is this me" actually matches.
function fplIsMe(entryId){ return String(entryId)===String(FPL.id); }
function fplLeagueSummary(){
  if(!FPL.league) return null;
  const results = (FPL.leagueStandings && FPL.leagueStandings.standings && FPL.leagueStandings.standings.results) || [];
  const userRow = results.find(r=>fplIsMe(r.entry)) || null;
  return {
    name: FPL.league.name,
    entryRank: FPL.league.entry_rank || (userRow && userRow.rank) || null,
    entryLastRank: FPL.league.entry_last_rank || null,
    top: results.slice(0,5),
    userRow,
    loaded: !!FPL.leagueStandings
  };
}
/* A genuine 2-manager private league (e.g. a family league) is a head-to-head,
   not a standings table — shown as a direct you-vs-them comparison using the
   real total (season) and event_total (this gameweek, when the API includes
   it) fields from the same real standings response, rather than a generic
   top-5 list with just two rows in it. Never hardcodes a rival's name — it's
   whichever real second entry the league actually has. */
function fplHeadToHead(){
  const results = (FPL.leagueStandings && FPL.leagueStandings.standings && FPL.leagueStandings.standings.results) || [];
  if(results.length !== 2) return null;
  const me = results.find(r=>fplIsMe(r.entry));
  const rival = results.find(r=>!fplIsMe(r.entry));
  if(!me || !rival) return null;
  return { me, rival, diff: me.total - rival.total, leagueName: FPL.league && FPL.league.name };
}
function fplHeadToHeadHtml(){
  const h2h = fplHeadToHead();
  if(!h2h) return "";
  const { me, rival, diff } = h2h;
  const ahead = diff>0, tied = diff===0;
  const weekLine = (me.event_total!=null && rival.event_total!=null)
    ? `<p class="pcard-note">This gameweek: <b>${me.event_total}</b> vs <b>${rival.event_total}</b> (${rival.entry_name}).</p>` : "";
  return `<div class="pcard"><div class="pcard-nm">${h2h.leagueName || "Head-to-head"}</div>
    <div class="pcard-top"><div><div class="pcard-nm">You — ${me.entry_name}</div><div class="pcard-club">${me.player_name}</div></div><span class="pcard-stat">${me.total} pts</span></div>
    <div class="pcard-top"><div><div class="pcard-nm">${rival.entry_name}</div><div class="pcard-club">${rival.player_name}</div></div><span class="pcard-stat">${rival.total} pts</span></div>
    <p class="pcard-note">${tied?"Tied on points overall.":`${ahead?"You're":rival.entry_name+" is"} ahead by <b>${Math.abs(diff)} ${Math.abs(diff)===1?"point":"points"}</b> overall.`}</p>
    ${weekLine}</div>`;
}
function fplLeagueSummaryHtml(){
  const l = fplLeagueSummary();
  if(!l) return "";
  const h2h = fplHeadToHeadHtml();
  if(h2h) return h2h;
  let html = `<div class="banner">${l.entryRank?`Your rank: <b>#${l.entryRank}</b>${l.entryLastRank?` (was #${l.entryLastRank})`:""}`:"Your rank in this league isn't available this time."}</div>`;
  if(l.top.length){
    html += l.top.map(r=>{
      const mine = fplIsMe(r.entry);
      return `<div class="pcard"${mine?' style="border-color:var(--accent,#3b82f6)"':""}><div class="pcard-top">
        <div><div class="pcard-nm">${mine?"👉 ":""}${r.entry_name}</div><div class="pcard-club">${r.player_name}</div></div>
        <span class="pcard-stat">#${r.rank} · ${r.total} pts</span></div></div>`;
    }).join("");
    if(l.userRow && !l.top.some(r=>fplIsMe(r.entry))){
      html += `<div class="pcard" style="border-color:var(--accent,#3b82f6)"><div class="pcard-top">
        <div><div class="pcard-nm">👉 ${l.userRow.entry_name}</div><div class="pcard-club">${l.userRow.player_name}</div></div>
        <span class="pcard-stat">#${l.userRow.rank} · ${l.userRow.total} pts</span></div></div>`;
    }
  } else if(!l.loaded){
    html += `<p class="note">Couldn't load the full league table this time — tap Load again to retry.</p>`;
  }
  return html;
}

/* ---------- Track record (captain-call accuracy over time) ----------
   Not a self-tuning model — this app doesn't quietly adjust its own
   thresholds based on this log. It's an honest history: each week the
   captain suggestion is recorded, and once that gameweek actually
   finishes, real final scores (element-summary/{id}/'s per-round history)
   fill in what the suggested captain and the visitor's actual captain
   really scored, so accuracy is visible over time instead of asserted. */
function fplTrackKey(id){ return `fh_fpl_track_${id}`; }
function fplTrackLoad(id){ try{ return JSON.parse(localStorage.getItem(fplTrackKey(id))||"[]"); }catch(e){ return []; } }
function fplTrackSave(id, log){ try{ localStorage.setItem(fplTrackKey(id), JSON.stringify(log)); }catch(e){} }

function fplTrackRecordWeek(){
  if(!FPL.picks || !FPL.id || !FPL.event) return;
  const log = fplTrackLoad(FPL.id);
  if(log.some(e=>e.event===FPL.event)) return; // already logged this gameweek's call, don't overwrite it later
  const starting = (FPL.picks.picks||[]).filter(p=>p.position<=11);
  const capPick = starting.find(p=>p.is_captain);
  const actualEl = capPick && fplElement(capPick.element);
  if(!actualEl) return;
  let suggested = actualEl, bestEp = parseFloat(actualEl.ep_next||0);
  starting.forEach(p=>{ const el=fplElement(p.element); if(!el) return; const ep=parseFloat(el.ep_next||0); if(ep>bestEp){ bestEp=ep; suggested=el; } });
  log.push({ event:FPL.event, suggestedId:suggested.id, suggestedName:suggested.web_name,
    actualId:actualEl.id, actualName:actualEl.web_name, same:suggested.id===actualEl.id,
    resolved: suggested.id===actualEl.id, suggestedPts:null, actualPts:null });
  fplTrackSave(FPL.id, log);
}

async function fplTrackResolveOutstanding(){
  if(!FPL.bootstrap || !FPL.id) return false;
  const log = fplTrackLoad(FPL.id);
  const finishedEvents = new Set((FPL.bootstrap.events||[]).filter(e=>e.finished).map(e=>e.id));
  const pending = log.filter(e=>!e.resolved && finishedEvents.has(e.event));
  if(!pending.length) return false;
  let changed = false;
  for(const entry of pending){
    try{
      const [sHist, aHist] = await Promise.all([
        getJSON(fplProxyUrl(`element-summary/${entry.suggestedId}/`), 9000),
        getJSON(fplProxyUrl(`element-summary/${entry.actualId}/`), 9000)
      ]);
      const sRound = (sHist.history||[]).find(h=>h.round===entry.event);
      const aRound = (aHist.history||[]).find(h=>h.round===entry.event);
      if(sRound && aRound){
        entry.suggestedPts = sRound.total_points * 2; // captain multiplier
        entry.actualPts = aRound.total_points * 2;
        entry.resolved = true;
        changed = true;
      }
    }catch(e){ /* leave unresolved, try again next visit */ }
  }
  if(changed) fplTrackSave(FPL.id, log);
  return changed;
}

function fplTrackCard(entry){
  if(entry.same){
    return `<div class="pcard"><div class="pcard-top"><div class="pcard-nm">Gameweek ${entry.event}</div><span class="pcard-stat">Matched</span></div>
      <p class="pcard-note">Suggestion and your actual captain were the same: ${entry.actualName}.</p></div>`;
  }
  if(!entry.resolved){
    return `<div class="pcard"><div class="pcard-top"><div class="pcard-nm">Gameweek ${entry.event}</div><span class="pcard-stat">Pending</span></div>
      <p class="pcard-note">Suggested ${entry.suggestedName} over your captain ${entry.actualName} — result not final yet.</p></div>`;
  }
  const diff = entry.suggestedPts - entry.actualPts;
  const verdict = diff>0 ? `Suggestion would have scored ${diff} more` : diff<0 ? `Your captain outscored the suggestion by ${-diff}` : "Tied";
  return `<div class="pcard"><div class="pcard-top"><div class="pcard-nm">Gameweek ${entry.event}</div><span class="pcard-stat">${diff>0?"+":""}${diff}</span></div>
    <p class="pcard-note">Suggested ${entry.suggestedName} (${entry.suggestedPts} pts) vs your captain ${entry.actualName} (${entry.actualPts} pts) — ${verdict}.</p></div>`;
}

function fplPickCard(pick){
  const el = fplElement(pick.element);
  if(!el) return `<div class="pcard"><p class="pcard-note">Player data unavailable for this pick.</p></div>`;
  const team = fplTeamMeta(el.team);
  const tag = pick.is_captain ? " (C)" : pick.is_vice_captain ? " (VC)" : "";
  const flag = fplStatusFlag(el);
  const runText = fplFixtureRunText(el.team);
  return `<div class="pcard"><div class="pcard-top">
    <div><div class="pcard-nm">${el.web_name}${tag}</div><div class="pcard-club">${team?team.name:""} · ${FPL_ELEMENT_POS[el.element_type]||""}</div></div>
    <span class="pcard-stat">${el.ep_next?parseFloat(el.ep_next).toFixed(1)+" xPts":"–"}</span></div>
    ${flag?`<p class="pcard-note">⚠️ ${el.news || flag}</p>`:""}
    ${runText?`<p class="pcard-note">📅 ${runText}</p>`:""}</div>`;
}

function viewFantasyMyTeam(){
  const sid = storedFplId();
  let html = `<div class="fpl-form"><label for="fplIdInput">Your FPL Team ID</label>
    <div class="fpl-form-row"><input id="fplIdInput" class="fpl-input" inputmode="numeric" placeholder="e.g. 5933243" value="${sid?String(sid):""}" />
    <button class="chipbtn on" id="fplLoadBtn">Load</button></div>
    <p class="note">Find this in your team's URL on fantasy.premierleague.com — the number right after <code>/entry/</code>. Stored only in your browser, never sent anywhere but the official FPL site.</p></div>`;

  if(!sid && !FPL.id){
    html += `<div class="empty">Enter your team ID above to load your live squad and get recommendations.</div>`;
    return html;
  }
  if(FPL.loading){
    html += `<div class="empty">Loading your live team from the official Fantasy Premier League site…</div>`;
    return html;
  }
  if(FPL.error){
    const linkId = FPL.id || sid;
    html += `<div class="banner">${FPL.error}</div>
      <p class="note"><a href="https://fantasy.premierleague.com/entry/${linkId}/event/1" target="_blank" rel="noopener">View your team directly on fantasy.premierleague.com →</a></p>`;
    return html;
  }
  if(!FPL.picks || !FPL.bootstrap){
    html += `<div class="empty">Not loaded yet — click Load.</div>`;
    return html;
  }

  const entryName = FPL.entry && FPL.entry.name;
  const managerName = FPL.entry ? `${FPL.entry.player_first_name||""} ${FPL.entry.player_last_name||""}`.trim() : "";
  const eh = FPL.picks.entry_history || {};
  const gwPoints = eh.points;
  const overallRank = (FPL.entry && FPL.entry.summary_overall_rank) || eh.overall_rank;
  const squadValue = eh.value!=null ? (eh.value/10).toFixed(1) : null;
  const bankValue = eh.bank!=null ? (eh.bank/10).toFixed(1) : null;

  html += sectionHead(entryName || "Your FPL team", `Gameweek ${FPL.event}`);
  html += `<div class="banner">${managerName?`<b>${managerName}</b><br>`:""}${gwPoints!=null?`GW${FPL.event} points: <b>${gwPoints}</b>`:""}${overallRank?` · Overall rank: <b>${Number(overallRank).toLocaleString()}</b>`:""}${squadValue!=null?`<br>Squad value: <b>£${squadValue}m</b>${bankValue!=null?` · Bank: <b>£${bankValue}m</b>`:""}`:""}</div>`;

  html += fplAlfredHtml();
  html += sectionHead("Scout's Desk", `Gameweek ${FPL.event} briefing`);
  html += `<div class="analyst"><div class="analyst-head"><span class="analyst-badge">Scout's Desk</span></div>
    <div class="analyst-body">${fplWeeklyBriefing()}</div></div>`;
  html += fplHealthChecklistHtml();
  html += `<a class="launch-enter" style="display:block;text-align:center;text-decoration:none;margin:4px 0 14px" href="https://fantasy.premierleague.com/transfers" target="_blank" rel="noopener">Open FPL Transfers to make these changes →</a>`;
  html += fplPositionSummaryHtml();
  html += `<p class="note">Everything below repeats this in more detail — the sections above are all you need for a quick weekly check.</p>`;

  const recs = fplRecommendations();
  html += sectionHead("Recommendations", "from official FPL data");
  if(recs.length){
    recs.forEach(r=> html += `<div class="pcard"><div class="pcard-nm">${r.title}</div><p class="pcard-note">${r.body}</p></div>`);
  } else {
    html += `<p class="note">No changes suggested — your captain and starting XI already line up with the official expected-points model.</p>`;
  }

  html += sectionHead("Suggested transfers", "from official FPL data");
  const ft = fplFreeTransfers();
  if(ft){
    html += `<div class="banner">Free transfers available for Gameweek ${FPL.event+1}: <b>${ft.chipActive ? `unlimited (${ft.chipActive} active)` : ft.remaining}</b>${ft.chipActive?"":` — banked ${ft.atGwStart}, ${ft.usedThisGw} already used`}. Any transfer beyond that costs <b>4 points</b>, per the real 2026-27 FPL rules.</div>`;
    const suggestions = fplTransferSuggestions();
    if(suggestions.length){
      suggestions.forEach(s=> html += fplTransferCard(s));
      html += `<p class="note">Budget check uses each squad player's current market price as a stand-in for your actual sell value (FPL's exact sell price isn't in the public API and can run below market price after a rise). Among affordable options within ${FPL_EP_TOLERANCE} expected points of the best one for a slot, the cheapest is suggested — not always the priciest name — so a swap doesn't need to burn your whole budget. No suggestion would push any club above the real 3-players-per-club squad limit. Only swaps with a positive net gain after any point-hit are shown.</p>`;
    } else {
      const closest = fplClosestTransferCandidate();
      if(closest){
        html += fplTransferCard(closest);
        html += `<p class="note">Closest real option — shown so "no transfer worth it" isn't just silence — but it doesn't clear the bar: +${closest.gain.toFixed(1)} xPts${closest.cost?` − ${closest.cost}pt hit`:""} nets ${closest.net>0?"+":""}${closest.net.toFixed(1)}, not a real gain.</p>`;
      } else {
        html += `<p class="note">No transfer currently looks worth it once the point cost is factored in — no affordable, fit replacement beats any of your 15 players' expected points for Gameweek ${FPL.event+1}.</p>`;
      }
    }
  } else {
    html += `<p class="note">Couldn't work out your free transfers this time — your gameweek history didn't load from the FPL API. Tap Load again to retry.</p>`;
  }

  html += sectionHead("Chip strategy", "use sparingly");
  const chipRecs = fplChipRecommendations();
  const chipPickCard = fplSingleChipDecision();
  if(chipRecs.length){
    if(chipPickCard){
      html += `<div class="banner">🎴 Pick for Gameweek ${FPL.event+1}: <b>${chipPickCard.chip}</b> — ${chipPickCard.reason}</div>`;
    }
    chipRecs.forEach(r=> html += fplChipCard(r, chipPickCard && chipPickCard.chip===r.chip));
    html += `<p class="note">A chip you activate now applies to Gameweek ${FPL.event+1} — Gameweek ${FPL.event}'s points are already locked in, so nothing here changes what you already scored. You can only play one chip per gameweek, so when more than one clears its own bar the same week, this picks a single one for you by priority: Free Hit first (the exact situation it exists for — a bad week of blanks), then Wildcard (a structural rebuild worth more than one week's bump), then whichever of Bench Boost or Triple Captain has the larger real point value that week. Chips are also limited — 1 Wildcard, 1 Free Hit, 1 Bench Boost and 1 Triple Captain per half of the 2026-27 season (2 of each in total) — so this is a signal for your own judgement, not an automatic trigger.</p>`;
  } else {
    html += `<p class="note">Couldn't work out chip guidance this time — your gameweek history didn't load from the FPL API. Tap Load again to retry.</p>`;
  }

  const dt = fplDreamTeamCompare();
  if(dt){
    html += sectionHead("Vs. the real Dream Team", `Gameweek ${dt.event}`);
    if(dt.matched.length){
      html += `<div class="banner">${dt.matched.length} of ${dt.total} in the official Gameweek ${dt.event} Dream Team were in your squad: <b>${dt.matched.map(m=>m.web_name).join(", ")}</b>.</div>`;
    } else {
      html += `<div class="banner">None of your Gameweek ${dt.event} squad made the official Dream Team.</div>`;
    }
    html += `<p class="note">The Dream Team is FPL's own real highest-scoring XI for that gameweek, fetched after the fact — this is a benchmark, not a prediction.</p>`;
  } else if(FPL.dreamTeamEvent){
    html += sectionHead("Vs. the real Dream Team", `Gameweek ${FPL.dreamTeamEvent}`);
    html += `<p class="note">Couldn't load the official Dream Team this time — try tapping Load again.</p>`;
  }

  const league = fplLeagueSummary();
  if(league){
    html += sectionHead("Your mini-league", league.name);
    html += fplLeagueSummaryHtml();
    html += `<p class="note">From your real FPL leagues (entry.leagues.classic) — a private league is shown when you're in one, otherwise your first league. Standings are the official leagues-classic/${FPL.league.id}/standings/ table (first page, roughly the top 50); your own rank always comes from your real entry record even if you're further down the table.</p>`;
  } else if(FPL.entry){
    html += sectionHead("Your mini-league", "");
    html += `<p class="note">You're not in any FPL mini-leagues yet — join one on fantasy.premierleague.com to see a weekly comparison here.</p>`;
  }

  const trackLog = FPL.id ? fplTrackLoad(FPL.id).slice().sort((a,b)=>b.event-a.event) : [];
  if(trackLog.length){
    html += sectionHead("Track record", "captain calls");
    trackLog.slice(0,6).forEach(entry=> html += fplTrackCard(entry));
    html += `<p class="note">A history, not a self-tuning model — this app doesn't quietly change its own thresholds based on this log. Each week's captain suggestion is recorded, and once that gameweek finishes, real final scores fill in what actually happened, so you can judge accuracy for yourself over time.</p>`;
  }

  const picks = (FPL.picks.picks||[]).slice().sort((a,b)=>a.position-b.position);
  html += sectionHead("Starting XI");
  picks.filter(p=>p.position<=11).forEach(p=> html += fplPickCard(p));
  html += sectionHead("Bench");
  picks.filter(p=>p.position>11).forEach(p=> html += fplPickCard(p));

  html += `<p class="note">Squad, form, expected points ("xPts" = FPL's own <code>ep_next</code> model), injury/rotation flags, and each club's upcoming fixture difficulty ("FDR", 1 easiest–5 hardest) are all pulled live from the official Fantasy Premier League API. Recommendations and suggested transfers compare these real values across your own squad, the full player pool, and the real fixture schedule — not a separate prediction model this app invents.</p>`;
  return html;
}

function myTeamCard(name){
  const c = CLUB_BY_SHORT[name];
  if(!c) return `<div class="report"><div class="rp-title">${name}</div><p class="note">Not in a followed division this season.</p></div>`;
  const comp = c.comp, d = DATA[comp];
  const row = d.table.find(r=>clubName(r.name)===name);
  const last = lastResultFor(comp, c.full);
  const next = nextFixtureFor(comp, c.full);
  let html = `<div class="report"><div class="rp-head"><span class="rp-tag">${compLabel(comp)}</span>${row?`<span class="rp-when">Pos ${row.pos} · ${row.pts} pts</span>`:""}</div>
    <h3 class="rp-title">${crest(c.full,26)} ${name}</h3>`;
  if(last){
    const ft = ftOf(last);
    html += `<div class="rp-body"><p><b>Last result</b> (${last.round}, ${fmtDate(last.date)}): ${clubName(last.team1)} ${ft[0]}–${ft[1]} ${clubName(last.team2)}</p></div>`;
  }
  if(next){
    const ct = next.time ? ` · ${next.time} UK · ${fmtCentral(next.date, next.time)} Central` : "";
    html += `<div class="rp-body"><p><b>Next fixture</b>: ${clubName(next.team1)} vs ${clubName(next.team2)} — ${fmtDate(next.date)}${ct}</p>
      ${next.time?`<p class="subtle">${tvNote(comp)}</p>`:""}</div>${next.time?radioBlock(comp, next):""}`;
  } else {
    html += `<div class="rp-body"><p class="subtle">No fixtures loaded for ${name} yet.</p></div>`;
  }
  const newsFor = NEWS.items.filter(n=>n.clubs && n.clubs.includes(name));
  const liveNewsFor = (DATA.liveNews||[]).filter(n=> tagClubsInText(n.title+" "+(n.body||"")).includes(name));
  const transfersFor = TRANSFERS.deals.filter(t=>t.clubs && t.clubs.includes(name));
  if(newsFor.length || liveNewsFor.length || transfersFor.length){
    html += `<div class="rp-stats">`;
    liveNewsFor.slice(0,2).forEach(n=> html += `<span class="rp-chip">🔴 ${n.title}</span>`);
    newsFor.slice(0,2).forEach(n=> html += `<span class="rp-chip">📰 ${n.title}</span>`);
    transfersFor.slice(0,2).forEach(t=> html += `<span class="rp-chip">🔁 ${t.player} ${t.from===name?"→ "+t.to:"← "+t.from}</span>`);
    html += `</div>`;
  } else {
    html += `<p class="note">No club news tagged for ${name} yet — check back once announced.</p>`;
  }
  html += `</div>`;
  return html;
}
function viewMyTeams(){
  const favs = getFavs();
  if(!favs.length){
    return sectionHead("My Teams") +
      `<div class="empty">Follow your clubs to track their fixtures, results and news here — across the Premier League and Championship.<br><br>
      <button class="btn" id="myTeamsPick" style="max-width:220px;margin:0 auto">⭐ Choose your clubs</button></div>`;
  }
  let html = sectionHead("My Teams", `${favs.length} followed`);
  favs.forEach(name=> html += myTeamCard(name));
  html += `<button class="meta-link" id="myTeamsEdit">Edit your clubs →</button>`;
  return html;
}

function statusBadge(status){
  if(status.state==="live") return `<span class="chip" style="color:var(--live);border-color:#5a2030;font-weight:800">🔴 LIVE ${status.clock}</span>`;
  if(status.state==="ft") return `<span class="chip acc">FT</span>`;
  if(status.state==="pending") return `<span class="chip">Full-time · result pending</span>`;
  return `<span class="chip" style="color:var(--accent2)">Upcoming</span>`;
}
function lineupsNote(comp, status){
  if(status.state!=="live" && status.state!=="upcoming") return "";
  const url = comp==="epl" ? "https://www.premierleague.com/matchcentre" : "https://www.efl.com/clubs-and-fixtures/";
  return `<p class="note">👕 Starting lineups aren't in this app's results feed (it only carries full-time scores). Confirmed XIs are published around an hour before kickoff on the <a href="${url}" target="_blank" rel="noopener">official match centre</a>.</p>`;
}
function liveMatchCard(m, comp){
  const status = matchStatus(m);
  const home = clubName(m.team1), away = clubName(m.team2);
  const ft = ftOf(m);
  const meta = m.time ? `<div class="match-meta"><span>🕐 ${m.time} UK · ${fmtCentral(m.date, m.time)} Central</span><span>${tvNote(comp)}</span></div>` : "";
  const radio = (status.state==="live" || status.state==="upcoming") ? radioBlock(comp, m) : "";
  return `<div class="match ${status.state==='live'?'is-live-card':''}"><div class="top"><span>${compLabel(comp)} · ${m.round}</span>${statusBadge(status)}</div>
    <div class="rows">
      <div class="team"><span class="flag">${crest(m.team1,21)}</span><span class="name">${home}</span></div>
      <div class="score">${ft?ft[0]:"–"}</div>
      <div class="team"><span class="flag">${crest(m.team2,21)}</span><span class="name">${away}</span></div>
      <div class="score">${ft?ft[1]:"–"}</div>
    </div>${meta}${radio}${lineupsNote(comp, status)}
    <div class="analyst compact"><div class="analyst-head"><span class="analyst-badge">Analyst's Desk</span>${status.state==="live"?'<span class="analyst-live">LIVE</span>':""}</div>
      <div class="analyst-body">${commentaryFor(m, comp)}</div></div>
  </div>`;
}
function viewLive(){
  const todayIso = new Date().toISOString().slice(0,10);
  let html = sectionHead("Live & Today", "Central Time (Chicago)");
  html += `<p class="note">Kickoff-driven status &amp; clock — this app's results feed updates after full time, not per-minute in-play, so the "LIVE" clock is an estimate from the real kickoff time until a final score lands. See docs/FOOTBALL-HUB.md.</p>`;

  const uclMatches = (DATA.ucl && DATA.ucl.englishMatches) || [];
  const compsToday = [["epl", DATA.epl.matches], ["championship", DATA.championship.matches], ["ucl", uclMatches]];

  const today = [];
  compsToday.forEach(([comp, matches])=> matches.filter(m=>m.date===todayIso).forEach(m=> today.push({m,comp})));

  if(today.length){
    today.sort((a,b)=> (a.m.time||"99:99").localeCompare(b.m.time||"99:99"));
    today.forEach(({m,comp})=> html += liveMatchCard(m, comp));
  } else {
    html += `<div class="empty">No matches today.</div>`;
  }

  const upcoming = [];
  compsToday.forEach(([comp, matches])=>{
    const next = matches.find(m=>!m.score);
    if(next) upcoming.push({m:next, comp});
  });
  if(upcoming.length){
    html += sectionHead("Next up");
    upcoming.sort((a,b)=> (a.m.date+String(a.m.time||"")).localeCompare(b.m.date+String(b.m.time||"")));
    upcoming.forEach(({m,comp})=> html += liveMatchCard(m, comp));
  }
  if(!uclMatches.length){
    html += `<p class="note">🏆 Champions League: ${DATA.ucl?DATA.ucl.dataSource:"loading…"} — English clubs' matches will appear here automatically once published.</p>`;
  }
  return html;
}

const VIEWS = { today:viewToday, fantasy:viewFantasy, live:viewLive, myteams:viewMyTeams, news:viewNews, transfers:viewTransfers, table:viewTable, fixtures:viewFixtures, teams:viewTeams, ucl:viewUCL, odds:viewOdds };
const TAB_LABELS = { today:"Today", fantasy:"Fantasy", live:"Live", myteams:"My Teams", news:"News", transfers:"Transfers", table:"Table", fixtures:"Fixtures", teams:"Teams", ucl:"Champions League", odds:"Odds" };

const state = { view:"today", comp:"epl", fantasySub:"best" };

function render(){
  const fn = VIEWS[state.view];
  const el = document.getElementById("view");
  el.innerHTML = fn ? fn() : "";
  el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
  document.querySelectorAll(".tab").forEach(t=> t.classList.toggle("is-active", t.dataset.view===state.view));
  document.querySelectorAll(".navbtn[data-view]").forEach(b=> b.classList.toggle("on", b.dataset.view===state.view));
  document.getElementById("fxSearch")?.addEventListener("input", e=>{
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll("#fxList details").forEach(det=>{
      det.style.display = (!q || det.textContent.toLowerCase().includes(q)) ? "" : "none";
    });
  });
  document.querySelectorAll("[data-goto]").forEach(b=> b.addEventListener("click", ()=> setView(b.dataset.goto)));
  document.querySelectorAll("[data-comp]").forEach(b=> b.addEventListener("click", ()=>{ state.comp = b.dataset.comp; render(); }));
  document.querySelectorAll("[data-fsub]").forEach(b=> b.addEventListener("click", ()=>{ state.fantasySub = b.dataset.fsub; render(); }));
  document.getElementById("myTeamsPick")?.addEventListener("click", openFavSheet);
  document.getElementById("myTeamsEdit")?.addEventListener("click", openFavSheet);
  const fplBtn = document.getElementById("fplLoadBtn");
  if(fplBtn){
    const fire = ()=>{
      const v = document.getElementById("fplIdInput").value.trim();
      if(/^\d+$/.test(v)) loadFplTeam(v);
    };
    fplBtn.addEventListener("click", fire);
    document.getElementById("fplIdInput")?.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); fire(); } });
  }
  if(state.view==="fantasy" && state.fantasySub==="myteam"){
    const sid = storedFplId();
    if(sid && !FPL.loading && FPL.id!==sid) loadFplTeam(sid);
  }
  tickCountdowns();
}
function setView(v){ state.view = v; render(); window.scrollTo({top:0, behavior:"smooth"}); }

function setLivePill(){
  const pill = document.getElementById("livePill"), label = document.getElementById("liveLabel");
  const ok = DATA.epl.dataSource.startsWith("Live");
  pill.classList.toggle("ok", ok); pill.classList.toggle("warn", !ok);
  label.textContent = DATA.epl.dataSource;
}

/* ---------- Followed-club picker sheet ---------- */

function renderFavList(filter){
  const list = document.getElementById("favList");
  const q = (filter||"").toLowerCase();
  const favs = getFavs();
  list.style.display = "block";
  const groups = [
    {label:"Premier League", clubs: DATA.epl.currentClubs},
    {label:"Championship", clubs: DATA.championship.currentClubs}
  ];
  let html = "";
  groups.forEach(g=>{
    const items = g.clubs.filter(c=>!q || c.name.toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
    if(!items.length) return;
    html += `<div class="qual-head">${g.label}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px">`;
    items.forEach(c=> html += `<button class="fav-item ${favs.includes(c.name)?"on":""}" data-club="${c.name}">${crest(c.full,20)} ${c.name}</button>`);
    html += `</div>`;
  });
  list.innerHTML = html || `<div class="empty">No clubs match "${filter}"</div>`;
  list.querySelectorAll("[data-club]").forEach(btn=> btn.addEventListener("click", ()=>{
    toggleFav(btn.dataset.club);
    btn.classList.toggle("on");
    updateFavBtn();
    if(state.view==="myteams" || state.view==="today") render();
  }));
}
function openFavSheet(){ document.getElementById("favSheet").hidden = false; document.getElementById("favSearch").value = ""; renderFavList(""); }

function wireChrome(){
  document.querySelectorAll(".tab").forEach(t=> t.addEventListener("click", ()=> setView(t.dataset.view)));
  document.querySelectorAll(".navbtn[data-view]").forEach(b=> b.addEventListener("click", ()=> setView(b.dataset.view)));

  document.getElementById("favBtn").addEventListener("click", openFavSheet);
  document.getElementById("favClose").addEventListener("click", ()=> document.getElementById("favSheet").hidden = true);
  document.getElementById("favSearch").addEventListener("input", e=> renderFavList(e.target.value));
  updateFavBtn();

  const moreBtn = document.getElementById("moreBtn"), moreSheet = document.getElementById("moreSheet");
  const moreList = document.getElementById("moreList");
  moreList.innerHTML = Object.keys(TAB_LABELS).map(v=> `<button class="more-item" data-view="${v}">${TAB_LABELS[v]}</button>`).join("");
  moreList.querySelectorAll("[data-view]").forEach(b=> b.addEventListener("click", ()=>{ moreSheet.hidden=true; setView(b.dataset.view); }));
  moreBtn.addEventListener("click", ()=> moreSheet.hidden = false);
  document.getElementById("moreClose").addEventListener("click", ()=> moreSheet.hidden = true);

  const launch = document.getElementById("launch");
  let seen = false; try{ seen = localStorage.getItem("fh_launch_seen")==="1"; }catch(e){}
  if(!seen){ launch.hidden = false; }
  const closeLaunch = ()=>{ launch.hidden = true; try{ localStorage.setItem("fh_launch_seen","1"); }catch(e){} };
  document.getElementById("launchEnter").addEventListener("click", closeLaunch);
  document.getElementById("launchClose").addEventListener("click", closeLaunch);
}

const DYNAMIC_VIEWS = ["live","today"];

async function init(){
  wireChrome();
  try{
    await loadData();
  }catch(e){
    document.getElementById("view").innerHTML = `<div class="empty">Couldn't load Football Hub data. Check your connection and reload.</div>`;
    return;
  }
  setLivePill();
  render();

  setInterval(tickCountdowns, 1000);
  setInterval(()=>{ if(DYNAMIC_VIEWS.includes(state.view)) render(); }, 20000);
  setInterval(async ()=>{
    try{ await loadData(); setLivePill(); if(DYNAMIC_VIEWS.includes(state.view)) render(); }catch(e){}
  }, 60000);
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("visibilitychange", ()=>{
  if(!document.hidden && DATA.epl) loadData().then(()=>{ setLivePill(); render(); }).catch(()=>{});
});
