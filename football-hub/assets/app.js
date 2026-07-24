/* Football Hub — Premier League + Championship + Champions League
   League results/tables: openfootball/football.json (public domain), fetched live in-browser
   with a same-origin-safe fallback chain. Club meta, transfers, news and title odds are
   hand-curated, dated snapshots — see data/*.json headers and docs/FOOTBALL-HUB.md. */
'use strict';

/* ---------- Competitions ---------- */

const COMPS = {
  epl: {
    key: "epl", label: "Premier League",
    remoteCurrent: "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/en.1.json",
    remotePrev:    "https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/en.1.json",
    localMatches:  "data/epl-2025-26.json",
    localMeta:     "data/epl.json"
  },
  championship: {
    key: "championship", label: "Championship",
    remoteCurrent: "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/en.2.json",
    remotePrev:    "https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/en.2.json",
    localMatches:  "data/championship-2025-26.json",
    localMeta:     "data/championship.json"
  }
};

const DATA = {};          // DATA[compKey] = {meta, matches, leagueMatches, table, seasonLabel, dataSource, currentClubs}
let EPL = null, CHA = null, UCL = null, NEWS = null, TRANSFERS = null;
let CLUB_BY_FULL = {};    // "Arsenal FC" -> club meta (comp-agnostic, covers any club in either feed)
let CLUB_BY_SHORT = {};   // "Arsenal" -> club meta (this season's 44 clubs, comp-correct)

function fetchT(url, ms){
  let ctrl, timer;
  try{ ctrl = new AbortController(); timer = setTimeout(()=>ctrl.abort(), ms||8000); }catch(e){ ctrl = null; }
  return fetch(url, {cache:"no-store", signal:ctrl?ctrl.signal:undefined}).finally(()=>{ if(timer) clearTimeout(timer); });
}
async function getJSON(url, ms){ const r = await fetchT(url, ms); if(!r.ok) throw new Error(String(r.status)); return r.json(); }

