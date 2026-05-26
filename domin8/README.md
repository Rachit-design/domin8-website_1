# Domin8 Esports — Website

A clean, modern, mobile-friendly community website for **Domin8 Esports** (Indore),
with a **live PC-availability counter** powered by your **iCafeCloud** account.

It runs in **two modes automatically**:

| Mode | When | What the counter shows |
|------|------|------------------------|
| 🧪 **Demo** | No API token set | Realistic, time-of-day-aware fake numbers (so the site looks alive while you set things up) |
| ✅ **Live** | Token + Cafe ID set | Real PC occupancy pulled from iCafeCloud |

**You never edit code to go live** — you just fill in two environment variables.

---

## 1. Quick start (local)

> Requires **Node.js 18 or newer**.

```bash
# from the project folder
npm install
npm start
```

Open <http://localhost:3000>. The counter will run in **demo mode** until you add credentials.

To auto-restart while editing:
```bash
npm run dev
```

Run the logic tests:
```bash
npm test
```

---

## 2. Project structure

```
domin8/
├─ src/
│  ├─ server.js          # Express server: serves the site + the API
│  └─ icafecloud.js      # The ONLY file that talks to iCafeCloud (token stays here, server-side)
├─ public/               # The website itself (static)
│  ├─ index.html
│  ├─ styles.css
│  ├─ main.js            # Live counter, menu, contact form, scroll reveals
│  └─ assets/
│     ├─ logo.svg                  # your logo
│     ├─ hero-placeholder.svg      # ← replace with your hero photo
│     ├─ space-placeholder.svg     # ← replace with a floor photo
│     └─ community-placeholder.svg # ← replace with a community photo
├─ test/test-icafecloud.js
├─ .env.example          # copy to .env and fill in
└─ package.json
```

---

## 3. Replacing placeholder content (your job — easy)

Everything you’ll want to customise is marked with comments in the code.

**Images** — drop your real files into `public/assets/` and either reuse the
same filenames, or update the `src="..."` paths in `public/index.html`.
Recommended sizes: hero **1600×900+**, floor/community **1200×600+**.

**Copy / text** — all headlines and paragraphs live in `public/index.html`.
Search for the section comments (e.g. `<!-- HERO -->`, `<!-- WHAT ARE WE -->`).

**Discord link** — open `public/main.js`, line near the top:
```js
const DISCORD_INVITE = 'https://discord.gg/your-invite';
```
Replace with your real invite. Every “Join Discord” / “Register” button uses it.

**Blog posts** — open `public/blog-posts.js`. This is the ONLY file you edit to
add a post. Each post is a small block with 6 plain fields (title, category, date,
image, excerpt, link). To add a post: copy one block, paste it at the top, fill in
the blanks. The website builds the card automatically — no HTML needed. Full
instructions are written at the top of that file.

**Events** — the three event cards are placeholder examples in `index.html`
under `<!-- EVENTS -->`. Edit freely.

**Stats** — the `8+ / 2500+ / 600+ / 20` numbers are in `index.html` under the
`EDIT YOUR STATS HERE` comment block. To change a number, edit only the
`data-target="..."` value (e.g. change `data-target="2500"` to `data-target="3000"`).
The label text sits right below each one. The numbers animate (count up) on scroll
automatically. To remove the `+`, set `data-suffix=""`.

---

## 4. Connecting iCafeCloud (go live) 🔌

This is the part you wanted working and stable. Here’s the whole flow.

### 4a. Why you need a server with a static IP
iCafeCloud binds your API token to **one fixed public IP** for security.
So the live counter must run on a machine with an unchanging IP — i.e. a small
**VPS** (DigitalOcean, Hetzner, AWS Lightsail, etc.). It will **not** work from a
home connection with a changing IP. (Demo mode works anywhere.)

### 4b. Generate your credentials in iCafeCloud
1. Log in at <https://cp.icafecloud.com> using the **primary Admin account**
   (staff/manager accounts can’t create keys).
