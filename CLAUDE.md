# Israeli VC Portfolio Jobs Intelligence

> STATUS: the repo now implements most of this spec as a multi-user app (see README.md). Use this file for the parts still to build: contacts/outreach UI, saved searches, data-quality dashboard, charts, more adapters.

Private, single-user job intelligence dashboard. Tracks open jobs at VC-backed Israeli tech companies, scores them against my profile, and tracks applications and outreach. NOT a generic job board. Data accuracy and ingestion reliability beat features.

## Candidate (seed for candidate_profiles)
~10 yrs agency-side marketing/partnerships. Paid media (Meta, TikTok, Amazon DSP, The Trade Desk), retail media (Amazon, Walmart, Instacart, Kroger), partnerships, media strategy, US brands/budgets/GTM. Targets senior Partnerships, GTM, Marketing Manager/Director roles at Israeli tech (B2B SaaS, AdTech, MarTech, Fintech), especially companies selling into the US. Preferred: Jerusalem, hybrid, remote, Tel Aviv.

## Stack
Next.js (App Router) + TypeScript, Tailwind, shadcn/ui, Supabase Postgres + Auth + RLS, Vercel + Vercel Cron, Vitest. Inspect the repo first; reuse existing infra. Latest stable deps.

## Non-negotiables
1. Never invent portfolio companies, investor relationships, job details, posting dates, salaries, emails, phones or calendar links. Unknown = null / `unverified`.
2. Every VC-company relationship needs `evidence_url` to be `verified`. Seed VCs are not a claim of active Israeli investments.
3. Source data and AI-generated analysis live in separate columns/tables and are labeled separately in the UI.
4. A failed fetch NEVER closes a job and NEVER means "no open jobs".
5. Respect robots.txt, ToS, rate limits. No CAPTCHA/auth bypass. Official/public APIs only.
6. Service-role key and API keys server-only. Private tables protected by RLS (`user_id = auth.uid()`).
7. No outreach is sent automatically. Ever.
8. The matcher never silently excludes a job; low scores are shown, filterable, with reasons.

## Job lifecycle (the core logic)
Per job: `open | possibly_stale | closed`. Per source: `ok | failed | never_scanned`.
- Scan success: upsert all returned jobs, set `last_seen_at`, reset `missed_scans=0`. If a closed job reappears -> status `open`, emit `reopened` notification.
- Job absent from a SUCCESSFUL, COMPLETE fetch: `missed_scans += 1`. Mark `possibly_stale` at 1, `closed` at 2 consecutive misses (configurable). Set `closed_at`.
- Scan failed (HTTP error, timeout, parse error, partial/empty-suspicious result): touch nothing on jobs. Mark source `failed`, store error, retry with exponential backoff + jitter (max 3 per run). Emit `source_failure` notification once per failure streak.
- Sanity guard: if a successful fetch returns 0 jobs but source previously had >0, treat as suspicious -> `failed`, do not increment misses.
- Display statuses per company: Confirmed open / Possibly stale / Confirmed closed / Scan failed / Not yet scanned. Stale = last successful scan older than 2x scan interval.
- `first_discovered_at` (ours) is separate from `posted_at` (source, nullable, never guessed).

## Dedupe
1. `(source_id, external_id)` unique when ATS provides an ID.
2. Else canonical URL (strip utm/gh_src/tracking params, lowercase host, trim slash).
3. Else `fingerprint = sha256(company_id | normalized_title | normalized_location)`.
Same job cross-posted on two sources: link via `canonical_job_id`, show once with multiple sources.
Content changes (title, location, description hash) write a `job_snapshots` row.

