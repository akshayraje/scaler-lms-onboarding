# Scaler Respect@Work — Vercel deployment guide

This is the HTML training course, rebuilt to deploy on Vercel with real
Google Workspace SSO and an admin completion dashboard. The course content
itself (15 modules, both case studies, quizzes, final exam) is unchanged —
what changed is how login, progress, and reporting work:

| | Before (standalone) | Now (this version) |
|---|---|---|
| Login | Manual name/email form | Real Google Sign-In, domain-verified |
| Progress storage | Browser-only (`window.storage`) | Postgres database, server-side |
| Exam grading | Client-side JavaScript | Server-side (can't be faked) |
| Admin view | None | Dashboard: completion stats, roster, audit log |

`/api/*` are **Vercel Functions** (serverless) — there's no server to run or
manage. `public/index.html` is served as a static file.

---

## Step 1 — Push this project to GitHub

Vercel deploys from a Git repo. Create a new repo (GitHub, GitLab, or
Bitbucket all work) and push this whole folder to it.

```bash
cd scaler-respect-at-work
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

---

## Step 2 — Decide which domain hosts this

You mentioned `scaler.com` as the main domain and `people.scaler.com` as a
subdomain. Before going further, pick **one specific hostname** for this
course — e.g. `respect.scaler.com` or `training.scaler.com` (I'd avoid
reusing `people.scaler.com` if that's already your HRMS or another system —
a dedicated subdomain keeps this cleanly separable). Whatever you choose,
you'll need it for both Step 4 (Vercel domain) and Step 5 (Google OAuth), and
it has to match exactly in both places or login will fail.

---

## Step 3 — Import the project into Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** →
   select the repo from Step 1.
2. Framework preset: Vercel should auto-detect **Other** (no framework) —
   that's correct, since this is plain HTML + serverless functions, no
   build step needed.
3. Don't deploy yet if you can help it — add the environment variables
   (Step 6) and the Postgres database (Step 4) first, so the first deploy
   already works end-to-end. If you've already deployed, that's fine too —
   just redeploy after Steps 4–6.

---

## Step 4 — Add a Postgres database

1. In your Vercel project → **Storage** tab → **Create Database** →
   **Postgres** (this is Neon-backed, managed by Vercel).
2. **Connect** it to this project. Vercel automatically injects
   `POSTGRES_URL` and related env vars — you don't set a connection string
   by hand.
3. The database schema (`users`, `progress`, `exam_attempts`, `certificates`,
   `audit_log`) is created automatically on first API call — there's no
   separate migration step to run.

---

## Step 5 — Set up Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs &
   Services → Credentials → Create Credentials → OAuth client ID** →
   Application type **Web application**.
2. **Authorized JavaScript origins**: add
   `https://<your-domain-from-step-2>` (e.g. `https://respect.scaler.com`),
   plus `http://localhost:3000` if you'll test locally.
3. Under **OAuth consent screen**, set **User type** to **Internal** if
   this is inside your Google Workspace org — that restricts sign-in to
   your organization at the Google level, on top of the domain check this
   app also does server-side.
4. Copy the generated **Client ID**.

---

## Step 6 — Configure environment variables in Vercel

Project → **Settings → Environment Variables**, add each of these
(reference `.env.example` for the full list):

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | From Step 5 |
| `COMPANY_DOMAIN` | `scaler.com` |
| `ADMIN_EMAILS` | Comma-separated HR/L&D emails, e.g. `hr-admin@scaler.com` |
| `SESSION_SECRET` | A long random string — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `COOKIE_SECURE` | `true` |

`POSTGRES_URL` and friends are already set from Step 4 — don't add those
manually.

---

## Step 7 — Point the frontend at your Google Client ID

One manual edit, because `public/index.html` is a static file (no build
step to inject env vars into it): open it and find the `CONFIG` block near
the top of the `<script>` tag, then set:

```js
const CONFIG = {
  GOOGLE_CLIENT_ID: "paste-the-same-client-id-from-step-5",
  COMPANY_DOMAIN: "scaler.com",
};
```

These two values aren't secrets (a Client ID and a domain name are meant to
be public), so hardcoding them here is fine — just make sure they match
Step 5 and Step 6 exactly. Commit and push this change.

---

## Step 8 — Add your custom domain

Project → **Settings → Domains** → add the hostname from Step 2 (e.g.
`respect.scaler.com`). Vercel will show you a DNS record (usually a CNAME)
to add at whoever manages `scaler.com`'s DNS. Once it verifies, that domain
serves this project over HTTPS automatically.

---

## Step 9 — Deploy and test

1. Push to `main` (or redeploy from the Vercel dashboard) — this triggers a
   production deployment.
2. Visit your domain. Sign in with a real `@scaler.com` Google account and
   walk the whole course: login → a few modules → close the tab → come
   back → confirm it resumed → finish all modules → fail the exam once on
   purpose → retake → pass → certificate appears with a verification link.
3. Try signing in with a personal `@gmail.com` account — it should be
   rejected (tests the domain restriction in `api/auth/google.js`).
4. Add your own email to `ADMIN_EMAILS`, reload, and confirm the "Admin
   dashboard" button appears in the top bar.

---

## Step 10 — Using the admin dashboard

Once signed in as an admin email, the top-bar button opens:

- **Roster tab** — every employee who's signed in, with % of modules
  complete, latest exam score, certified/in-progress/not-started status,
  and last sign-in time. Summary cards at the top give you the headline
  numbers: total employees, completed & certified, in progress, not
  started — this is the "who's done, who isn't" report you asked for.
- **Audit log tab** — every login, denied login, module completion, exam
  submission, and certificate issuance, newest first, with timestamp and
  IP.

Both are served from `/api/admin/roster` and `/api/admin/audit-log`, which
check `ADMIN_EMAILS` server-side — a non-admin hitting those URLs directly
gets a 403, not data.

---

## A few honest things to know

- **I built and syntax-validated every file in this project**, and
  independently re-tested the exam grading logic (pass/fail/malformed
  input) — but I don't have a live Vercel account or a real Postgres
  instance to deploy against from here, so I haven't watched this run
  end-to-end myself. Budget time for Step 9's test pass before telling
  employees it's live.
- **Vercel Functions have a default execution timeout** (10s on Hobby, 60s
  on Pro as of writing) — nothing in this app should come close to that,
  but if you ever add heavier admin reports, keep it in mind.
- **Vercel Postgres (Neon) has its own free-tier storage/row limits** —
  fine for a single company's employee base, but check current limits on
  Vercel's pricing page if your org is very large.
- Same legal caveat as always: have HR/legal review the IC timelines and
  POCSO reporting steps in the course content against your actual internal
  policy before go-live.
