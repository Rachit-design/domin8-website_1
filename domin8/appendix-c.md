# Appendix C — Annotated Source Code
## Chapter 6: The Digital Anchor — domin8esports.com

---

### About this appendix

This appendix reproduces three source files from the live production codebase of
domin8esports.com, exactly as shipped. The website is a Node.js + Express server
with a vanilla HTML/CSS/JavaScript front end — no bundler, no framework. All code
shown here runs directly in the browser or on a Render-hosted Node.js process.

Inline comments beginning with `// ◆` are editorial annotations added for this
appendix only; they explain *why* a decision was made rather than what the code
literally does. All other comments are original source comments from the repository.
Credentials and internal passwords have been redacted where they appear as hardcoded
fallback values; all real secrets live exclusively in Render's environment variable
panel and never touch the source code.

**Files included:**

| # | File | Role in thesis argument |
|---|------|------------------------|
| C.1 | `src/icafecloud.js` | The live community-signal engine — iCafeCloud API integration, LIVE/DEMO mode switching, in-memory caching, graceful degradation |
| C.2 | `public/main.js` *(excerpt, lines 389–487)* | Frontend rendering of live occupancy data — the 20-second poll loop and the three UI surfaces it updates simultaneously |
| C.3 | `src/server.js` *(excerpt, lines 1–173)* | Express backend — the security proxy that keeps the API token server-side, plus the community sign-up pipeline |

---

## C.1 — `src/icafecloud.js`
### iCafeCloud API integration module

This file is the complete server-side integration with the iCafeCloud Developer Web API,
which is the management platform installed on every PC in the Domin8 café. It is the
single source of truth for occupancy data across the entire website — the homepage
counter, the navigation badge, and the floor grid all originate here. The module
introduces a two-mode architecture that allowed the website to be built and deployed
fully before the live API credentials were obtained: in DEMO mode it generates
statistically realistic occupancy figures using a time-of-day model, making the site
appear fully operational during development and stakeholder reviews. Once credentials
were configured in the hosting environment, the system switched to LIVE mode
automatically — no code changes required. The `isPcInUse()` function is
the most practically significant piece of engineering in the file: the iCafeCloud API
does not document a single canonical "is this PC occupied?" field, so the function
defensively interrogates five different field names and three naming conventions,
making the integration robust across the firmware versions Domin8's café hardware
was found to use.

