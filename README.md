# Scaler Learning — internal LMS & onboarding

Multi-course internal LMS with Google Workspace sign-in and Postgres-backed
progress, assessments, certificates and an audit log. The first course is
**Respect at Work** (POSH & POCSO awareness), ported from the original
single-file Vercel app with its UI and content unchanged.

Runs anywhere Docker + Postgres run (Railway, Render, Fly, a VPS). No Vercel or
Neon dependencies.

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, server actions), TypeScript, `output: "standalone"` |
| DB | Postgres 14+ via `pg` + Drizzle ORM; SQL migrations in `drizzle/` |
| Auth | Auth.js v5 (`next-auth`), Google provider, Workspace domain lock, DB sessions |
| UI | Tailwind CSS v4 + shadcn/ui (Radix); brand tokens in `app/globals.css`, fonts self-hosted via `next/font` |

---

## Run it locally (end-to-end, in Docker)

1. **Google OAuth client** (one-time). In Google Cloud Console → APIs & Services → Credentials →
   *Create OAuth client ID* → *Web application*:
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - OAuth consent screen → User type **Internal**.

   > The original app used the Google One-Tap ID-token flow. This one uses the standard OAuth
   > redirect flow, so it needs the **client secret** and the **redirect URI** above.

2. **Env file**
   ```bash
   cp .env.example .env
   ```
   Fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `COMPANY_DOMAIN`, your email in
   `ADMIN_EMAILS`, and an `AUTH_SECRET`:
   ```bash
   openssl rand -hex 32
   ```

3. **Start the stack** (Postgres + the production image):
   ```bash
   docker compose up --build
   ```
   Open http://localhost:3000. On boot the app applies DB migrations and syncs the course
   catalog automatically.

### Hot-reload dev instead

```bash
docker compose up -d db
```
```bash
pnpm install && pnpm dev
```

Compose publishes Postgres on host port **5433** (set `DB_HOST_PORT` to change it).

### Useful scripts

| | |
|---|---|
| `pnpm test` | Unit tests (grading) |
| `pnpm lint` | Type-check |
| `pnpm db:generate` | Generate a new SQL migration after editing `lib/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations + sync catalog (also runs automatically on server start) |

---

## Deploy on Railway

1. New project → **Deploy from GitHub repo** (Railway picks up the `Dockerfile` via `railway.json`).
2. Add a **PostgreSQL** service.
3. On the app service → Variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `AUTH_URL` = your public URL, e.g. `https://learn.scaler.com`
   - `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `COMPANY_DOMAIN`, `ADMIN_EMAILS`
4. Add the production redirect URI to the Google OAuth client:
   `https://<your-domain>/api/auth/callback/google`
5. Settings → Networking → custom domain (CNAME at your DNS).

Health check: `GET /api/health` (checks DB connectivity). Migrations run on boot under a
Postgres advisory lock, so multiple replicas are safe.

The same image runs unchanged on any other Docker host: give it a `DATABASE_URL` and the env vars above.

---

## Project layout

```
app/
  login/                    Google sign-in (original login screen)
  page.tsx                  Learner dashboard: "Your courses"
  courses/[slug]/           Course player page + server actions (progress, exam, transcript)
  admin/                    Roster & audit log, per course (admin role only)
  api/auth/[...nextauth]/   Auth.js handler
  api/health/               Health check
components/course/          CoursePlayer (rail / mobile drawer), module renderers, kit.tsx building blocks
components/ui/              shadcn/ui primitives (button, badge, table, sheet)
content/courses/
  index.ts                  Course registry
  keys.server.ts            Exam answer keys registry (server-only)
  posh-pocso/course.tsx     Course content
  posh-pocso/exam.server.ts Answer key — never shipped to the browser
lib/
  auth.ts                   Auth.js config: domain lock, admin bootstrap, audit events
  db/schema.ts              Drizzle schema (auth + LMS tables)
  grading.ts                Pure exam grading (unit-tested)
drizzle/                    Generated SQL migrations
scripts/                    migrate
```

### Adding a course

1. Create `content/courses/<slug>/course.tsx` exporting a `CourseDefinition` (see
   `lib/course-types.ts`). For rich text inside modules, use the blocks in
   `components/course/kit.tsx` (`ScenarioBox`, `PlainList`, `TileGrid`, `InfoTile`, …)
   rather than raw class names. Module types available: `welcome`, `info-reveal`, `info-single`,
   `quiz`, `case`, `timeline`, `checklist`, `mythfact`, `exam`, `certificate`.
2. If it has an `exam` module, add `exam.server.ts` with the answer key and register it in
   `content/courses/keys.server.ts`.
3. Register the course in `content/courses/index.ts`. The catalog row is created on next boot.
4. Bump `version` whenever the content or answers change materially; certificates record the version.

### Company-specific details

The Internal Committee members, the complaint helpline email and the POSH policy link live in
**`content/org.ts`** and are shown in the course's "Reporting at Our Company" module and the policy
acknowledgement step. Edit that file (and redeploy) when the committee changes.

### Certification rules

A certificate is issued when the learner has **passed the final assessment** and **ticked the
policy acknowledgement** (the exact statements are stored with a timestamp and IP as audit
evidence). Certificates expire after `validityMonths` (12 for Respect at Work); the learner is
then sent back to the assessment and acknowledgement to renew. Exam options are shuffled per
attempt, correct answers are only shown after a pass, and `content/courses/courses.test.ts`
fails the build if an answer key would let a single-letter strategy pass.

### Background jobs & notifications

