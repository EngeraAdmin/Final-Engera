# Engera USA website — demo, deployment & admin setup

## Try it first — demo mode (no setup at all)

Double-click **`START-DEMO.bat`** (or run `node node_modules/vite/bin/vite.js dev`).
Your browser opens on the admin sign-in page with the login already filled in:
**username `admin`, password `admin123`**. The admin comes pre-loaded with practice
content (extra facility, testimonials, phone/address, sample photos in
`dev-demo/sample-photos`), and every feature works: the visual page editor with live
preview, facilities, testimonials, the media library, settings and admin accounts — and
every change shows on the public pages via "View live website".

How it works, and what it is not:

- Practice data is saved in the `.dev-data` folder. **To start over, stop the server,
  delete `.dev-data`, and start again.**
- It exists **only on your own computer, only when run this way** (`vite dev`). It is
  removed from every production build, so the deployed website has no `admin` /
  `admin123` login and no demo data. (Verified: a production build contains none of it,
  and `admin` / `admin123` is refused against a real database.)
- It uses a built-in SQLite file in place of Cloudflare's database and a plain folder in
  place of R2. The real thing is set up in Part B below.

---

Two separate jobs, in this order:

- **Part A — deploy the public website** (no database needed, ~15 minutes). Do this first.
- **Part B — switch on the admin dashboard** (needs a database + file storage, ~20 minutes). Can be done any time after Part A, even months later.

Everything here is done from the **client's own** Cloudflare and GitHub accounts.

> The admin dashboard only works when the site runs on **Cloudflare Workers**.
> Its database (D1) and photo storage (R2) don't exist on Netlify or any other host.
> The public pages work anywhere.

---

## Part A — Deploy the public site (do this first)

`wrangler.toml` ships with the admin database/storage blocks **commented out on
purpose**. Cloudflare refuses to deploy a Worker that points at a database that
doesn't exist yet, so leaving them active would make this first deploy fail.
Leave them commented for now.

1. Make sure the project is on GitHub under the client's account.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Import a repository**
   (connect GitHub, pick the repo).
3. Settings: **Build command** `npm run build` · **Deploy command** `npx wrangler deploy`.
   Keep the Worker/project name identical to `name` in `wrangler.toml`
   (`engera-heart-map`) — a mismatch is a common cause of a failed first build.
4. Deploy. Open the `*.workers.dev` link and click through every page.

Expected: `/admin/login` loads but can't sign anyone in yet — the database isn't
connected. That's normal until Part B.

Command-line alternative (instead of steps 2–4): `npm run build`, then
`npx wrangler login`, then `npx wrangler deploy`.

---

## Part B — Switch on the admin dashboard

You'll need: the Cloudflare login, a terminal in the project folder, and
`npx wrangler login` done once.

### 1. Create the database
```bash
npx wrangler d1 create engera-db
```
It prints a `database_id` (a long code). Keep it for step 7.
(Dashboard alternative: Storage & Databases → D1 → Create; the ID is shown on the database page.)

### 2. Create the photo storage bucket
```bash
npx wrangler r2 bucket create engera-media
```
Cloudflare may ask the account owner to **add a payment method to activate R2**.
That's verification only — R2's free allowance (10 GB storage, 1 million writes,
10 million reads per month, free downloads) is far more than a site like this
uses, and nothing is charged unless that allowance is exceeded.

### 3. Give the bucket a public web address
Uploaded photos have to be viewable by website visitors.
Dashboard → R2 → `engera-media` → **Settings → Public access**.

- Quickest: enable the **r2.dev** address and copy it (looks like `https://pub-xxxx.r2.dev`).
  Cloudflare describes r2.dev as rate-limited and for non-production use — fine to
  get started.
- Better long-term: attach a **custom domain** (e.g. `media.yourdomain.org`) to the
  bucket once the domain is on Cloudflare, and use that instead.

Keep this URL (no trailing slash) for step 7.

### 4. Create the tables and load the existing content
```bash
npx wrangler d1 execute engera-db --remote --file=migrations/0001_init.sql
npx wrangler d1 execute engera-db --remote --file=migrations/0002_seed_existing_content.sql
```
The first command creates the empty tables. The second loads the 8 facilities and
5 testimonials already on the website, so the admin starts out showing — and able to
edit — everything that's currently live. (Safe to run twice; nothing is duplicated.
Switching the admin on does not change how the site looks until someone edits something.)
(Dashboard alternative: D1 → `engera-db` → Console → paste the contents of each file, in that order → Run.)

