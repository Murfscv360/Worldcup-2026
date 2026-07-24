/* Football Hub — Premier League + Champions League
   EPL results/table: openfootball/football.json (public domain), fetched live in-browser
   with a same-origin-safe fallback chain. Club meta, transfers, news and title odds are
   hand-curated, dated snapshots — see data/*.json headers and docs/FOOTBALL-HUB.md. */
'use strict';

/* ---------- Data loading ---------- */

const REMOTE_CURRENT = "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/en.1.json";
const REMOTE_PREV     = "https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/en.1.json";
const LOCAL_MATCHES   = "data/epl-2025-26.json";
const LOCAL_EPL       = "data/epl.json";
const LOCAL_UCL       = "data/ucl.json";
const LOCAL_NEWS      = "data/news.json";
const LOCAL_TRANSFERS = "data/transfers.json";

let MATCHES = [];
let SEASON_LABEL = "";
let DATA_SOURCE = "";
let EPL = null, UCL = null, NEWS = null, TRANSFERS = null;
let TABLE = [];          // computed standings for SEASON_LABEL
let CLUB_BY_FULL = {};   // "Arsenal FC" -> club meta object
let CURRENT_CLUBS = [];  // this season's 20 clubs (stayed up + promoted)

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

async function loadData(){
  // Static curated content — always local, always succeeds.
  [EPL, UCL, NEWS, TRANSFERS] = await Promise.all([
    getJSON(LOCAL_EPL), getJSON(LOCAL_UCL), getJSON(LOCAL_NEWS), getJSON(LOCAL_TRANSFERS)
  ]);
  CLUB_BY_FULL = {};
  EPL.clubs.forEach(c => CLUB_BY_FULL[c.full] = c);
  EPL.promoted2627.forEach(c => CLUB_BY_FULL[c.full] = c);
  CURRENT_CLUBS = EPL.clubs.filter(c=>!c.relegated).concat(EPL.promoted2627);

  // Live match feed: current season -> previous completed season (real network) -> bundled snapshot.
  try{
    const d = await getJSON(REMOTE_CURRENT, 6000);
    MATCHES = d.matches; SEASON_LABEL = "2026-27"; DATA_SOURCE = "Live data (2026-27 in progress)";
  }catch(e1){
    try{
      const d = await getJSON(REMOTE_PREV, 6000);
      MATCHES = d.matches; SEASON_LABEL = "2025-26"; DATA_SOURCE = "Live network (2025-26 final)";
    }catch(e2){
      const d = await getJSON(LOCAL_MATCHES, 6000);
      MATCHES = d.matches; SEASON_LABEL = "2025-26"; DATA_SOURCE = "Offline snapshot (2025-26 final)";
    }
  }
  TABLE = computeTable(MATCHES);
}

function seasonState(){
  const today = new Date("2026-07-24T00:00:00Z"); // stamped app-open date; see docs/FOOTBALL-HUB.md
  const opener = new Date(EPL.season2627.openingMatch.date + "T00:00:00Z");
  if(SEASON_LABEL === "2026-27" && MATCHES.some(m=>m.score)) return "in-season";
  if(today < opener) return "preseason";
  return "in-season";
}

/* ---------- Club helpers ---------- */

function code3(full){
  const short = (CLUB_BY_FULL[full] && CLUB_BY_FULL[full].name) || full.replace(/ FC$| AFC$/,"").replace(/^AFC /,"");
  const words = short.replace(/&/g,"").split(/\s+/).filter(Boolean);
  if(words.length===1) return words[0].slice(0,3).toUpperCase();
  return words.map(w=>w[0]).join("").slice(0,3).toUpperCase();
}
function clubName(full){ return (CLUB_BY_FULL[full] && CLUB_BY_FULL[full].name) || full; }
function clubColor(full){ return (CLUB_BY_FULL[full] && CLUB_BY_FULL[full].color) || "#8c5cff"; }
function crest(full, size){
  size = size || 30;
  const bg = clubColor(full);
  // pick readable text colour for light crest backgrounds (e.g. Leeds white, Fulham black-on-white handled below)
  const dark = /^#f|^#e[0-9a-f]{5}$/i.test(bg) || bg.toUpperCase()==="#FFFFFF";
  const fg = dark ? "#0a0713" : "#fff";
  return `<span class="crest" style="width:${size}px;height:${size}px;line-height:${size}px;font-size:${Math.round(size*0.34)}px;background:${bg};color:${fg}">${code3(full)}</span>`;
}
function clubMeta(nameKey){ // lookup by short display name (from a data file), not full openfootball name
  return CURRENT_CLUBS.find(c=>c.name===nameKey) || EPL.clubs.find(c=>c.name===nameKey);
}

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