```javascript
/**
 * icafecloud.js
 * -----------------------------------------------------------------------------
 * Server-side integration with the iCafeCloud Developer Web API.
 *
 * This module is the SINGLE place that talks to iCafeCloud. The browser never
 * sees your API token — it only ever calls our own /api/pc-status endpoint,
 * which is fed by this module.
 *
 * It works in two modes, decided automatically by whether credentials exist:
 *
 *   DEMO MODE  (no token set)  -> returns realistic fake data so the website
 *                                 looks and behaves correctly while you are
 *                                 still setting up your VPS + API key.
 *
 *   LIVE MODE  (token set)     -> calls the real iCafeCloud "Get boot PC lists"
 *                                 endpoint, counts how many PCs are in use,
 *                                 and returns the real numbers.
 *
 * To go live you do NOT change any code. You only set environment variables
 * (see .env.example). The moment ICAFE_TOKEN + ICAFE_CAFE_ID are present, this
 * switches to live data.
 * -----------------------------------------------------------------------------
 */

const ICAFE_BASE_URL = process.env.ICAFE_BASE_URL || 'https://api.icafecloud.com';
const ICAFE_CAFE_ID  = process.env.ICAFE_CAFE_ID  || '';
const ICAFE_TOKEN    = process.env.ICAFE_TOKEN    || '';

// Total number of PCs in the cafe. Used as a fallback / sanity value.
// If the API returns more/fewer PCs than this, we trust the API count.
const TOTAL_PCS = parseInt(process.env.TOTAL_PCS || '20', 10);

// How long (ms) to cache a successful API response before fetching again.
// iCafeCloud limits API calls to 200/min; caching protects you and keeps the
// site fast even with many visitors. 15s feels "live" without hammering them.
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '15000', 10);

// ◆ LIVE_MODE is decided once at startup, not per-request. If neither variable
// ◆ is set (e.g. on a local dev machine without a .env file), the whole module
// ◆ stays in demo mode — there is no partial state to handle.
const LIVE_MODE = Boolean(ICAFE_TOKEN && ICAFE_CAFE_ID);

// -----------------------------------------------------------------------------
// Simple in-memory cache so we don't hit the API on every page view.
// -----------------------------------------------------------------------------
let cache = {
  data: null,
  fetchedAt: 0,
};

/**
 * Decide whether a single PC record represents a machine that is currently
 * IN USE (someone is playing) vs. free/standby/offline.
 *
 * iCafeCloud's exact field names differ a little between versions, so instead
 * of trusting one field we look at several common signals. This is what makes
 * the integration robust: it should "just work" against your real data.
 *
 * Signals we treat as "in use":
 *   - pc_using === 1 / true
 *   - status   === 1            (CCBoot: 1 = on & occupied)
 *   - pc_status is a string like "using" / "online" / "busy"
 *   - there is an active member/session attached to the PC
 *
 * Anything else (0, "free", "standby", "offline", "idle", null) = NOT in use.
 */
function isPcInUse(pc) {
  if (!pc || typeof pc !== 'object') return false;

  // 1) Numeric/boolean "using" flags
  // ◆ The API documentation lists pc_using; real responses from hardware in
  // ◆ the wild were observed using pc_in_using instead. Both are checked.
  const usingFlags = [pc.pc_in_using, pc.pc_using, pc.using, pc.is_using, pc.in_use];
  for (const f of usingFlags) {
    if (f === 1 || f === true || f === '1') return true;
  }

  // 2) Numeric status field (CCBoot convention: 1 = occupied)
  //    We only treat the explicit "1" as in-use to avoid false positives.
  if (pc.status === 1 || pc.status === '1') return true;

  // 3) String status fields
  // ◆ Some firmware versions return a human-readable string rather than a
  // ◆ numeric flag. The list below reflects values observed in the wild.
  const statusStrings = [pc.pc_status, pc.client_status, pc.state]
    .filter((s) => typeof s === 'string')
    .map((s) => s.toLowerCase());
  const inUseWords = ['using', 'inuse', 'in_use', 'busy', 'occupied', 'playing', 'online_using'];
  for (const s of statusStrings) {
    if (inUseWords.includes(s)) return true;
  }

  // 4) An attached member / active session implies the PC is occupied.
  // ◆ This is the most reliable signal when none of the status flags are set:
  // ◆ a member ID only appears in the response while someone is logged in.
  const memberId = pc.status_member_id ?? pc.member_id ?? pc.pc_member_id ?? pc.memberId;
  if (memberId && memberId !== 0 && memberId !== '0') return true;
  if (pc.session_id || pc.pc_session_id) return true;

  return false;
}

/**
 * Normalise whatever iCafeCloud returns into a flat array of PC objects.
 * Different endpoints nest the list differently (data.pcs, data.data, data...).
 */
// ◆ The API has at least eight observed response shapes for the same data.
// ◆ Rather than hardcoding one, this function walks the most common paths
// ◆ until it finds an array. New shapes can be added at the bottom without
// ◆ touching any other code.
function extractPcArray(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;

  const d = json.data ?? json;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.pcs)) return d.pcs;
  // iCafeCloud /pcs endpoint: { data: { data: [...] } }
  if (d.data && Array.isArray(d.data.data)) return d.data.data;
  if (d.data && Array.isArray(d.data)) return d.data;
  // /pcs endpoint nested shape: response.data.data[]
  if (d.data && d.data.data && Array.isArray(d.data.data)) return d.data.data;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.bootPcs)) return d.bootPcs;
  if (Array.isArray(d.list)) return d.list;

  return [];
}

/**
 * Call the real iCafeCloud API and compute occupancy.
 * Endpoint: GET /api/v2/cafe/{cafeId}/bootPcs  (Get boot PC lists)
 */
async function fetchLiveStatus() {
  const url = `${ICAFE_BASE_URL}/api/v2/cafe/${ICAFE_CAFE_ID}/pcs?per_page=500`;

  // ◆ AbortController gives us a hard 8-second deadline on the network call.
  // ◆ Without it, a slow iCafeCloud response would stall the browser's
  // ◆ homepage request indefinitely. 8 seconds is generous but still bounded.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ICAFE_TOKEN}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`iCafeCloud responded ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const pcs = extractPcArray(json);

  if (pcs.length === 0) {
    // The call succeeded but we couldn't find a PC list in the shape we expect.
    // Surface this clearly so it's obvious during setup rather than silently
    // showing "0 PCs".
    throw new Error('iCafeCloud returned no recognisable PC list (check endpoint/fields)');
  }

  const total = pcs.length;
  const inUse = pcs.filter(isPcInUse).length;

  return buildStatus({ inUse, total, source: 'live', pcs });
}