function computeTable(matches){
  const teams = {};
  const row = t => teams[t] || (teams[t] = {name:t, p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0});
  matches.forEach(x=>{
    const sc = x.score; const ft = Array.isArray(sc) ? sc : (sc && sc.ft);
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

async function loadCompetition(comp){
  const meta = await getJSON(comp.localMeta);
  let matches, seasonLabel, dataSource;
  try{
    const d = await getJSON(comp.remoteCurrent, 6000);
    matches = d.matches; seasonLabel = "2026-27"; dataSource = "Live data (2026-27 in progress)";
  }catch(e1){
    try{
      const d = await getJSON(comp.remotePrev, 6000);
      matches = d.matches; seasonLabel = "2025-26"; dataSource = "Live network (2025-26 final)";
    }catch(e2){
      const d = await getJSON(comp.localMatches, 6000);
      matches = d.matches; seasonLabel = "2025-26"; dataSource = "Offline snapshot (2025-26 final)";
    }
  }
  const leagueMatches = matches.filter(m=> m.round !== "Playoffs");
  const table = computeTable(leagueMatches);
  return { meta, matches, leagueMatches, table, seasonLabel, dataSource };
}

async function loadData(){
  [NEWS, TRANSFERS, UCL] = await Promise.all([getJSON("data/news.json"), getJSON("data/transfers.json"), getJSON("data/ucl.json")]);
  const [eplData, chaData] = await Promise.all([loadCompetition(COMPS.epl), loadCompetition(COMPS.championship)]);
  DATA.epl = eplData; DATA.championship = chaData;
  EPL = eplData.meta; CHA = chaData.meta;

  CLUB_BY_FULL = {};
  EPL.clubs.forEach(c => CLUB_BY_FULL[c.full] = c);
  EPL.promoted2627.forEach(c => CLUB_BY_FULL[c.full] = c);
  CHA.clubs.forEach(c => CLUB_BY_FULL[c.full] = c);

  DATA.epl.currentClubs = EPL.clubs.filter(c=>!c.relegated).concat(EPL.promoted2627).map(c=>({...c, comp:"epl"}));
  DATA.championship.currentClubs = CHA.clubs.concat(EPL.clubs.filter(c=>c.relegated)).map(c=>({...c, comp:"championship"}));

  CLUB_BY_SHORT = {};
  DATA.epl.currentClubs.concat(DATA.championship.currentClubs).forEach(c=> CLUB_BY_SHORT[c.name] = c);
}

function seasonState(){
  const today = new Date("2026-07-24T00:00:00Z"); // stamped app-open date; see docs/FOOTBALL-HUB.md
  const opener = new Date(EPL.season2627.openingMatch.date + "T00:00:00Z");
  if(DATA.epl.seasonLabel === "2026-27" && DATA.epl.matches.some(m=>m.score)) return "in-season";
  if(today < opener) return "preseason";
  return "in-season";
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
  const now = new Date("2026-07-24T00:00:00Z");
  const target = new Date(iso + "T00:00:00Z");
  return Math.max(0, Math.round((target-now)/86400000));
}
function countdownBoxes(iso){
  const days = daysUntil(iso);
  const weeks = Math.floor(days/7), rem = days%7;
  return `<div class="countdown">
    <div class="cd-box"><b>${days}</b><span>Days</span></div>
    <div class="cd-box"><b>${weeks}</b><span>Weeks</span></div>
    <div class="cd-box"><b>${rem}</b><span>+ Days</span></div>
  </div>`;
}
function ftOf(m){ const sc = m.score; return sc ? (Array.isArray(sc)?sc:sc.ft) : null; }

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

  if(favs.length){
    html += sectionHead("My Teams", `${favs.length} followed`);
    html += `<div class="perf">`;
    favs.slice(0,4).forEach(name=>{
      const c = CLUB_BY_SHORT[name]; if(!c) return;
      const d = DATA[c.comp];
      const row = d.table.find(r=>clubName(r.name)===name);
      html += `<div class="perf-row">${crest(c.full,24)}<div class="perf-nm">${name}</div><div class="perf-pts" style="grid-column:span 2"><small>${compLabel(c.comp)}${row?` · Pos ${row.pos}, ${row.pts} pts`:""}</small></div></div>`;
    });
    html += `</div><button class="meta-link" data-goto="myteams">See My Teams →</button>`;
  }

  html += `<div class="champ won"><span class="champ-trophy">🏆</span><div>
      <div class="champ-label">2025-26 Premier League Champions</div>
      <div class="champ-team">Arsenal</div>
    </div><span class="champ-tag won">${EPL.lastSeason.championNote.split(",")[0]}</span></div>`;

  if(seasonSt==="preseason"){
    html += sectionHead("Season kicks off", `${fmtDate(EPL.season2627.openingMatch.date)}`);
    html += `<div class="banner"><b>${EPL.season2627.openingMatch.home} vs ${EPL.season2627.openingMatch.away}</b> — ${EPL.season2627.openingMatch.venue}<br>${EPL.season2627.openingMatch.note}</div>`;
    html += countdownBoxes(EPL.season2627.openingMatch.date);
    html += `<div class="match"><div class="top"><span>Community Shield</span><span>${fmtDate(EPL.season2627.communityShield.date)}</span></div>
      <div class="rows"><div class="team"><span class="flag">${crest(CLUB_BY_FULL["Arsenal FC"]?.full||"",21)}</span><span class="name">${EPL.season2627.communityShield.home}</span></div><div></div></div>
      <div class="rows"><div class="team"><span class="flag">${crest(CLUB_BY_FULL["Manchester City FC"]?.full||"",21)}</span><span class="name">${EPL.season2627.communityShield.away}</span></div><div></div></div>
      <div class="foot"><span>${EPL.season2627.communityShield.venue}</span><span>${EPL.season2627.communityShield.note}</span></div></div>
      <p class="subtle">The Championship follows the same close-season calendar — see the Fixtures tab for details.</p>`;
  } else {
    html += sectionHead("Latest results", "Premier League");
    DATA.epl.matches.filter(m=>m.score).slice(-5).reverse().forEach(m=> html += matchCard(m));
  }

  html += sectionHead("Newsroom", "latest");
  NEWS.items.slice(0,3).forEach(n=> html += newsCard(n));
  html += `<button class="meta-link" data-goto="news">See all news →</button>`;

  html += sectionHead("Transfer window", `closes ${fmtDate(TRANSFERS.windowCloses)}`);
  TRANSFERS.deals.slice(0,3).forEach(d=> html += transferCard(d));
  html += `<button class="meta-link" data-goto="transfers">See all transfers →</button>`;

  return html;
}

function matchCard(m){
  const home = clubName(m.team1), away = clubName(m.team2);
  const ft = ftOf(m);
  return `<div class="match"><div class="top"><span>${m.round}</span><span>${fmtDate(m.date)}</span></div>
    <div class="rows">
      <div class="team ${ft && ft[0]>ft[1]?"win":ft && ft[0]<ft[1]?"loss":""}"><span class="flag">${crest(m.team1,21)}</span><span class="name">${home}</span></div>
      <div class="score">${ft?ft[0]:"–"}</div>
      <div class="team ${ft && ft[1]>ft[0]?"win":ft && ft[1]<ft[0]?"loss":""}"><span class="flag">${crest(m.team2,21)}</span><span class="name">${away}</span></div>
      <div class="score">${ft?ft[1]:"–"}</div>
    </div></div>`;
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
    return `<tr class="${z.cls}"><td class="pos">${r.pos}</td><td class="t">${crest(r.name,18)} ${clubName(r.name)}${chip}</td>
      <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd>0?"+":""}${r.gd}</td><td class="pts">${r.pts}</td></tr>`;
  }).join("");
}
function viewTable(){
  const comp = state.comp, d = DATA[comp];
  const label = d.seasonLabel==="2026-27" ? "2026-27 (live)" : `${d.meta.lastSeason.year} — final`;
  let html = compSwitcher();
  html += sectionHead(`${compLabel(comp)} table`, label);
  html += `<div class="gcard"><table class="stand">
    <thead><tr><th>#</th><th style="text-align:left">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
    <tbody>${tableRows(d.table, comp)}</tbody></table></div>`;
  html += comp==="epl"
    ? `<div class="vmeta" style="margin:10px 2px"><span class="chip acc">Champions League (top 5)</span><span class="chip">Europa / Conference (6-7)</span><span class="chip" style="color:var(--live);border-color:#5a2030">Relegation (18-20)</span></div>`
    : `<div class="vmeta" style="margin:10px 2px"><span class="chip acc">Automatic promotion (top 2)</span><span class="chip">Play-offs (3-6)</span><span class="chip" style="color:var(--live);border-color:#5a2030">Relegation (bottom 3)</span></div>`;
  if(d.seasonLabel!=="2026-27"){
    html += `<p class="note">Showing the final ${d.meta.lastSeason.year} table (real, computed from all ${d.leagueMatches.length} league match results${comp==="championship"?"; play-off results shown separately below and don't affect these standings":""}). This switches automatically to the live 2026-27 table once the new season's results feed is published — no app update needed.</p>`;
  }
  if(comp==="championship" && d.meta.lastSeason.playoffWinner){
    html += `<div class="banner"><b>Play-off winners: ${d.meta.lastSeason.playoffWinner.club}</b><br>${d.meta.lastSeason.playoffWinner.note}</div>`;
  }
  return html;
}