/* ---------- Favourite club (localStorage) ---------- */

const FAV_KEY = "fh_fav";
function getFav(){ try{ return localStorage.getItem(FAV_KEY) || ""; }catch(e){ return ""; } }
function setFav(name){ try{ localStorage.setItem(FAV_KEY, name); }catch(e){} }

/* ---------- Views ---------- */

function sectionHead(title, meta){
  return `<div class="sec-title"><h2>${title}</h2>${meta?`<span class="meta">${meta}</span>`:""}</div>`;
}

function viewToday(){
  const fav = getFav();
  const state = seasonState();
  let html = "";

  if(fav){
    const m = clubMeta(fav);
    if(m){
      const row = TABLE.find(r=>clubName(r.name)===fav);
      html += `<div class="fav-wrap"><div class="fav-banner">
        ${crest(m.full || "", 42)}
        <div><h2>${fav}</h2><div class="fav-sub">${m.nick||""} · ${row?`Finished ${row.pos===1?"1st":row.pos+"th"} in 2025-26 (${row.pts} pts)`:"2026-27 Premier League"}</div></div>
      </div></div>`;
    }
  }

  html += `<div class="champ won"><span class="champ-trophy">🏆</span><div>
      <div class="champ-label">2025-26 Premier League Champions</div>
      <div class="champ-team">Arsenal</div>
    </div><span class="champ-tag won">${EPL.lastSeason.championNote.split(",")[0]}</span></div>`;

  if(state==="preseason"){
    html += sectionHead("Season kicks off", `${fmtDate(EPL.season2627.openingMatch.date)}`);
    html += `<div class="banner"><b>${EPL.season2627.openingMatch.home} vs ${EPL.season2627.openingMatch.away}</b> — ${EPL.season2627.openingMatch.venue}<br>${EPL.season2627.openingMatch.note}</div>`;
    html += countdownBoxes(EPL.season2627.openingMatch.date);
    html += `<div class="match"><div class="top"><span>Community Shield</span><span>${fmtDate(EPL.season2627.communityShield.date)}</span></div>
      <div class="rows"><div class="team"><span class="flag">${crest(CLUB_BY_FULL["Arsenal FC"]?.full||"",21)}</span><span class="name">${EPL.season2627.communityShield.home}</span></div><div></div></div>
      <div class="rows"><div class="team"><span class="flag">${crest(CLUB_BY_FULL["Manchester City FC"]?.full||"",21)}</span><span class="name">${EPL.season2627.communityShield.away}</span></div><div></div></div>
      <div class="foot"><span>${EPL.season2627.communityShield.venue}</span><span>${EPL.season2627.communityShield.note}</span></div></div>`;
  } else {
    html += sectionHead("Latest results", SEASON_LABEL);
    const last = MATCHES.filter(m=>m.score).slice(-5).reverse();
    last.forEach(m=> html += matchCard(m));
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
  const sc = m.score; const ft = sc && (Array.isArray(sc)?sc:sc.ft);
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
  const fromC = clubMeta(d.from), toC = clubMeta(d.to);
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

function tableRows(tbl){
  return tbl.map(r=>{
    const cls = r.pos<=5 ? "qual" : "";
    const zone = r.pos<=5 ? '<span class="chip acc" style="margin-left:6px">UCL</span>'
      : r.pos<=7 ? '<span class="chip" style="margin-left:6px">UEL</span>'
      : r.pos>=18 ? '<span class="chip" style="margin-left:6px;color:var(--live);border-color:#5a2030">REL</span>' : "";
    return `<tr class="${cls}"><td class="pos">${r.pos}</td><td class="t">${crest(r.name,18)} ${clubName(r.name)}${zone}</td>
      <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd>0?"+":""}${r.gd}</td><td class="pts">${r.pts}</td></tr>`;
  }).join("");
}
function viewTable(){
  const label = SEASON_LABEL==="2026-27" ? "2026-27 (live)" : `${EPL.lastSeason.year} — final`;
  let html = sectionHead("Premier League table", label);
  html += `<div class="gcard"><table class="stand">
    <thead><tr><th>#</th><th style="text-align:left">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
    <tbody>${tableRows(TABLE)}</tbody></table></div>`;
  html += `<div class="vmeta" style="margin:10px 2px">
    <span class="chip acc">Champions League (top 5)</span>
    <span class="chip">Europa / Conference (6-7)</span>
    <span class="chip" style="color:var(--live);border-color:#5a2030">Relegation (18-20)</span>
  </div>`;
  if(SEASON_LABEL!=="2026-27"){
    html += `<p class="note">Showing the final ${EPL.lastSeason.year} table (real, computed from all ${MATCHES.length} match results). This switches automatically to the live 2026-27 table once the new season's results feed is published — no app update needed.</p>`;
  }
  return html;
}

function viewFixtures(){
  let html = sectionHead("2026-27 calendar", "confirmed dates");
  html += `<div class="match"><div class="top"><span>Community Shield</span><span>${fmtDate(EPL.season2627.communityShield.date)}</span></div>
    <div class="rows"><div class="team"><span class="name">${EPL.season2627.communityShield.home} vs ${EPL.season2627.communityShield.away}</span></div></div>
    <div class="foot"><span>${EPL.season2627.communityShield.venue}</span></div></div>`;
  html += `<div class="match"><div class="top"><span>${EPL.season2627.openingMatch.note.split(";")[0]}</span><span>${fmtDate(EPL.season2627.openingMatch.date)}</span></div>
    <div class="rows"><div class="team"><span class="name">${EPL.season2627.openingMatch.home} vs ${EPL.season2627.openingMatch.away}</span></div></div>
    <div class="foot"><span>${EPL.season2627.openingMatch.venue}</span></div></div>`;
  html += `<p class="note">Fixtures released ${fmtDate(EPL.season2627.fixturesReleased)}. The full 380-match list isn't republished here to avoid presenting unverified pairings as fact — see docs/FOOTBALL-HUB.md. This tab switches to the live 2026-27 fixture/results feed automatically once openfootball publishes it.</p>`;

  html += sectionHead(`${EPL.lastSeason.year} results archive`, `${MATCHES.length} matches`);
  html += `<input id="fxSearch" placeholder="Filter by club…" style="width:100%;background:var(--card);border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:9px 11px;font-size:13px;font-weight:600;margin-bottom:10px" />`;
  const rounds = {};
  MATCHES.forEach(m=>{ (rounds[m.round] = rounds[m.round]||[]).push(m); });
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
  let html = sectionHead("2026-27 Premier League clubs", "20 clubs");
  html += `<div class="tgrid">`;
  CURRENT_CLUBS.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=> html += teamCard(c));
  html += `</div>`;
  html += sectionHead("Promoted from the Championship");
  html += `<div class="tgrid">`;
  EPL.promoted2627.forEach(c=> html += `<div class="tcard">${crest(c.full,32)}<div><div class="nm">${c.name}</div><div class="gp">${c.note}</div></div></div>`);
  html += `</div>`;
  html += sectionHead("Relegated to the Championship");
  html += `<div class="tgrid">`;
  EPL.clubs.filter(c=>c.relegated).forEach(c=> html += `<div class="tcard">${crest(c.full,32)}<div><div class="nm">${c.name}</div><div class="gp">${c.nick} · ${c.ground}</div></div></div>`);
  html += `</div>`;
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
  let html = sectionHead("2026-27 title winner", `snapshot ${fmtDate(o.asOf)}`);
  html += `<div class="banner">${o.note}</div>`;
  o.market.forEach((row,i)=>{
    const [name, pct] = row;
    const meta = clubMeta(name);
    html += `<div class="odds-row"><span class="rank">${i+1}</span><span class="flag">${meta?crest(meta.full,22):""}</span>
      <span class="nm">${name}</span><span class="bar"><i style="width:${Math.min(100,pct*2.4)}%"></i></span><span class="pct">${pct.toFixed(1)}%</span></div>`;
  });
  html += `<p class="note">Source: <a href="${o.sourceUrl}" target="_blank" rel="noopener">${o.source}</a>. A dated snapshot, not a live feed.</p>`;

  html += sectionHead("Weekend match predictions");
  const state = seasonState();
  if(state==="preseason"){
    html += `<div class="empty">Weekly 1X2 match predictions unlock automatically once the 2026-27 fixture list goes live — check back after ${fmtDate(EPL.season2627.openingMatch.date)}.</div>`;
  } else {
    const upcoming = MATCHES.filter(m=>!m.score).slice(0,10);
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

const VIEWS = { today:viewToday, news:viewNews, transfers:viewTransfers, table:viewTable, fixtures:viewFixtures, teams:viewTeams, ucl:viewUCL, odds:viewOdds };
const TAB_LABELS = { today:"Today", news:"News", transfers:"Transfers", table:"Table", fixtures:"Fixtures", teams:"Teams", ucl:"Champions League", odds:"Odds" };

const state = { view:"today" };

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
      const matches = !q || det.textContent.toLowerCase().includes(q);
      det.style.display = matches ? "" : "none";
    });
  });
  document.querySelectorAll("[data-goto]").forEach(b=> b.addEventListener("click", ()=>{ setView(b.dataset.goto); }));
}
function setView(v){ state.view = v; render(); window.scrollTo({top:0, behavior:"smooth"}); }