## Adapter interface (src/lib/ingest/adapters/)
```ts
interface SourceAdapter {
  id: 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'careers_page' | 'manual';
  detect(url: string): Promise<{ matches: boolean; identifier?: string }>;
  fetchJobs(source: JobSource, ctx: { signal: AbortSignal }): Promise<FetchResult>;
}
type FetchResult =
  | { ok: true; complete: boolean; jobs: RawJob[]; rawCount: number }
  | { ok: false; retryable: boolean; error: string; httpStatus?: number };
type RawJob = { externalId?: string; title: string; url: string; location?: string;
  departmentRaw?: string; workplaceType?: string; postedAt?: string; descriptionHtml?: string;
  salary?: { min?: number; max?: number; currency?: string; period?: string } };
```
Normalizer maps RawJob -> jobs row. Classification (function, seniority) is a separate, labeled step.
Public endpoints (verify against current docs before coding):
- Greenhouse Job Board API: `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`
- Lever Postings API: `api.lever.co/v0/postings/{company}?mode=json`
- Ashby public job posting API: `api.ashbyhq.com/posting-api/job-board/{name}`
- Workable: use only the documented public widget/API; otherwise manual attention.

## Scoring model (0-100, weights editable, stored in candidate_profiles.weights)
Defaults: skills/experience 30, function 25, seniority 15, location/work arrangement 15, US market/GTM 10, industry 5.
Each component returns `{score, max, reason}`; Scores are computed per signed-in user at read time from `candidate_profiles.profile` (multi-user; `job_matches` is unused) and the breakdown is shown in the UI. Function priority order: Growth, Performance, UA, Paid Media, Demand Gen, Digital, Marketing Manager, Brand, Partnerships/BD, US GTM, Marketing Ops, Account Mgmt/AdTech. Deterministic rules first (keyword/title mapping); optional LLM pass only for classification and rationale text, stored as `generated`.

## Phases (verify each before moving on; do not stop at plans)
1. Inspect repo. Write docs/ARCHITECTURE.md (stack, reuse, risks). Gate: I review.
2. Apply `001_schema.sql` as a migration, seed 27 VC firms (name, type, website only). Gate: tables + RLS verified, seed counts match.
2b. VC site check: for each firm, fetch the official homepage (respect robots.txt), look for Jobs/Careers/Talent/Portfolio-jobs links and known board platforms (Getro, Consider, etc.). Record `jobs_board_url`, `jobs_board_platform`, status `found`/`none`. Firms with `none` are skipped for board ingestion (their portfolio companies are still scanned via each company's own ATS). A firm's own hiring page (e.g. Entree's Office Manager posting) is NOT a portfolio jobs board.
3. Dashboard shell, VC directory + detail, company CRUD with investor linking, jobs feed with filters/pagination/saved searches. Real persisted data.
4. Greenhouse + Lever adapters end to end, with a fixture-backed integration test showing: ingest, dedupe, update (snapshot), disappear -> possibly_stale -> closed, reappear -> reopened, failed fetch -> no closure. Add Ashby if time.
5. Scan runner, `/api/cron/scan` (protected by `CRON_SECRET`), Scan now, per-company scan, scan history, notifications.
6. Candidate profile editor, scoring, saved jobs, application tracker, contacts + outreach tracker, data-quality dashboard.
7. Vitest unit tests (lifecycle, dedupe, scoring, URL canonicalization), README (setup, migrations, env vars, scanning, Vercel deploy), `.env.example`.

## Portfolio research rules
Populate portfolios only from the VC's official portfolio page or another cited source. Store `evidence_url` and `verification_status` (verified | unverified | disputed). Do this per firm as a research task with citations, not from memory. Some seed firms (e.g. a16z, Sequoia, Bessemer, Lightspeed, Insight, Battery) have large global portfolios: only track their Israeli-linked companies.

## UI
Dark navy + warm off-white, restrained brass accent. Sidebar: Overview, VCs, Companies, Jobs, Saved, Applications, Contacts, Scans, Data Quality, Settings. Compact tables, clear status chips, empty/loading/error states, mobile-friendly. No hero sections or decorative animation.

## Env vars (document all in README)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (server only), CRON_SECRET, optional SEARCH_API_KEY (discovery; app works without it), optional ANTHROPIC_API_KEY (classification/rationales; deterministic fallback without it).
