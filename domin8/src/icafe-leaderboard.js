/**
 * icafe-leaderboard.js
 * -----------------------------------------------------------------------------
 * Server-side integration with the iCafeCloud memberRanking endpoint.
 *
 * DO NOT EDIT icafecloud.js — this is a separate module.
 *
 * Two modes (automatic, no code changes needed):
 *   DEMO MODE  — ICAFE_TOKEN not set → returns realistic static leaderboard
 *   LIVE MODE  — credentials set     → calls GET /billingLogs/action/memberRanking
 *                                      returns top 10 members by usage time
 *                                      this month.
 *
 * Cache TTL: 10 minutes (600 000 ms).
 * -----------------------------------------------------------------------------
 */

'use strict';

const ICAFE_BASE_URL = process.env.ICAFE_BASE_URL || 'https://api.icafecloud.com';
const ICAFE_CAFE_ID  = process.env.ICAFE_CAFE_ID  || '';
const ICAFE_TOKEN    = process.env.ICAFE_TOKEN    || '';

const LIVE_MODE    = Boolean(ICAFE_TOKEN && ICAFE_CAFE_ID);
const CACHE_TTL_MS = 600_000; // 10 minutes

// ---- Demo data ----------------------------------------------------------------
const DEMO_PLAYERS = [
  { rank:  1, name: 'Bouncing Boner', hoursPlayed: 186.5 },
  { rank:  2, name: 'Civic',          hoursPlayed: 152.3 },
  { rank:  3, name: 'Caterpillar',    hoursPlayed: 141.8 },
  { rank:  4, name: 'Money Da',       hoursPlayed: 128.4 },
  { rank:  5, name: 'Zumumu',         hoursPlayed: 119.7 },
  { rank:  6, name: 'Bresinger',      hoursPlayed: 108.2 },
  { rank:  7, name: 'Ghuppi',         hoursPlayed:  96.5 },
  { rank:  8, name: 'GhostByte',      hoursPlayed:  87.1 },
  { rank:  9, name: 'NeonRaider',     hoursPlayed:  79.8 },
  { rank: 10, name: 'FragLord',       hoursPlayed:  72.3 },
];

// ---- In-memory cache ----------------------------------------------------------
let cache = { data: null, fetchedAt: 0 };

// ---- Helpers ------------------------------------------------------------------

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

/**
 * Convert whatever time format the API returns to a decimal-hours number,
 * rounded to 1 decimal place.
 *
 * The API might return:
 *   - Seconds  (large int, e.g. 540000)
 *   - Minutes  (medium int, e.g. 9000)
 *   - Hours    (small decimal, e.g. 150.0)
 *   - String   "HH:MM" or "HH:MM:SS"
 */
function toHours(raw) {
  if (raw == null) return 0;

  if (typeof raw === 'number') {
    if (raw > 10_000) return Math.round(raw / 3600 * 10) / 10; // likely seconds
    if (raw > 500)   return Math.round(raw / 60   * 10) / 10;  // likely minutes
    return Math.round(raw * 10) / 10;                           // already hours
  }

  if (typeof raw === 'string') {
    const parts = raw.split(':').map(Number);
    if (parts.length >= 2) {
      // "HH:MM" or "HH:MM:SS"
      return Math.round((parts[0] + parts[1] / 60 + (parts[2] || 0) / 3600) * 10) / 10;
    }
    return Math.round(parseFloat(raw) * 10) / 10;
  }

  return 0;
}

// ---- Live fetch ---------------------------------------------------------------

async function fetchLiveLeaderboard() {
  // Try both period=month and days=30 — the API may support either or neither.
  const url = `${ICAFE_BASE_URL}/api/v2/cafe/${ICAFE_CAFE_ID}`
    + `/billingLogs/action/memberRanking?period=month&days=30&per_page=10`;

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
    throw new Error(`iCafeCloud memberRanking → ${res.status} ${res.statusText}`);
  }

  const json    = await res.json();
  const members = extractArray(json);

  if (members.length === 0) {
    throw new Error('memberRanking returned empty or unrecognised shape');
  }

  return members.slice(0, 10).map((m, i) => {
    // Try every common field name for member display name.
    const name = m.member_name || m.memberName || m.name
               || m.nickname   || m.username   || m.account
               || `Player ${i + 1}`;

    // Try every common field name for usage time.
    const rawTime = m.total_time    || m.totalTime
                  || m.total_hours  || m.totalHours
                  || m.hours        || m.duration
                  || m.usage_time   || m.usageTime
                  || m.play_time    || m.playTime
                  || 0;

    return { rank: i + 1, name: String(name).trim(), hoursPlayed: toHours(rawTime) };
  });
}

// ---- Public API ---------------------------------------------------------------

/**
 * Returns { players: [...], source: 'live'|'cache'|'demo' }.
 * Never throws — falls back gracefully.
 */
async function getLeaderboard() {
  const now = Date.now();

  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { players: cache.data, source: 'cache' };
  }

  if (!LIVE_MODE) {
    const players = DEMO_PLAYERS.slice();
    cache = { data: players, fetchedAt: now };
    return { players, source: 'demo' };
  }

  try {
    const players = await fetchLiveLeaderboard();
    cache = { data: players, fetchedAt: now };
    return { players, source: 'live' };
  } catch (err) {
    console.error('[icafe-leaderboard] live fetch failed:', err.message);
    if (cache.data) return { players: cache.data, source: 'cache' };
    return { players: DEMO_PLAYERS.slice(), source: 'demo' };
  }
}

module.exports = { getLeaderboard };