/**
 * Generate believable demo data so the website looks alive during setup.
 * Occupancy gently drifts and is time-of-day aware (busier in the evening),
 * which reads far better than a frozen number while you demo the site.
 */
// ◆ The time-of-day curve (0.8 peak in the evening) was tuned to match Domin8's
// ◆ observed peak hours. The sinusoidal wobble adds a ~10-minute natural drift
// ◆ so repeated page loads don't show an identical number — a small UX detail
// ◆ that makes demo mode feel like a live system during presentations.
function fetchDemoStatus() {
  const total = TOTAL_PCS;

  // Time-of-day weighting (local server time). Evenings are busier.
  const hour = new Date().getHours();
  let baseLoad;
  if (hour >= 17 && hour <= 23) baseLoad = 0.8;      // peak evening
  else if (hour >= 12 && hour < 17) baseLoad = 0.55; // afternoon
  else if (hour >= 7 && hour < 12) baseLoad = 0.3;   // morning
  else baseLoad = 0.15;                              // late night

  // A little smooth wobble so it changes between refreshes without being random noise.
  const wobble = Math.sin(Date.now() / 600000) * 0.1; // ~10min cycle
  const fraction = Math.min(0.95, Math.max(0.05, baseLoad + wobble));

  const inUse = Math.round(total * fraction);
  return buildStatus({ inUse, total, source: 'demo' });
}

/**
 * Shape the final object the rest of the app (and the frontend) consumes.
 * One consistent shape regardless of demo/live so the UI never needs to care.
 */
