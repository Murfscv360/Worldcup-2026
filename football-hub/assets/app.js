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
function compLabel(comp){ return comp==="epl" ? "Premier League" : "Championship"; }

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
  return comp==="epl"
    ? "📺 Peacock · marquee matches also on NBC/USA Network (US)"
    : "📺 Paramount+ · marquee matches also on CBS Sports Network (US)";
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
  return `<div class="report"><div class="rp-head"><span class="rp-tag">${n.tag}</span><span class="rp-when">${fmtDate(n.date)}</span></div>
    <h3 class="rp-title">${n.title}</h3><div class="rp-body"><p>${n.body}</p></div></div>`;
}
function viewNews(){
  let html = sectionHead("Newsroom", `${NEWS.items.length} stories`);
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
let FPL = { id:null, event:null, loading:false, error:null, bootstrap:null, entry:null, picks:null, history:null };

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
  FPL = { id, event: FPL.event, loading:true, error:null, bootstrap:null, entry:null, picks:null, history:null };
  try{ localStorage.setItem(FPL_KEY, id); }catch(e){}
  if(state.view==="fantasy") render();
  try{
    const bootstrap = await getJSON(fplProxyUrl("bootstrap-static/"), 9000);
    const events = bootstrap.events || [];
    const current = events.find(e=>e.is_current) || events.slice().reverse().find(e=>e.finished) || events[0];
    const event = current ? current.id : 1;
    const [entry, picks, history] = await Promise.all([
      getJSON(fplProxyUrl(`entry/${id}/`), 9000).catch(()=>null),
      getJSON(fplProxyUrl(`entry/${id}/event/${event}/picks/`), 9000),
      getJSON(fplProxyUrl(`entry/${id}/history/`), 9000).catch(()=>null)
    ]);
    FPL.bootstrap = bootstrap; FPL.entry = entry; FPL.picks = picks; FPL.event = event; FPL.history = history;
  }catch(e){
    FPL.error = "Couldn't load your live team right now — either the team ID doesn't exist, or the Fantasy Premier League site is temporarily unreachable. Double-check the ID and try again.";
  }
  FPL.loading = false;
  if(state.view==="fantasy") render();
}

