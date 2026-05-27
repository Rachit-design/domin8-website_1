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
const path = require('path');
const { getPcStatus, LIVE_MODE } = require('./icafecloud');

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
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: LIVE_MODE ? 'live' : 'demo',
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

// TEMP DEBUG — remove after confirming live counter works
app.get('/api/debug-icafe', async (_req, res) => {
  if (!process.env.ICAFE_TOKEN || !process.env.ICAFE_CAFE_ID) {
    return res.json({ error: 'No credentials set' });
  }
  const cafeId = process.env.ICAFE_CAFE_ID;
  const token  = process.env.ICAFE_TOKEN;
  const endpoints = [
    `https://api.icafecloud.com/api/v2/cafe/${cafeId}/bootPcs?per_page=500`,
    `https://api.icafecloud.com/api/v2/cafe/${cafeId}/boot-pcs-apis`,
    `https://api.icafecloud.com/api/v2/cafe/${cafeId}/pcs`,
  ];
  const results = {};
  for (const url of endpoints) {
    const key = url.split(cafeId + '/')[1];
    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = text.slice(0, 800); }
      if (data && data.data && Array.isArray(data.data)) {
        results[key] = { status: r.status, shape: 'data.data[]', sample: data.data.slice(0,2), total: data.data.length };
      } else if (Array.isArray(data)) {
        results[key] = { status: r.status, shape: 'array', sample: data.slice(0,2), total: data.length };
      } else {
        results[key] = { status: r.status, raw: JSON.stringify(data).slice(0,600) };
      }
    } catch(e) {
      results[key] = { error: e.message };
    }
  }
  res.json(results);
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

  // --- Where to deliver the message --------------------------------------
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
  // -----------------------------------------------------------------------

  console.log('[contact] new message:', { name, email, message: message.slice(0, 200) });
  res.json({ ok: true, message: 'Thanks! We will get back to you soon.' });
});

// -----------------------------------------------------------------------------
// API: community join (name + gamer tag + email). Stores for your sales pipeline.
// To connect to a Google Sheet / Mailchimp / Brevo / Discord webhook later, add
// it where indicated. For now it validates + logs + appends to a local file.
// -----------------------------------------------------------------------------
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

  console.log('[join] new signup:', entry);
  res.json({ ok: true, message: 'Welcome to the community!' });
});

// Blog page — defined before static middleware so /blog works cleanly
app.get('/blog', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'blog.html'));
});

// -----------------------------------------------------------------------------
// Static website. Served last so API routes take priority.
// -----------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA-ish fallback: any unknown non-API route returns the homepage.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('────────────────────────────────────────────────────────');
  console.log(`  Domin8 Esports site running on http://localhost:${PORT}`);
  console.log(`  iCafeCloud mode: ${LIVE_MODE ? 'LIVE ✅' : 'DEMO (no token set yet) 🧪'}`);
  console.log('────────────────────────────────────────────────────────');
});