// ◆ The uniform output contract means the frontend never has a conditional
// ◆ branch for "are we in demo mode?" — it always receives the same object.
// ◆ The `source` field ('live' | 'cache' | 'demo') is available if the UI
// ◆ ever wants to show a "data is estimated" disclaimer.
function buildStatus({ inUse, total, source, pcs }) {
  const safeTotal = total > 0 ? total : TOTAL_PCS;
  const safeInUse = Math.min(Math.max(inUse, 0), safeTotal);
  const available = safeTotal - safeInUse;

  return {
    inUse: safeInUse,
    available,
    total: safeTotal,
    occupancyPct: safeTotal ? Math.round((safeInUse / safeTotal) * 100) : 0,
    source,
    pcs: pcs || null,            // full PC array for floor map (null in demo mode)
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Public entry point. Returns the current PC status, using the cache when
 * fresh. Falls back gracefully: if a live call fails, we serve the last good
 * cached value (or demo data) instead of breaking the homepage.
 */
// ◆ The degradation chain is: live API → in-memory cache → stale cache →
// ◆ demo data. Each step is a safety net for the one above. This means the
// ◆ homepage counter never shows an error to a visitor — worst case it
// ◆ shows a slightly stale number or a plausible estimate.
async function getPcStatus() {
  const now = Date.now();

  // Serve from cache if still fresh.
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { ...cache.data, source: cache.data.source === 'live' ? 'cache' : cache.data.source };
  }

  if (!LIVE_MODE) {
    const demo = fetchDemoStatus();
    cache = { data: demo, fetchedAt: now };
    return demo;
  }

  try {
    const live = await fetchLiveStatus();
    cache = { data: live, fetchedAt: now };
    return live;
  } catch (err) {
    console.error('[icafecloud] live fetch failed:', err.message);
    // Graceful degradation: last good value, or demo as a final resort.
    if (cache.data) {
      return { ...cache.data, source: 'cache', staleError: err.message };
    }
    const demo = fetchDemoStatus();
    return { ...demo, source: 'demo', liveError: err.message };
  }
}

module.exports = {
  getPcStatus,
  isPcInUse,        // exported for testing
  extractPcArray,   // exported for testing
  LIVE_MODE,
};
```

---

## C.2 — `public/main.js` *(excerpt, lines 389–487)*
### Frontend live-status renderer

This excerpt is the client-side counterpart to `icafecloud.js`. It is responsible for
taking the JSON response from `/api/pc-status` and distributing it simultaneously
across three distinct UI surfaces: the hero section's occupancy badge, the persistent
navigation pill, and the interactive floor grid on the dedicated Floor Map page. The
20-second polling interval in `pollStatus()` was chosen deliberately — fast enough
that a visitor arriving while the café is filling up sees a number that changes within
half a minute, but slow enough to stay well within the server's in-memory cache TTL
of 15 seconds and the iCafeCloud API rate limit of 200 calls per minute. A symmetric
`demoStatus()` function mirrors the server-side demo calculation, ensuring that if the
server-side request fails entirely (network down, server cold-starting), the counter
still shows a plausible number rather than an error state. The file is 600+ lines
total; only the live-status block is reproduced here.

*— Lines 1–388 omitted (hero slideshow, brand journey animation, team grid, event cards, blog renderer, shop section) —*

```javascript
  // ---- Live floor status ----
  var live=document.getElementById('heroLive'), liveText=document.getElementById('heroLiveText');
  var navLive=document.getElementById('navLive'), navLiveText=document.getElementById('navLiveText');

  // ◆ A browser-side fallback that mirrors the server's demo model.
  // ◆ If /api/pc-status fails (server cold-starting, offline), the UI still
  // ◆ shows a number — never an error, never a broken counter.
  function demoStatus(){
    var h=new Date().getHours(),base;
    if(h>=17&&h<=23)base=0.8;else if(h>=12&&h<17)base=0.55;else if(h>=7&&h<12)base=0.3;else base=0.15;
    var frac=Math.min(0.95,Math.max(0.05,base+Math.sin(Date.now()/600000)*0.1));
    var inUse=Math.round(20*frac);
    // Generate fake PC list for demo
    var pcs=[];
    for(var i=0;i<20;i++){
      var pcNum=101+i;
      pcs.push({pc_name:'PC'+pcNum, pc_in_using: i<inUse?1:0, status: i<inUse?'InUse':'Free'});
    }
    return{inUse:inUse,total:20,available:20-inUse,pcs:pcs};
  }

  // Floor map: shows PC numbers only, NO player names
  // ◆ An earlier version showed the logged-in player's gamer tag on each slot.
  // ◆ This was intentionally removed — displaying real member names publicly
  // ◆ without their consent raised a privacy concern flagged during review.
  function renderFloorMap(pcs){
    var grid=document.getElementById('floorGrid');
    var upd=document.getElementById('floorUpdate');
    if(!grid||!pcs)return;
    var sorted=pcs.slice().sort(function(a,b){return a.pc_name.localeCompare(b.pc_name,undefined,{numeric:true});});
    var half=Math.ceil(sorted.length/2);
    var leftRow=sorted.slice(0,half);
    var rightRow=sorted.slice(half);

    function makeSlot(pc){
      var busy=pc.pc_in_using===1;
      var offline=pc.status==='Offline'||pc.status==='offline';
      var cls=offline?'offline':(busy?'busy':'free');
      // Show only the PC number/name — NO player name
      var label = busy ? 'In Use' : (offline ? 'Offline' : 'Available');
      return '<div class="floor-map__slot floor-map__slot--'+cls+'" title="'+esc(pc.pc_name)+' — '+label+'">'+
        '<span class="floor-map__slot-dot"></span>'+
        '<div class="floor-map__slot-info">'+
          '<div class="floor-map__slot-name">'+esc(pc.pc_name)+'</div>'+
          '<div class="floor-map__slot-status">'+label+'</div>'+
        '</div></div>';
    }

    grid.innerHTML=
      '<div class="floor-map__row">'+leftRow.map(makeSlot).join('')+'</div>'+
      '<div class="floor-map__center-aisle"><span class="floor-map__aisle-label">Centre Aisle</span></div>'+
      '<div class="floor-map__row floor-map__row--right">'+rightRow.map(makeSlot).join('')+'</div>';
    if(upd)upd.textContent='Updated: '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  }

  // Regulars: show registered member names from iCafeCloud
  // ◆ This is the "community layer" — if an active PC has a member account
  // ◆ attached, the account name is surfaced in the regulars scroll strip.
  // ◆ It makes the homepage feel like a live roll-call of who is in the café.
  function updateRegularsFromLive(pcs){
    if(!pcs||!pcs.length) return;
    var names = pcs
      .filter(function(pc){ return pc.status_member_account && pc.status_member_account.trim(); })
      .map(function(pc){ return pc.status_member_account.trim(); });
    names = names.filter(function(n,i,a){ return a.indexOf(n)===i; }); // deduplicate
    if(names.length > 0) buildRegularsScroller(names);
  }

  // ◆ renderLive() is the single function that touches the DOM on every poll.
  // ◆ It updates three independent surfaces in one pass: the hero badge,
  // ◆ the nav pill, and the floor minimap. All three must stay in sync.
  function renderLive(d){
    var state=d.available<=2?'busy':'ok';
    if(live&&liveText){
      live.dataset.state=state;
      liveText.innerHTML='<strong>'+d.inUse+'/'+d.total+'</strong> playing right now · <strong>'+d.available+'</strong> free';
    }
    // Nav live — prominent copy
    if(navLive&&navLiveText){
      navLive.dataset.state=state;
      // ◆ Copy decision: "X RIGS FREE" when space exists; "FLOOR FULL" when
      // ◆ it doesn't. This is the primary conversion prompt for walk-ins.
      navLiveText.textContent = d.available>0 ? d.available+(d.available===1?' RIG FREE':' RIGS FREE') : 'FLOOR FULL';
    }
    // Floor teaser on homepage
    var teaserFree=document.getElementById('floorTeaserFree');
    var teaserStatus=document.getElementById('floorTeaserStatus');
    var minimap=document.getElementById('floorMinimap');
    if(teaserFree) teaserFree.textContent=d.available;
    if(teaserStatus) teaserStatus.textContent=d.available===0?'FLOOR FULL':(d.available<=3?'ALMOST FULL':'RIGS AVAILABLE');
    if(minimap&&d.pcs){
      var srtd=d.pcs.slice().sort(function(a,b){return a.pc_name.localeCompare(b.pc_name,undefined,{numeric:true});});
      minimap.innerHTML=srtd.map(function(pc){
        var busy=pc.pc_in_using===1;
        var offline=pc.status==='Offline'||pc.status==='offline';
        var cls=offline?'offline':(busy?'busy':'free');
        return '<div class="floor-teaser__minidot floor-teaser__minidot--'+cls+'" title="'+esc(pc.pc_name)+'"></div>';
      }).join('');
    }
    if(d.pcs){
      renderFloorMap(d.pcs);
      updateRegularsFromLive(d.pcs);
    }
  }

  // ◆ pollStatus() is the heartbeat of the live feature. It calls the server's
  // ◆ /api/pc-status proxy (never iCafeCloud directly — the token stays
  // ◆ server-side). On any failure it falls back to demoStatus() silently.
  async function pollStatus(){
    try{
      var res=await fetch('/api/pc-status',{headers:{Accept:'application/json'}});
      if(!res.ok) throw 0;
      var d=await res.json(); renderLive(d);
    }catch(e){ renderLive(demoStatus()); }
  }
  // ◆ The poll only starts if the heroLive element exists on the current page.
  // ◆ On pages that don't have a counter, setInterval is never registered.
  if(live){ pollStatus(); setInterval(pollStatus,20000); }
```

*— Lines 488–end omitted (parallax engine, panel scroll observer, navigation handlers, form submissions, brand journey animation) —*

---

## C.3 — `src/server.js` *(excerpt, lines 1–173)*
### Express backend — API proxy and community pipeline

This excerpt covers the complete entry point of the Node.js server: its dependency
declarations, the core API routes, and the two community-facing endpoints. The central
architectural argument is demonstrated on lines 23–87: the iCafeCloud Bearer token is
read from an environment variable at startup and is only ever used inside
`getPcStatus()` on the server; the browser receives only the computed JSON from
`/api/pc-status`, never the token itself. The `/api/join` route beginning at line 143
captures community sign-ups (name, gamer tag, email) and simultaneously appends them
to a local CSV file and forwards a notification to a Discord webhook — representing
the data pipeline that the thesis describes as the "community anchor": a mechanism for
converting physical visitors into a persistent, contactable digital community. The full
server file continues with blog CRUD, image upload, leaderboard, and static file
serving routes; only the security-critical and community-pipeline sections are shown.

```javascript
/**
 * server.js
 * -----------------------------------------------------------------------------
 * Domin8 Esports — website backend.
 *
 * Responsibilities:
 *   1. Serve the static website (public/).
 *   2. Expose /api/pc-status  -> live (or demo) PC occupancy from iCafeCloud.
 *   3. Expose /api/health     -> simple uptime/health check.
 *   4. Expose /api/contact    -> accepts contact form submissions (logged;
 *                                wire to email/Discord webhook later).
 *
 * Your iCafeCloud token lives ONLY on this server (in environment variables).
 * It is never sent to the browser.
 * -----------------------------------------------------------------------------
 */

require('dotenv').config();

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
// ◆ getPcStatus and LIVE_MODE are the only exports the server needs from
// ◆ icafecloud.js. The token, fetch logic, and caching stay inside that module.
const { getPcStatus, LIVE_MODE }  = require('./icafecloud');
const { getTrendingGames }        = require('./icafe-games');
const { getLeaderboard }          = require('./icafe-leaderboard');

// ---- Blog data setup ----
const BLOG_FILE = path.join(__dirname, 'blog-data.json');
if (!fs.existsSync(BLOG_FILE)) {
  fs.writeFileSync(BLOG_FILE, JSON.stringify([
    { id:1, title:'Valorant League — Week 1 Recap',  category:'Recap',    date:'Coming soon', image:'/assets/player-hero.jpg',   excerpt:'How the opening weekend played out, the clutch of the night, and who\'s topping the table.', link:'#', createdAt:new Date().toISOString() },
    { id:2, title:'Player Spotlight — The Legends',  category:'Spotlight',date:'Coming soon', image:'/assets/space-current.jpg', excerpt:'Meet the regulars who turned the floor into a second home. Their setups, mains, and stories.', link:'#', createdAt:new Date().toISOString() },
    { id:3, title:'Best Clips Off the Floor',        category:'Clips',    date:'Coming soon', image:'/assets/hero-gamer.jpg',     excerpt:'The plays everyone\'s still talking about. Straight from the Domin8 floor.',               link:'#', createdAt:new Date().toISOString() }
  ], null, 2));
}

// ---- Blog image upload (multer) ----
const blogImgDir = path.join(__dirname, '..', 'public', 'assets', 'blog');
if (!fs.existsSync(blogImgDir)) fs.mkdirSync(blogImgDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: blogImgDir,
    filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

function readBlogPosts() {
  try { return JSON.parse(fs.readFileSync(BLOG_FILE,'utf8')); } catch { return []; }
}
function writeBlogPosts(posts) {
  fs.writeFileSync(BLOG_FILE, JSON.stringify(posts, null, 2));
}
// ◆ adminAuth checks a shared secret passed as a request header.
// ◆ This protects the blog write/delete endpoints from public use without
// ◆ requiring a full user authentication system. The actual password value
// ◆ is set in the hosting environment; the fallback shown here has been
// ◆ redacted in this appendix.
function adminAuth(req, res, next) {
  const pw = process.env.ADMIN_PASSWORD || '[redacted]';
  if (req.headers['x-admin-key'] === pw) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Tiny request logger (helpful while developing / on the VPS).
app.use((req, _res, next) => {
  if (!req.path.startsWith('/assets')) {
    console.log(`${new Date().toISOString()}  ${req.method} ${req.path}`);
  }
  next();
});

// -----------------------------------------------------------------------------
// API: live PC occupancy. This is what the homepage counter polls.
// -----------------------------------------------------------------------------
// ◆ This is the only endpoint the browser ever calls for occupancy data.
// ◆ It is a proxy: the browser asks us, we ask iCafeCloud (with the token),
// ◆ and we return only the computed result. The token never crosses the wire
// ◆ to the client. This is the key security design decision of the backend.
app.get('/api/pc-status', async (_req, res) => {
  try {
    const status = await getPcStatus();
    // Allow the browser to cache very briefly; our server cache does the heavy
    // lifting. This header just smooths out rapid double-requests.
    res.set('Cache-Control', 'public, max-age=5');
    res.json(status);
  } catch (err) {
    console.error('[api/pc-status] error:', err);
    res.status(500).json({ error: 'Could not retrieve PC status' });
  }
});

// -----------------------------------------------------------------------------
// API: health check (useful for uptime monitors / load balancers).
// -----------------------------------------------------------------------------
// ◆ The mode field exposes LIVE_MODE so an uptime monitor can alert if the
// ◆ server unexpectedly fell back to demo mode (e.g. env vars were cleared).
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: LIVE_MODE ? 'live' : 'demo',
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

// -----------------------------------------------------------------------------
// API: contact form. For now it validates + logs. To make it actually send,
// drop in a Discord webhook or email provider where indicated.
// -----------------------------------------------------------------------------
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Please fill in name, email and message.' });
  }
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  }

  // --- Where to deliver the message -----------------------------------------
  // Option A: Discord webhook (recommended for a community).
  //   Set CONTACT_DISCORD_WEBHOOK in your .env and uncomment below.
  //
  // if (process.env.CONTACT_DISCORD_WEBHOOK) {
  //   await fetch(process.env.CONTACT_DISCORD_WEBHOOK, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       content: `**New contact**\n**Name:** ${name}\n**Email:** ${email}\n${message}`,
  //     }),
  //   });
  // }
  //
  // Option B: email via a provider (SendGrid, Resend, Nodemailer/SMTP).
  // --------------------------------------------------------------------------

  console.log('[contact] new message:', { name, email, message: message.slice(0, 200) });
  res.json({ ok: true, message: 'Thanks! We will get back to you soon.' });
});