function viewFixtures(){
  const comp = state.comp, d = DATA[comp];
  let html = compSwitcher();
  html += sectionHead(`${compLabel(comp)} 2026-27 calendar`, "confirmed dates");
  if(comp==="epl"){
    html += `<div class="match"><div class="top"><span>Community Shield</span><span>${fmtDate(EPL.season2627.communityShield.date)}</span></div>
      <div class="rows"><div class="team"><span class="name">${EPL.season2627.communityShield.home} vs ${EPL.season2627.communityShield.away}</span></div></div>
      <div class="foot"><span>${EPL.season2627.communityShield.venue}</span></div></div>`;
    html += `<div class="match"><div class="top"><span>${EPL.season2627.openingMatch.note.split(";")[0]}</span><span>${fmtDate(EPL.season2627.openingMatch.date)}</span></div>
      <div class="rows"><div class="team"><span class="name">${EPL.season2627.openingMatch.home} vs ${EPL.season2627.openingMatch.away}</span></div></div>
      <div class="foot"><span>${EPL.season2627.openingMatch.venue}</span></div></div>`;
    html += `<p class="note">Fixtures released ${fmtDate(EPL.season2627.fixturesReleased)}. The full 380-match list isn't republished here to avoid presenting unverified pairings as fact — see docs/FOOTBALL-HUB.md. This tab switches to the live 2026-27 fixture/results feed automatically once openfootball publishes it.</p>`;
  } else {
    html += `<p class="note">${CHA.season2627.note}</p>`;
  }

  html += sectionHead(`${d.meta.lastSeason.year} results archive`, `${d.matches.length} matches`);
  html += `<input id="fxSearch" placeholder="Filter by club…" style="width:100%;background:var(--card);border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:9px 11px;font-size:13px;font-weight:600;margin-bottom:10px" />`;
  const rounds = {};
  d.matches.forEach(m=>{ (rounds[m.round] = rounds[m.round]||[]).push(m); });
  html += `<div id="fxList">`;
  Object.keys(rounds).forEach(rnd=>{
    html += `<details class="pbp"><summary>${rnd}<span class="pbp-meta">${rounds[rnd].length} matches</span></summary><div style="padding:6px 14px 12px">`;
    rounds[rnd].forEach(m=> html += matchCard(m));
    html += `</div></details>`;
  });
  html += `</div>`;
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

  html += sectionHead("Weekend match predictions");
  const seasonSt = seasonState();
  if(seasonSt==="preseason"){
    html += `<div class="empty">Weekly 1X2 match predictions unlock automatically once the 2026-27 fixture list goes live — check back after ${fmtDate(EPL.season2627.openingMatch.date)}.</div>`;
  } else {
    const upcoming = DATA.epl.matches.filter(m=>!m.score).slice(0,10);
    if(!upcoming.length){
      html += `<div class="empty">No upcoming fixtures loaded yet.</div>`;
    } else {
      upcoming.forEach(m=>{
        html += `<div class="lodds"><div class="lo-top"><b>${clubName(m.team1)}</b> vs <b>${clubName(m.team2)}</b><span>${fmtDate(m.date)}</span></div>
          <div class="lo-3"><div class="lo-cell"><div class="lc-k">Home</div><div class="lc-v">–</div></div>
          <div class="lo-cell"><div class="lc-k">Draw</div><div class="lc-v">–</div></div>
          <div class="lo-cell"><div class="lc-k">Away</div><div class="lc-v">–</div></div></div></div>`;
      });
    }
    html += `<p class="note">Modeled, informational only — not a real betting market.</p>`;
  }
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
    html += `<div class="rp-body"><p><b>Next fixture</b>: ${clubName(next.team1)} vs ${clubName(next.team2)} — ${fmtDate(next.date)}</p></div>`;
  } else if(comp==="epl" && name==="Arsenal"){
    html += `<div class="rp-body"><p><b>Next fixture</b>: vs Coventry City — ${fmtDate(EPL.season2627.openingMatch.date)} (season opener)</p></div>`;
  } else {
    html += `<div class="rp-body"><p class="subtle">Next fixture: confirmed once the ${compLabel(comp)} 2026-27 calendar goes live.</p></div>`;
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

const VIEWS = { today:viewToday, myteams:viewMyTeams, news:viewNews, transfers:viewTransfers, table:viewTable, fixtures:viewFixtures, teams:viewTeams, ucl:viewUCL, odds:viewOdds };
const TAB_LABELS = { today:"Today", myteams:"My Teams", news:"News", transfers:"Transfers", table:"Table", fixtures:"Fixtures", teams:"Teams", ucl:"Champions League", odds:"Odds" };

const state = { view:"today", comp:"epl" };

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
  document.getElementById("myTeamsPick")?.addEventListener("click", openFavSheet);
  document.getElementById("myTeamsEdit")?.addEventListener("click", openFavSheet);
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
}

document.addEventListener("DOMContentLoaded", init);
