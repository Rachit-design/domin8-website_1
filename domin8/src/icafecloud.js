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
  const usingFlags = [pc.pc_in_using, pc.pc_using, pc.using, pc.is_using, pc.in_use];
  for (const f of usingFlags) {
    if (f === 1 || f === true || f === '1') return true;
  }

  // 2) Numeric status field (CCBoot convention: 1 = occupied)
  //    We only treat the explicit "1" as in-use to avoid false positives.
  if (pc.status === 1 || pc.status === '1') return true;

  // 3) String status fields
  const statusStrings = [pc.pc_status, pc.client_status, pc.state]
    .filter((s) => typeof s === 'string')
    .map((s) => s.toLowerCase());
  const inUseWords = ['using', 'inuse', 'in_use', 'busy', 'occupied', 'playing', 'online_using'];
  for (const s of statusStrings) {
    if (inUseWords.includes(s)) return true;
  }

  // 4) An attached member / active session implies the PC is occupied.
  const memberId = pc.status_member_id ?? pc.member_id ?? pc.pc_member_id ?? pc.memberId;
  if (memberId && memberId !== 0 && memberId !== '0') return true;
  if (pc.session_id || pc.pc_session_id) return true;

  return false;
}

/**
 * Normalise whatever iCafeCloud returns into a flat array of PC objects.
 * Different endpoints nest the list differently (data.pcs, data.data, data...).
 */
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s safety timeout

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