Scheduled jobs run on **pg-boss** (queue + cron stored in Postgres, schema `pgboss`), started by
`instrumentation.ts` in every app instance — pg-boss makes sure each cron tick runs once, and each
job also takes a Postgres advisory lock, so several replicas are safe. Set `JOBS_RUNNER=off` on
instances that shouldn't run jobs.

| Job | Schedule (APP_TIMEZONE) | What it does |
|---|---|---|
| HRMS employee sync | daily 02:00 | Pulls the Darwinbox employee master; marks leavers inactive; assigns each course to the employees its **coverage rules** match (creating accounts as needed) |
| Training nudges | daily 10:30 | Nudges (via every configured provider — email, Slack) per each course's **nudge schedule**: after assignment until completed, around certificate expiry, and a recurring **in-progress** reminder (each run, up to N times, only after N days without progress, never on a day with a scheduled nudge) |

All credentials are **environment variables** (see `.env.example`): `SLACK_BOT_TOKEN`, `SMTP_*`
and `DARWINBOX_*` (or `HRMS_PROVIDER=mock`). A channel is active when its variables are set.
**Admin → Settings** holds only the notification mode and templates, plus provider/HRMS status and
"send test" buttons. The Darwinbox field mapping is `DARWINBOX_FIELDS` in `lib/automation/hrms.ts`. Notifications
start in **Dry run**: messages are generated and logged under **Admin → Automation** but not sent.
Only the latest due step is sent per person, and each step is sent at most once (per mode), so
switching to Live never releases a backlog. Jobs can be triggered with **Run now**.

**Per-course settings** (Admin → Courses, table `course_settings`):
*coverage* — rules that must **all** match (AND): joining date (joined in the last N days; future
joiners excluded), department is any of …, designation is any of … (picked from the employee master
in a searchable multi-select; OR within a rule, case-insensitive; each kind of rule at most once), plus "due in N days"; the *nudge schedule* — add/remove steps
(day offset + CC manager) after assignment and around certificate expiry, plus *In-progress course nudges*
(on/off, max nudges, days without progress); and *certificate validity*
in months (or never expires; applies to newly issued certificates). A course's
`defaults` in code seed its row the first time it's registered; after that the database is the
source of truth. Respect at Work was seeded with: new joiners within 30 days, due in 14, valid 12 months,
nudges on day 0/4/9/14+mgr/21+mgr and expiry −7/0/7/14+mgr/21+mgr.

**Notifications are provider-agnostic** (`lib/notifications/`): a nudge is rendered once from its
template and delivered through every configured provider — email and Slack today. At escalation
steps the manager is CC'd; providers without CC support (Slack) deliver to the learner only.
Self-started courses get a soft due date (start + the course's "due in N days"), so `{{due_date}}`
is always set.

**Message templates** (Admin → Settings → Notification templates): three Markdown templates —
*Course assigned*, *Reminder* and *Certificate renewal* — each with a subject and button label.
The same Markdown is rendered to HTML for email and to Slack mrkdwn (`lib/notifications/templates.ts`),
with fields like `{{first_name}}`, `{{department}}`, `{{due_status}}` filled per person (unknown
fields can't be saved). Edits are stored as overrides of the defaults in code and can be reset.

Links in nudges go straight to the course; if the person isn't signed in, they're sent through
Google sign-in and back (`/login?callbackUrl=…`).

**Local testing:** `docker compose up` also starts **Mailpit**, and the app's SMTP defaults point
at it — read the mail at http://localhost:8025 (with `pnpm dev`, set `SMTP_HOST=localhost`,
`SMTP_PORT=1025`, `SMTP_FROM_EMAIL=…`). Set
`HRMS_PROVIDER=mock` to get a few sample new joiners.

**Slack app:** create an app at api.slack.com → OAuth & Permissions → bot scopes `chat:write`,
`users:read`, `users:read.email` → install to workspace → set the `xoxb-` token as `SLACK_BOT_TOKEN`.

### Roles

`user.role` is `learner` | `manager` | `admin`. Emails in `ADMIN_EMAILS` are promoted to
`admin` on sign-in; anyone else can be promoted with SQL until an admin UI lands.

---

## Changes from the original app

- **Exam answer key is server-only.** It used to be in the page source. Per-question feedback is
  still shown (the UX is unchanged), but each answer is revealed by the server only after the
  learner commits to an option. Final grading is server-side as before.
- **No public certificate verification.** The old public `/api/verify/<code>` page (which also had
  an XSS bug) is gone — this is an internal LMS. Certificates keep their code as an internal ID.
- **Admin roster** is one SQL query rather than three per user, and can be filtered per course.
- **Data model is multi-course**: `courses`, `enrollments`, `module_progress`,
  `assessment_attempts`, `certificates` (versioned, optional expiry) and `audit_log`, all keyed by course.

### Styling

Tailwind utilities everywhere; there is no custom CSS beyond the design tokens in
`app/globals.css` (brand colours mapped onto shadcn's semantic tokens, plus `navy`, `brand`,
`success`, `danger`…). Add shadcn components with `pnpm dlx shadcn@latest add <name>`.
Layouts are mobile-first: on phones, the course corridor collapses into a drawer.

## Roadmap

1. ~~Scaffold: Next.js + Postgres + Auth.js + Docker~~
2. ~~Port POSH course~~
3. Learner dashboard polish, admin filters, CSV export
4. Assignments: rules (dept/role), due dates, manager view, reminder emails
5. Onboarding journeys (courses + tasks + acknowledgements, relative to joining date)