2. Go to **Settings → API settings**.
3. In **“API Access IP”**, enter the **static public IP of your VPS**.
4. Click **Create / Generate**. **Copy the token immediately** — it’s shown only
   once. (Generating again invalidates the old one.)
5. Note your **Cafe ID** (on your license / billing info).

### 4c. Tell the website about them
On the server, copy the example env file and fill it in:
```bash
cp .env.example .env
```
Edit `.env`:
```env
ICAFE_CAFE_ID=12345            # your cafe id
ICAFE_TOKEN=eyJhbGciOi...      # the token you just generated
TOTAL_PCS=20
```
Restart the server. On boot it will print:
```
iCafeCloud mode: LIVE ✅
```
That’s it — the homepage counter is now real.

### 4d. How the live count is calculated
- The server calls `GET https://api.icafecloud.com/api/v2/cafe/{cafeId}/bootPcs`
  with your `Authorization: Bearer <token>` header.
- It receives the list of all your PCs and counts how many are **in use**.
- To be robust across iCafeCloud versions, a PC is treated as **in use** if
  *any* of these hold: `pc_using=1`, `status=1`, a status string like
  `using`/`busy`/`occupied`, or an attached member/session. Otherwise it’s free.
  (See `isPcInUse()` in `src/icafecloud.js`.)
- Results are **cached for ~15s** so visitor traffic never exceeds iCafeCloud’s
  200-requests/minute limit, and the page stays fast.
- If a live call ever fails, the site **falls back** to the last good value
  (or demo data) instead of breaking. Your homepage never shows an error number.

### 4e. Test the API before going live (optional)
You can confirm your token works using iCafeCloud’s sandbox at
<https://dev.icafecloud.com/docs/> — plug in your Bearer token + Cafe ID and
hit the **Boot PCs** endpoint to see your live JSON.

> **If the field names in your account differ:** open `src/icafecloud.js`, look at
> `isPcInUse()`. It’s written to be easy to adjust — just add/confirm the field
> your account uses (e.g. log one PC object to see its real keys).

---

## 5. The backend API (what your frontend calls)

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/api/pc-status` | GET | `{ inUse, available, total, occupancyPct, source, updatedAt }` |
| `/api/health` | GET | `{ status, mode, uptimeSeconds, time }` |
| `/api/contact` | POST | `{ ok, message }` — accepts `{name,email,message}` |

Example:
```bash
curl http://localhost:3000/api/pc-status
# {"inUse":14,"available":6,"total":20,"occupancyPct":70,"source":"live",...}
```

Your **token is never exposed to browsers** — the browser only ever talks to
your own `/api/pc-status`.

---

## 6. Contact form delivery (optional)

By default the contact form validates input and logs it on the server.
To actually receive messages, the easiest route for a community is a **Discord webhook**:

1. In your Discord server: **Channel settings → Integrations → Webhooks → New Webhook**, copy its URL.
2. Put it in `.env`: `CONTACT_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...`
3. In `src/server.js`, uncomment the Discord block in the `/api/contact` handler.

(Email via SendGrid/Resend/SMTP is also noted in the same place.)

---

## 7. Deploying to your VPS + your domain

A minimal, reliable setup:

```bash
# on the VPS (Ubuntu example)
sudo apt update && sudo apt install -y nodejs npm
git clone <your repo>   # or scp the folder up
cd domin8
npm install --production
cp .env.example .env     # fill in ICAFE_* values
npm install -g pm2       # keeps the app running & restarts on reboot
pm2 start src/server.js --name domin8
pm2 save && pm2 startup
```

Then put **Nginx** in front for your domain + HTTPS:
- Point your domain’s **A record** to the VPS IP.
- Proxy `:80/:443` → `localhost:3000`.
- Get a free SSL cert with `certbot`.

(That same VPS IP is the one you whitelist in iCafeCloud — step 4b.)

---

## 8. Roadmap note

You mentioned wanting a **3D version** later. This codebase is structured so the
backend (`/api/pc-status` and the iCafeCloud integration) is completely
independent of the frontend. When you build the 3D site, it can call the exact
same API — no backend changes needed. Get this stable first; the 3D layer drops
on top cleanly.
```