### 5. Set the login-cookie secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put SESSION_SECRET
```
Paste the printed value when asked. This must be done **after** Part A (the Worker has to exist).

### 6. Create the first admin login
```bash
node scripts/create-admin.mjs "you@example.org" "a strong password"
```
Run the command it prints. Your password is scrambled on your own computer first;
the plain password is never sent or stored. (It also prints the plain SQL if you'd
rather paste it into the dashboard Console.)

### 7. Turn the bindings on, then redeploy
Open `wrangler.jsonc` (repo root). It already lists the D1 database and the R2 bucket.
Replace `PASTE_R2_PUBLIC_URL_HERE` with the URL from step 3 (no trailing slash).
Commit and push — Cloudflare rebuilds and redeploys automatically.
(The R2 bucket must already exist, or Cloudflare refuses the deploy and keeps the previous version live.)

### 8. Test it
Go to `/admin/login`, sign in, click **Edit website**, click the Home page heading in the
preview, type something, and press **Publish**. Then add a facility and upload a photo.

### If login shows "Error 1102 / Worker exceeded resource limits"
Cloudflare's free Workers plan allows only **10 ms of processor time per request**,
and checking a password is deliberately slow (that's what makes stolen passwords hard
to crack). The strongest setting Cloudflare permits (100,000 rounds) may be just over
that on the free plan. If it happens:

```bash
# remove the old login, then recreate it with a lighter setting
npx wrangler d1 execute engera-db --remote --command "DELETE FROM admin_users"
node scripts/create-admin.mjs "you@example.org" "a strong password" 50000
```
Run the printed command. Or move the account to Cloudflare's Workers Paid plan
(about $5/month), which removes the limit. Lighter hashing is a trade-off — use a long,
unique password for the admin account either way.

---

## What the admin can change

The admin is a visual, Wix-style editor. Sign in at `/admin`.

| Screen | What it does |
|---|---|
| **Edit website** | The whole website in a live preview. **Click any part of a page** to edit it in the panel on the left — headings, text, photos, videos, buttons, links and lists (cards, timeline, team, tabs, figures…). Changes show in the preview **as you type**. Hide or show whole sections with the eye icon, drag list items into a new order, preview on desktop / tablet / phone, undo/redo (Ctrl+Z / Ctrl+Shift+Z). Nothing goes live until you press **Publish** (or Ctrl+S). Every page is covered: Home, About Us, Impact, Projects, the facility page template, Get Involved, Contact, plus **Header & footer** (menu labels, footer, donate banner, newsletter form, the key figures, and SEO). Every page also has a "Search & sharing" section for its Google title and description. |
| **Facilities** | Add, edit, hide or delete facilities; drag cards to reorder. Each has a name, region, summary, full description, photo (and its description), **key facts**, **"work carried out" list**, web address and map location (paste the numbers straight from Google Maps). |
| **Testimonials** | Add, edit, delete and reorder quotes; link a quote to a facility; choose whether it shows on the Impact page; one photo or a cross-fading album; optional source line. |
| **Media library** | Drag-and-drop uploads of photos (8 MB), videos (MP4/WebM/MOV, 60 MB) and PDFs (25 MB), shown with whether each file is in use. Every photo field can pick from these uploads, from the website's built-in photos, or from a link. |
| **Settings** | Donate link, contact email/phone/address, Facebook/Instagram/LinkedIn (each can be switched off), Buttondown newsletter username. |
| **Admins & password** | Change your password, add or remove other admins, set a new password for another admin. |

How it behaves:

- Until something is edited, every page shows exactly what it shows today — the original text and photos are the built-in defaults. Each field has a **Reset** link to go back to the original.
- If the database is ever unreachable, the website quietly shows its built-in content instead of breaking.
- **No extra database steps for this version.** The first time the website runs, it adds the new
  tables/columns it needs (media library, facility facts/work lists, testimonial options). It only
  ever adds; it never deletes or changes existing content. Steps 1–8 above are unchanged.
- In `{name}`-style placeholders: the Facility page template uses `{name}` for the facility's name;
  button links can use `{donate}` and `{email}` for the donate link and contact email from Settings.
- Uploaded videos are stored in R2 like photos. For very long videos, YouTube is better (the Home
  page video takes a YouTube link).

Still fixed in the code: page layouts, colours, fonts and animations; the order of sections on a page
(they can be hidden, not moved); the interactive map's drawing.

---

## Email links, contact form & newsletter

### Volunteer / Partner buttons (Get Involved page)
These are plain `mailto:` links. They need **no storage and no setup**: the
visitor's own email app opens with a pre-filled subject, addressed to the contact email
(admin → Settings; until set, `ORG.email` in `src/lib/site.ts`, currently
`lydia.engera@gmail.com`). The button text and links themselves are editable in the admin
(Edit website → Get Involved → Ways to help). Limitation: visitors without an email
app configured get no useful result.
The **Donate** button goes to the organisation's Beacon donation page
(`DONATE_URL` in the same file) — Beacon handles everything.

### Contact form
Also a `mailto:` link today (same limits). It sends to the contact email set in the admin's Settings. A hosted form service such as Web3Forms
(free) sends real emails without needing the visitor's email app — an optional upgrade.

### Newsletter signup
Until it's connected, the form only shows a thank-you message and **stores nothing**. To make it
real (Buttondown) — the username can now be entered in the admin under **Settings → Newsletter**
instead of editing code:

1. Create an account at buttondown.com with the organisation's email. Free for the
   first 100 subscribers; after that it's a paid plan (about $9/month up to 1,000 —
   check buttondown.com/pricing).
2. Note the **username** — the last part of the newsletter's address
   (`buttondown.com/engera` → `engera`).
3. In the admin, open **Settings → Newsletter (Buttondown)**, enter the username and save.
   (Or, without the admin: set `BUTTONDOWN_USERNAME = "engera"` in `src/lib/site.ts` and push.)
   The website form now sends signups straight to Buttondown.
4. In Buttondown settings, set the sender name and reply-to email. To send *from*
   the organisation's own address (e.g. `news@yourdomain.org`), add the few DNS
   records Buttondown lists (easy once the domain is on Cloudflare).
5. Write and send issues from the Buttondown dashboard. Buttondown handles
   confirmation emails and unsubscribe links.
6. Test: subscribe with a personal email and check it appears in Buttondown.