function setLivePill(){
  const pill = document.getElementById("livePill"), label = document.getElementById("liveLabel");
  const ok = DATA_SOURCE.startsWith("Live");
  pill.classList.toggle("ok", ok); pill.classList.toggle("warn", !ok);
  label.textContent = DATA_SOURCE;
}

/* ---------- Favourite club sheet ---------- */

function renderFavList(filter){
  const list = document.getElementById("favList");
  const q = (filter||"").toLowerCase();
  const fav = getFav();
  list.innerHTML = CURRENT_CLUBS
    .filter(c=>!q || c.name.toLowerCase().includes(q))
    .sort((a,b)=>a.name.localeCompare(b.name))
    .map(c=> `<button class="fav-item ${c.name===fav?"on":""}" data-club="${c.name}">${crest(c.full,20)} ${c.name}</button>`)
    .join("");
  list.querySelectorAll("[data-club]").forEach(btn=> btn.addEventListener("click", ()=>{
    setFav(btn.dataset.club);
    document.getElementById("favBtnLabel").textContent = btn.dataset.club;
    document.getElementById("favBtn").classList.add("set");
    document.getElementById("favSheet").hidden = true;
    render();
  }));
}

function wireChrome(){
  document.querySelectorAll(".tab").forEach(t=> t.addEventListener("click", ()=> setView(t.dataset.view)));
  document.querySelectorAll(".navbtn[data-view]").forEach(b=> b.addEventListener("click", ()=> setView(b.dataset.view)));

  const favBtn = document.getElementById("favBtn"), favSheet = document.getElementById("favSheet");
  favBtn.addEventListener("click", ()=>{ favSheet.hidden = false; renderFavList(""); });
  document.getElementById("favClose").addEventListener("click", ()=> favSheet.hidden = true);
  document.getElementById("favSearch").addEventListener("input", e=> renderFavList(e.target.value));

  const fav = getFav();
  if(fav){ document.getElementById("favBtnLabel").textContent = fav; favBtn.classList.add("set"); }

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