function fplElement(id){ return FPL.bootstrap && (FPL.bootstrap.elements||[]).find(e=>e.id===id); }
function fplTeamMeta(id){ return FPL.bootstrap && (FPL.bootstrap.teams||[]).find(t=>t.id===id); }
function fplStatusFlag(el){
  if(!el) return "";
  const labels = { d:"Doubtful", i:"Injured", s:"Suspended", u:"Unavailable", n:"Not available" };
  if(el.status && el.status!=="a" && labels[el.status]) return labels[el.status];
  if(el.chance_of_playing_next_round!=null && el.chance_of_playing_next_round<100) return `${el.chance_of_playing_next_round}% chance of playing`;
  return "";
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
  if(!h || !picks || !picks.entry_history || !event || event < 2) return null;
  const chipByEvent = {};
  (h.chips||[]).forEach(c=>{ chipByEvent[c.event] = c.name; });
  let free = 1; // baseline: everyone gets 1 free transfer entering Gameweek 2
  (h.current||[]).filter(r=>r.event>=2 && r.event<event).sort((a,b)=>a.event-b.event).forEach(r=>{
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
   profit-taking rule — isn't in the public, unauthenticated API. */
function fplTransferSuggestions(){
  if(!FPL.picks || !FPL.bootstrap) return [];
  const ft = fplFreeTransfers();
  if(!ft) return [];
  const elements = FPL.bootstrap.elements || [];
  const squadIds = new Set((FPL.picks.picks||[]).map(p=>p.element));
  const bank = (FPL.picks.entry_history && FPL.picks.entry_history.bank) || 0;

  const candidates = [];
  (FPL.picks.picks||[]).forEach(pick=>{
    const cur = fplElement(pick.element);
    if(!cur) return;
    const budget = cur.now_cost + bank;
    const curEp = parseFloat(cur.ep_next||0);
    let best = null, bestEp = curEp;
    elements.forEach(cand=>{
      if(squadIds.has(cand.id) || cand.element_type!==cur.element_type || cand.status!=="a" || cand.now_cost>budget) return;
      const ep = parseFloat(cand.ep_next||0);
      if(ep > bestEp){ bestEp = ep; best = cand; }
    });
    if(best) candidates.push({ out: cur, in: best, gain: bestEp - curEp });
  });

  candidates.sort((a,b)=> b.gain - a.gain);
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

function fplTransferCard(s){
  const outTeam = fplTeamMeta(s.out.team), inTeam = fplTeamMeta(s.in.team);
  return `<div class="pcard"><div class="pcard-top">
    <div><div class="pcard-nm">${s.out.web_name} → ${s.in.web_name}</div><div class="pcard-club">${outTeam?outTeam.name:""} → ${inTeam?inTeam.name:""}</div></div>
    <span class="pcard-stat">net +${s.net.toFixed(1)}</span></div>
    <p class="pcard-note">+${s.gain.toFixed(1)} xPts next GW${s.cost?` − ${s.cost}pt hit`:""} = <b>+${s.net.toFixed(1)} net</b></p></div>`;
}

function fplPickCard(pick){
  const el = fplElement(pick.element);
  if(!el) return `<div class="pcard"><p class="pcard-note">Player data unavailable for this pick.</p></div>`;
  const team = fplTeamMeta(el.team);
  const tag = pick.is_captain ? " (C)" : pick.is_vice_captain ? " (VC)" : "";
  const flag = fplStatusFlag(el);
  return `<div class="pcard"><div class="pcard-top">
    <div><div class="pcard-nm">${el.web_name}${tag}</div><div class="pcard-club">${team?team.name:""} · ${FPL_ELEMENT_POS[el.element_type]||""}</div></div>
    <span class="pcard-stat">${el.ep_next?parseFloat(el.ep_next).toFixed(1)+" xPts":"–"}</span></div>
    ${flag?`<p class="pcard-note">⚠️ ${el.news || flag}</p>`:""}</div>`;
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
  const gwPoints = FPL.picks.entry_history && FPL.picks.entry_history.points;
  const overallRank = (FPL.entry && FPL.entry.summary_overall_rank) || (FPL.picks.entry_history && FPL.picks.entry_history.overall_rank);

  html += sectionHead(entryName || "Your FPL team", `Gameweek ${FPL.event}`);
  html += `<div class="banner">${managerName?`<b>${managerName}</b><br>`:""}${gwPoints!=null?`GW${FPL.event} points: <b>${gwPoints}</b>`:""}${overallRank?` · Overall rank: <b>${Number(overallRank).toLocaleString()}</b>`:""}</div>`;

  const recs = fplRecommendations();
  html += sectionHead("Recommendations", "from official FPL data");
  if(recs.length){
    recs.forEach(r=> html += `<div class="pcard"><div class="pcard-nm">${r.title}</div><p class="pcard-note">${r.body}</p></div>`);
  } else {
    html += `<p class="note">No changes suggested — your captain and starting XI already line up with the official expected-points model.</p>`;
  }

  const ft = fplFreeTransfers();
  if(ft){
    html += sectionHead("Suggested transfers", "from official FPL data");
    html += `<div class="banner">Free transfers available: <b>${ft.chipActive ? `unlimited (${ft.chipActive} active)` : ft.remaining}</b>${ft.chipActive?"":` — banked ${ft.atGwStart}, ${ft.usedThisGw} used so far this gameweek`}. Any transfer beyond that costs <b>4 points</b>, per the real 2026-27 FPL rules.</div>`;
    const suggestions = fplTransferSuggestions();
    if(suggestions.length){
      suggestions.forEach(s=> html += fplTransferCard(s));
      html += `<p class="note">Budget check uses each squad player's current market price as a stand-in for your actual sell value (FPL's exact sell price isn't in the public API and can run below market price after a rise). Only swaps with a positive net gain after any point-hit are shown.</p>`;
    } else {
      html += `<p class="note">No transfer currently looks worth it once the point cost is factored in.</p>`;
    }
  }

  const picks = (FPL.picks.picks||[]).slice().sort((a,b)=>a.position-b.position);
  html += sectionHead("Starting XI");
  picks.filter(p=>p.position<=11).forEach(p=> html += fplPickCard(p));
  html += sectionHead("Bench");
  picks.filter(p=>p.position>11).forEach(p=> html += fplPickCard(p));

  html += `<p class="note">Squad, form, expected points ("xPts" = FPL's own <code>ep_next</code> model) and injury/rotation flags are pulled live from the official Fantasy Premier League API. Recommendations and suggested transfers compare real values across your own squad and the full player pool — not a separate prediction model.</p>`;
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
  const transfersFor = TRANSFERS.deals.filter(t=>t.clubs && t.clubs.includes(name));
  if(newsFor.length || transfersFor.length){
    html += `<div class="rp-stats">`;
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

  const today = [];
  ["epl","championship"].forEach(comp=> DATA[comp].matches.filter(m=>m.date===todayIso).forEach(m=> today.push({m,comp})));

  if(today.length){
    today.sort((a,b)=> (a.m.time||"99:99").localeCompare(b.m.time||"99:99"));
    today.forEach(({m,comp})=> html += liveMatchCard(m, comp));
  } else {
    html += `<div class="empty">No matches today.</div>`;
  }

  const upcoming = [];
  ["epl","championship"].forEach(comp=>{
    const next = DATA[comp].matches.find(m=>!m.score);
    if(next) upcoming.push({m:next, comp});
  });
  if(upcoming.length){
    html += sectionHead("Next up");
    upcoming.sort((a,b)=> (a.m.date+String(a.m.time||"")).localeCompare(b.m.date+String(b.m.time||"")));
    upcoming.forEach(({m,comp})=> html += liveMatchCard(m, comp));
  }
  return html;
}

const VIEWS = { today:viewToday, live:viewLive, myteams:viewMyTeams, news:viewNews, transfers:viewTransfers, table:viewTable, fixtures:viewFixtures, teams:viewTeams, ucl:viewUCL, odds:viewOdds, fantasy:viewFantasy };
const TAB_LABELS = { today:"Today", live:"Live", myteams:"My Teams", news:"News", transfers:"Transfers", table:"Table", fixtures:"Fixtures", teams:"Teams", ucl:"Champions League", odds:"Odds", fantasy:"Fantasy" };

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