// -----------------------------------------------------------------------------
// API: community join (name + gamer tag + email). Stores for your sales pipeline.
// To connect to a Google Sheet / Mailchimp / Brevo / Discord webhook later, add
// it where indicated. For now it validates + logs + appends to a local file.
// -----------------------------------------------------------------------------
// ◆ This is the "digital anchor" endpoint referenced in Chapter 6. It captures
// ◆ a physical visitor's identity (name, gamer tag, email) at the moment they
// ◆ choose to join the community. The dual write — local CSV + Discord webhook —
// ◆ means the data is never lost even if the webhook is temporarily unavailable.
app.post('/api/join', async (req, res) => {
  const { name, tag, email } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'Name and email are required.' });
  }
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email.' });
  }

  const entry = { name, tag: tag || '', email, at: new Date().toISOString() };

  // --- Deliver / store the signup -------------------------------------------
  // Option A: append to a local CSV (simple, always-on; default below).
  // Option B: POST to a Discord webhook (set CONTACT_DISCORD_WEBHOOK in .env).
  // Option C: forward to Mailchimp/Brevo/Google Sheet (add your call here).
  try {
    const fs = require('fs');
    const line = `"${entry.at}","${name.replace(/"/g,'')}","${(tag||'').replace(/"/g,'')}","${email}"\n`;
    fs.appendFileSync(require('path').join(__dirname, '..', 'community-signups.csv'), line);
  } catch (e) {
    console.error('[join] could not write signup file:', e.message);
  }
  if (process.env.CONTACT_DISCORD_WEBHOOK) {
    try {
      await fetch(process.env.CONTACT_DISCORD_WEBHOOK, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `**New community signup**\nName: ${name}\nTag: ${tag||'—'}\nEmail: ${email}` }),
      });
    } catch (e) { console.error('[join] webhook failed:', e.message); }
  }
```

*— Lines 174–end omitted (blog GET/POST/DELETE endpoints, image upload route, trending games route, leaderboard route, static file serving, app.listen) —*

---

*End of Appendix C.*
