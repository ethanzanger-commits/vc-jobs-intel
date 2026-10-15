# VC Jobs Intel (multi-user)

Tracks open jobs at VC-backed companies and scores them against **each person's own profile**.

- **Shared catalog** (VC firms, portfolio companies, jobs, scan history): maintained by an admin and the scanner; everyone reads it.
- **Private per person** (profile, scores, application statuses, alerts): protected by Postgres Row Level Security and the user's own login token.

| Path | What it is |
|---|---|
| `src/ingest/` | ATS detector; Greenhouse, Lever, Ashby, Workable readers; lifecycle + dedupe |
| `src/scan.mjs`, `src/scan-job.mjs` | Scan runner (JSON file or Supabase) and the per-user notification step |
| `src/store/supabase.mjs` | Supabase client (service-role for scans; anon key + user token for people) |
| `src/match/` | Profile model (templates, validation) and explainable 0-100 scoring |
| `src/notify/` | Per-user, deduplicated alerts; channel interface for email/Telegram later |
| `src/web/`, `api/` | Login, sessions, profile editor, dashboard, application status, admin scan, account deletion |
| `src/import-companies.mjs` | Import portfolio companies + VC links (verified only with an evidence URL) |
| `tools/site-check/` | Checks each VC's site for a portfolio jobs board |
| `db/001..003_*.sql`, `db/rls_check.sql` | Schema, scanner columns, multi-user policies, isolation check |
| `docs/HOW_TO_BUILD.md` | Step-by-step setup and deployment |

## Quick start
`npm test` then follow **docs/HOW_TO_BUILD.md**.

Local single-user mode (no database): `cp data/companies.example.json data/companies.json`, edit, `npm run scan`, `node src/build-page.mjs --store data/store.json`.

## How multiple users work
- People sign in with email + password (Supabase Auth). Sessions live in HttpOnly cookies; the server then queries the database **as that user**, so the database itself refuses to return anyone else's rows.
- `ALLOW_SIGNUP=false` (default) = invite-only: create users in Supabase and they set a password from the emailed link. `true` = open sign-up (turn on email confirmation in Supabase).
- Each user builds a profile (template, weights, skills, function priorities, locations). **Until they save one they see no scores**, never someone else's.
- Alerts are generated per user from their own profile and are deduplicated. Source-failure alerts go to admins only.
- Only admins (`ADMIN_USER_IDS`) can trigger scans. Scans hit third-party sites, so they are shared and rate-limited.
- A user can delete their account and all their data from the profile page.

## Security notes
- RLS on every table; users cannot write shared data (`003_multiuser.sql` revokes it). Run `db/rls_check.sql` after setup to verify.
- Service-role key is used only by scans/imports/account deletion; per-user requests never use it (tested).
- CSRF: SameSite=Lax cookies plus a required custom header on every write. Strict CSP, no-store caching, no HTML injection (all job text rendered with `textContent`).
- Login errors and password-reset replies never reveal whether an email has an account. Supabase Auth applies its own rate limits to sign-in attempts.

## Not built yet (be aware)
- Contacts + outreach tracker UI (tables exist), saved searches, change-email, email/Telegram alert delivery
- Comeet adapter (needs a per-company token) and custom careers pages without an ATS
- Data-quality dashboard, charts, full Next.js app from `CLAUDE.md`
- Admin UI for the catalog (use `src/import-companies.mjs`)
- Vendor API endpoints were written from memory of their docs and tested only against fakes; the Supabase RLS policies are verified by `db/rls_check.sql`, not by the automated tests (those emulate them). Check both on first real run.
- Not legal advice: if you invite other people, add your own privacy policy/terms and check scraping terms of the sites you scan.
