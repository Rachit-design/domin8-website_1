/**
 * icafe-games.js
 * -----------------------------------------------------------------------------
 * Server-side integration with the iCafeCloud gameLogs endpoint.
 *
 * DO NOT EDIT icafecloud.js — this is a separate module.
 *
 * Two modes (automatic, no code changes needed):
 *   DEMO MODE  — ICAFE_TOKEN not set → returns realistic static game data
 *   LIVE MODE  — credentials set     → calls GET /gameLogs, counts per game
 *                                      over the last 7 days, returns top 10.
 *
 * Cache TTL: 5 minutes (300 000 ms).
 * API rate-limit: 200 calls/min — caching keeps us well under that.
 * -----------------------------------------------------------------------------
 */

'use strict';

const ICAFE_BASE_URL = process.env.ICAFE_BASE_URL || 'https://api.icafecloud.com';
const ICAFE_CAFE_ID  = process.env.ICAFE_CAFE_ID  || '';
const ICAFE_TOKEN    = process.env.ICAFE_TOKEN    || '';

const LIVE_MODE    = Boolean(ICAFE_TOKEN && ICAFE_CAFE_ID);
const CACHE_TTL_MS = 300_000; // 5 minutes

// ---- Demo data ----------------------------------------------------------------
const DEMO_GAMES = [
  { name: 'Valorant',          playCount: 847, category: 'FPS'         },
  { name: 'CS2',               playCount: 623, category: 'FPS'         },
  { name: 'GTA V',             playCount: 412, category: 'Open World'  },
  { name: 'Fortnite',          playCount: 389, category: 'Battle Royale'},
  { name: 'Apex Legends',      playCount: 301, category: 'Battle Royale'},
  { name: 'PUBG',              playCount: 278, category: 'Battle Royale'},
  { name: 'Minecraft',         playCount: 245, category: 'Sandbox'     },
  { name: 'League of Legends', playCount: 198, category: 'MOBA'        },
  { name: 'Rocket League',     playCount: 167, category: 'Sports'      },
  { name: 'FIFA 25',           playCount: 134, category: 'Sports'      },
];

// ---- In-memory cache ----------------------------------------------------------
let cache = { data: null, fetchedAt: 0 };

// ---- Helpers ------------------------------------------------------------------

/**
 * Normalise whatever shape the API returns into a plain array.
 * Mirrors the pattern in icafecloud.js::extractPcArray.
 */
function extractArray(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  const d = json.data ?? json;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data))      return d.data;
  if (d && Array.isArray(d.list))      return d.list;
  if (d && d.data && Array.isArray(d.data.data)) return d.data.data;
  return [];
}

// ---- Live fetch ---------------------------------------------------------------

/**
 * Hit the gameLogs endpoint, count play sessions per game over last 7 days,
 * return top 10 sorted by play count descending.
 */
async function fetchLiveGames() {
  const now  = new Date();
  const ago  = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const pad  = (n) => String(n).padStart(2, '0');
  const fmt  = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Try date-range params; the API may ignore unknown params gracefully.
  const url = `${ICAFE_BASE_URL}/api/v2/cafe/${ICAFE_CAFE_ID}/gameLogs`
    + `?start_date=${fmt(ago)}&end_date=${fmt(now)}&per_page=1000`;

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 8000);

  let res;
  try {
    res = await fetch(url, {
      method:  'GET',
      headers: { Authorization: `Bearer ${ICAFE_TOKEN}`, Accept: 'application/json' },
      signal:  controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`iCafeCloud gameLogs → ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const logs = extractArray(json);

  if (logs.length === 0) {
    throw new Error('gameLogs returned empty or unrecognised shape');
  }

  // Count per game name; also collect category if the API provides it.
  const counts     = {};
  const categories = {};

  for (const log of logs) {
    // Try every field name the API might use for the game title.
    const name = log.game_name || log.gameName || log.game
               || log.app_name || log.appName  || log.name
               || log.title;
    if (!name || typeof name !== 'string' || !name.trim()) continue;

    const key = name.trim();
    counts[key] = (counts[key] || 0) + 1;

    if (!categories[key]) {
      categories[key] = log.game_category || log.category || log.genre || null;
    }
  }

  return Object.entries(counts)
    .map(([name, playCount]) => ({ name, playCount, category: categories[name] || null }))
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 10);
}

// ---- Public API ---------------------------------------------------------------

/**
 * Returns { games: [...], source: 'live'|'cache'|'demo' }.
 * Never throws — falls back to stale cache or demo data on any error.
 */
async function getTrendingGames() {
  const now = Date.now();

  // Serve fresh cache.
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { games: cache.data, source: 'cache' };
  }

  // Demo mode — no credentials.
  if (!LIVE_MODE) {
    const games = DEMO_GAMES.slice();
    cache = { data: games, fetchedAt: now };
    return { games, source: 'demo' };
  }

  // Live fetch.
  try {
    const games = await fetchLiveGames();
    cache = { data: games, fetchedAt: now };
    return { games, source: 'live' };
  } catch (err) {
    console.error('[icafe-games] live fetch failed:', err.message);
    // Serve stale cache if available; otherwise demo.
    if (cache.data) return { games: cache.data, source: 'cache' };
    return { games: DEMO_GAMES.slice(), source: 'demo' };
  }
}

module.exports = { getTrendingGames };
