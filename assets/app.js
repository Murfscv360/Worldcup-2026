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

async function loadData(){
  // Try the live public-domain feed first, then the bundled snapshot.
  try{
    const r = await fetch(REMOTE, {cache:"no-store"});
    if(!r.ok) throw new Error(r.status);
    const j = await r.json();
    if(j && j.matches && j.matches.length){ MATCHES = j.matches; DATA_SOURCE = "live"; return; }
    throw new Error("empty");
  }catch(e){ /* fall through to bundled snapshot */ }
  try{
    const r = await fetch(LOCAL, {cache:"no-store"});
    const j = await r.json();
    MATCHES = j.matches || [];
    DATA_SOURCE = "snapshot";
  }catch(e){
    MATCHES = [];
    DATA_SOURCE = "error";
  }
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
  const hasScore = m.score && Array.isArray(m.score.ft);
  const d = kickoffDate(m);
  const now = Date.now();
  if(d && now>=d.getTime() && now < d.getTime()+135*60000) return "live";
  if(hasScore) return "ft";
  if(d && d.getTime()>now && d.getTime()-now < 36*3600000) return "soon";
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

  return `<div class="match tappable ${live?'is-live-card':''}" data-open="${esc(matchKey(m))}" role="button" tabindex="0">
    <div class="top"><span>${topLeft}</span>${badge}</div>
    ${teamRow(t1,0,w1,!!sc&&!w1&&!(sc[0]===sc[1]))}
    ${teamRow(t2,1,w2,!!sc&&!w2&&!(sc[0]===sc[1]))}
    ${scorersHTML(m)}
    <div class="foot">
      ${kick}
      <span>📍 ${esc(venueShort(m.ground))}</span>
      ${weatherChip(m)}
      ${tvLine}
    </div>
    <div class="open-row">${cta}</div>
  </div>`;
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
function formScore(t){
  const r = teamRowOf(t);
  return strengthOf(t) + (r ? r.Pts*0.6 + r.GD*0.15 : 0);
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
// Resolve a placeholder/team code to {team, confirmed}. confirmed=true once the
// matchup is officially announced (real team in the feed, or a played result).
function resolveCode(code){
  code = String(code);
  if(TEAMS[code]) return {team:code, confirmed:true};
  if(/^[12][A-L]$/.test(code) || (code[0]==="3" && code.includes("/"))){
    const t = r32map()[code]; return t ? {team:t, confirmed:false} : null;
  }
  const m = code.match(/^([WL])(\d+)$/);
  if(m) return projOutcome(+m[2], m[1]==="L");
  return null;
}
function projOutcome(num, wantLoser){
  const mt = matchByNum(num); if(!mt) return null;
  if(mt.score && Array.isArray(mt.score.ft)){          // played → confirmed winner/loser
    const [a,b] = mt.score.ft;
    const w = a>=b ? mt.team1 : mt.team2, l = a>=b ? mt.team2 : mt.team1;
    return resolveCode(wantLoser ? l : w);
  }
  const A = resolveCode(mt.team1), B = resolveCode(mt.team2);
  if(!A || !B) return null;
  const strong = formScore(A.team) >= formScore(B.team) ? A : B, weak = strong===A ? B : A;
  return { team:(wantLoser?weak:strong).team, confirmed:false };
}
function projTeam(code){ const r = resolveCode(code); return r ? r.team : null; }   // compat

// Predict a knockout scoreline from current form. Scores align to team1(a)/
// team2(b); the winner always matches the higher-form team that advances.
function predictTie(m, a, b){
  const fa = formScore(a), fb = formScore(b), favA = fa>=fb, fd = Math.abs(fa-fb);
  const r = hash((m.num||0)+"|"+a+"|"+b);
  let favG, dogG, pens=false;
  if(fd < 0.6){ favG = dogG = 1 + Math.floor(r*2); pens = true; }       // tight → draw, penalties
  else {
    favG = Math.min(3, 1 + Math.floor(r*2 + Math.min(fd*0.4, 1.6)));
    dogG = Math.max(0, favG - 1 - Math.floor(Math.min(fd*0.5, 1)));
    if(favG === dogG) dogG = Math.max(0, favG-1);
  }
  const winner = favA ? a : b;
  return favA ? {a:favG, b:dogG, pens, winner} : {a:dogG, b:favG, pens, winner};
}

// Display info for one side of a bracket card.
function bracketTeam(code){
  if(TEAMS[code]){ const t=teamLabel(code); return {flag:t.flag, name:t.name, proj:false, ph:false, conf:true}; }
  const r = resolveCode(code);
  if(r){ const t=teamLabel(r.team); return {flag:t.flag, name:t.name, proj:!r.confirmed, ph:false, conf:r.confirmed}; }
  const t = teamLabel(code); return {flag:t.flag, name:t.name, proj:false, ph:true, conf:false};
}
function bracketCard(m){
  const sc=(m.score && Array.isArray(m.score.ft)) ? m.score.ft : null;
  const d=kickoffDate(m), st=status(m);
  const t1=bracketTeam(m.team1), t2=bracketTeam(m.team2);
  const w1=sc&&sc[0]>sc[1], w2=sc&&sc[1]>sc[0];
  const projected = !sc && (t1.proj || t2.proj);
  const locked = !sc && !projected && t1.conf && t2.conf;   // matchup announced, not yet played
  // Predicted scoreline for any unplayed tie where both teams are known.
  const pred = (!sc && !t1.ph && !t2.ph) ? predictTie(m, t1.name, t2.name) : null;
  let s1 = sc ? sc[0] : (pred ? pred.a : null);
  let s2 = sc ? sc[1] : (pred ? pred.b : null);
  const pw1 = pred && pred.winner===t1.name, pw2 = pred && pred.winner===t2.name;
  const when = st==="live" ? `<span class="blive">🔴 ${(liveClock(m)||{}).label||"Live"}</span>`
    : sc ? "Full-time"
    : projected ? "Predicted"
    : d ? `${etFmt.format(d)} ET · ${new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"short",day:"numeric"}).format(d)}`
    : "TBD";
  const row=(t,s,win,predw)=>`<div class="brow ${win||predw?"bw":""} ${t.ph?"bph":""} ${t.proj?"bpr":""}">
      <span class="flag">${t.flag}</span><span class="bnm">${esc(t.name)}</span><span class="bsc ${pred?"pred":""}">${s??""}</span></div>`;
  const tag = projected ? '<span class="bproj-tag">PROJ</span>' : locked ? '<span class="bset-tag">🔒 SET</span>' : "";
  const penNote = pred && pred.pens ? `<span class="bpen-tag" title="Decided on penalties">⚪ pens → ${esc(pred.winner)}</span>` : "";
  return `<div class="bcard tappable ${projected?"is-proj":""} ${locked?"is-set":""}" data-open="${esc(matchKey(m))}" role="button" tabindex="0">
      <i class="bconn" aria-hidden="true"></i>
      ${row(t1, s1, w1, pw1)}
      ${row(t2, s2, w2, pw2)}
      <div class="bfoot">${when}${penNote}${tag}</div>
    </div>`;
}
function viewBracket(){
  _projThirds = null; _teamRows = null; _r32map = null;   // recompute projections from the latest standings
  const order=[["Round of 32","Round of 32","c-r32"],["Round of 16","Round of 16","c-r16"],
    ["Quarter-final","Quarter-finals","c-qf"],["Semi-final","Semi-finals","c-sf"],["Final","Final","c-final"]];
  const present=order.filter(([r])=>MATCHES.some(m=>m.round===r));
  let html=`<div class="sec-title"><h2>Knockout bracket</h2><span class="meta">scroll →</span></div>`;
  if(!present.length) return html+`<div class="empty">The Round of 32 bracket appears once the group stage is complete. Group qualification is on the Groups tab.</div>`;
  html += `<div class="banner" style="margin-bottom:12px">Bracket is <b>projected on current form</b> — group leaders/runners-up, best 3rds, predicted <b>scorelines</b> and <b>⚪ penalty</b> ties. <span class="bpr-key">dashed = predicted</span>; it adjusts as results land and ties <b>🔒 lock</b> once announced.</div>`;
  html += `<div class="bracket">`;
  present.forEach(([r,label,cls])=>{
    const ms=MATCHES.filter(m=>m.round===r).sort((a,b)=>(a.num||0)-(b.num||0));
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
    return {...p, assists, shots, passPct, rating:+rating.toFixed(2)};
  });
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
function matchFeed(m){
  const ev = [];
  const live = status(m)==="live";
  const cl = liveClock(m);
  const nowMin = live ? (cl?cl.min:0) : 999;   // only show events up to "now" when live
  const t1n = teamLabel(m.team1).name, t2n = teamLabel(m.team2).name;
  ev.push({min:0, type:"ko", text:`Kick-off — ${t1n} vs ${t2n} at ${venueShort(m.ground)}.`});

  // Real goals.
  const goals = [];
  (m.goals1||[]).forEach(g=>goals.push({...g, team:m.team1, side:1}));
  (m.goals2||[]).forEach(g=>goals.push({...g, team:m.team2, side:2}));
  goals.sort((a,b)=> (parseInt(a.minute)||0)-(parseInt(b.minute)||0));
  let s1=0, s2=0;
  goals.forEach(g=>{
    const mn = parseInt(g.minute)||0;
    if(mn>nowMin) return;
    if(g.side===1) s1++; else s2++;
    let text;
    if(g.penalty)      text=`GOAL! ${g.name} sends the 'keeper the wrong way from the spot for ${g.team}.`;
    else if(g.owngoal) text=`OWN GOAL — ${g.name} turns it into his own net; ${g.team} benefit.`;
    else               text=`GOAL! ${g.name} finishes it off for ${g.team}.`;
    ev.push({min:mn, type:"goal", text:`${text} It's ${s1}–${s2}.`});
    if(g.penalty)      ev.push({min:mn, type:"var", text:`VAR — on-field penalty decision checked and CONFIRMED.`});
    else if(g.owngoal) ev.push({min:mn, type:"var", text:`Credited as an own goal after review.`});
    else if(hash(g.name+mn)>0.78) ev.push({min:mn, type:"var", text:`VAR check for offside in the build-up — goal STANDS.`});
  });

  // Modeled colour events spread across the match (skip minutes that already have a goal).
  const goalMins = new Set(goals.map(g=>parseInt(g.minute)||0));
  const slots = [7,16,23,31,38,52,59,66,73,81,88];
  const seed = hash(m.team1+m.team2);
  slots.forEach((mn,i)=>{
    if(mn>nowMin || goalMins.has(mn)) return;
    if(hash(m.team1+m.team2+mn) < 0.5) return;            // ~half the slots fire
    const tpl = PBP[Math.floor(hash(m.team2+mn+i)*PBP.length)];
    const flip = hash(m.team1+mn)>0.5;
    ev.push({min:mn, type:(/Booking|Yellow|save|Penalty/.test(tpl({A:"",B:""}))?"play":"play"),
      text: tpl(flip?{A:t1n,B:t2n}:{A:t2n,B:t1n})});
  });

  // Half-time & full-time / live marker.
  if(nowMin>=45) ev.push({min:45, type:"ht", text:`Half-time. ${t1n} ${m.score&&m.score.ht?m.score.ht[0]:s1}–${m.score&&m.score.ht?m.score.ht[1]:s2} ${t2n}.`});
  if(m.score && Array.isArray(m.score.ft) && !live){
    ev.push({min:90, type:"ft", text:`Full-time: ${t1n} ${m.score.ft[0]}–${m.score.ft[1]} ${t2n}.`});
  } else if(live){
    ev.push({min: cl?cl.min:0, type:"live", text:`Live${cl?` — ${cl.label}`:""}. Updates as the action unfolds.`});
  }
  return ev.sort((a,b)=> a.min-b.min || (a.type==="ko"?-1:1));
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
        <div class="lh-score${scoreFlash("hero:"+matchKey(m), st.sc)}">${st.sc[0]} – ${st.sc[1]}<small>${esc(venueShort(m.ground))}</small></div>
        <div class="lh-team"><span class="flag">${t2.flag}</span><span class="nm">${esc(t2.name)}</span></div>
      </div>
      <div class="statbars">
        ${bar("Possession", st.possA, st.possB, "%")}
        ${bar("Shots", st.shotsA, st.shotsB)}
        ${bar("Expected goals (xG)", st.xgA, st.xgB)}
        ${bar("Corners", st.corA, st.corB)}
      </div>
      <div class="lo-top" style="margin-top:12px">Live win market</div>
      ${oddsRow}
      ${momentumBar(m)}
      <p class="note">Score &amp; scorers are live; possession, shots, xG &amp; momentum are modeled.</p>
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
  const icon = {ko:"🟢",goal:"⚽",var:"📺",ht:"⏸️",ft:"🏁",live:"🔴",play:"🎙️"};
  const items = feed.slice().reverse().map(e=>`
      <li class="tl-${e.type}">
        <div class="tl-min">${e.type==="ko"?"KO":e.type==="ht"?"HT":e.type==="ft"?"FT":e.min+"'"}</div>
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
      <td class="rt">${p.rating.toFixed(2)}</td>
    </tr>`).join("");
  html += `<div class="ptable-wrap"><table class="ptable">
      <thead><tr><th>#</th><th style="text-align:left">Player</th><th style="text-align:left">Team</th>
        <th>Gls</th><th>Ast</th><th>Sh</th><th>Pass</th><th>Rtg</th></tr></thead>
      <tbody>${body}</tbody></table></div>`;
  html += `<p class="note">Goals are from live match data. Assists, shots, pass % and rating are modeled.</p>`;
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
}

/* ---------- App shell ---------- */
const VIEWS = {today:viewToday, live:viewCommentary, news:viewNews, schedule:viewSchedule, groups:viewGroups, bracket:viewBracket, teams:viewTeams, stats:viewStats, awards:viewAwards, venues:viewVenues, predictions:viewPredictions};
const state = { view:"today", scheduleFilter:{q:"",round:"all"}, statSort:"rating", cmtKey:null, fav:loadFav() };

function render(){
  const fn = VIEWS[state.view];
  const v = $("view");
  const entering = render.__last !== state.view;   // a real screen change (not a live refresh)
  v.innerHTML = fn ? fn(state) : "";
  if(entering){
    v.classList.remove("swap"); void v.offsetWidth; v.classList.add("swap");
    render.__last = state.view;
  }
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
  ["stats","📈","Players"],["awards","👟","Boot & Glove"],["venues","🏟️","Venues"],["predictions","💹","Odds"]
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
  initPullToRefresh();
  $("view").innerHTML = skeletonHTML();
  await loadData();
  setLive();
  render();
  // Refresh source data every 60s.
  setInterval(async ()=>{ await loadData(); setLive(); if(!editingSchedule()) render(); }, 60000);
  // Re-render dynamic views every 20s so live scores, clocks & odds stay fresh.
  setInterval(()=>{ if(!editingSchedule()) render(); }, 20000);
  // Tick countdowns & live clocks every second.
  setInterval(tickDynamic, 1000);
}

document.addEventListener("DOMContentLoaded", init);
