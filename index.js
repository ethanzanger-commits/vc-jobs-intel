// GENERATED single-file build of the whole app (all of src/). Edit the source repo, not this file.
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/cv/docx.mjs
async function extractRawTextLazy(buf) {
  const mammoth = (await import("mammoth")).default;
  try {
    return (await mammoth.extractRawText({ buffer: buf })).value;
  } catch {
    const { CvError: CvError2 } = await Promise.resolve().then(() => (init_extract(), extract_exports));
    throw new CvError2("We could not read that DOCX file. Try saving it again, exporting to PDF, or paste the text.");
  }
}
var init_docx = __esm({
  "src/cv/docx.mjs"() {
  }
});

// src/cv/extract.mjs
var extract_exports = {};
__export(extract_exports, {
  CvError: () => CvError,
  MAX_BYTES: () => MAX_BYTES,
  extractCvText: () => extractCvText,
  sniff: () => sniff
});
function sniff(buf) {
  if (startsWith(buf, [37, 80, 68, 70, 45])) return "pdf";
  if (startsWith(buf, [80, 75, 3, 4])) return "docx";
  if (startsWith(buf, [208, 207, 17, 224])) return "doc";
  if (buf.includes(0)) return "binary";
  return "text";
}
async function pdfText(buf) {
  const { getDocumentProxy } = await import("unpdf");
  let doc;
  try {
    doc = await getDocumentProxy(new Uint8Array(buf));
  } catch {
    throw new CvError("We could not open that PDF. If it is password-protected or damaged, paste your CV text instead.");
  }
  const lines = [];
  const pages = Math.min(doc.numPages, MAX_PAGES);
  for (let p = 1; p <= pages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    let cur = [], lastY = null;
    const flush = () => {
      const t = cur.join(" ").replace(/\s+/g, " ").trim();
      if (t) lines.push(t);
      cur = [];
    };
    for (const it of tc.items) {
      if (typeof it.str !== "string") continue;
      const y = Math.round(it.transform?.[5] ?? 0);
      if (lastY !== null && Math.abs(y - lastY) > 2) flush();
      cur.push(it.str);
      lastY = y;
      if (it.hasEOL) {
        flush();
        lastY = null;
      }
    }
    flush();
  }
  return lines.join("\n");
}
async function extractCvText(buf, declaredType = "") {
  if (!buf?.length) throw new CvError("That file is empty.");
  if (buf.length > MAX_BYTES) throw new CvError("That file is too large (limit 4 MB). Try a smaller PDF or paste the text.", 413);
  const kind = sniff(buf);
  let text;
  if (kind === "pdf") text = await pdfText(buf);
  else if (kind === "docx") text = await extractRawTextLazy(buf);
  else if (kind === "doc") throw new CvError("Old .doc files are not supported. Save it as PDF or DOCX, or paste the text.");
  else if (kind === "binary") throw new CvError("That file type is not supported. Use PDF, DOCX, or paste the text.", 415);
  else text = buf.toString("utf8");
  text = text.replace(/\r/g, "").replace(/\u0000/g, "").slice(0, MAX_CHARS);
  if (text.trim().length < 80) throw new CvError(kind === "pdf" ? "We could not find readable text (scanned or image-only PDF?). Paste your CV text instead." : "That CV looks too short to analyze.");
  return text;
}
var MAX_BYTES, MAX_PAGES, MAX_CHARS, CvError, startsWith;
var init_extract = __esm({
  "src/cv/extract.mjs"() {
    init_docx();
    MAX_BYTES = 4 * 1024 * 1024;
    MAX_PAGES = 12;
    MAX_CHARS = 6e4;
    CvError = class extends Error {
      constructor(message, code = 400) {
        super(message);
        this.status = code;
      }
    };
    startsWith = (buf, sig) => sig.every((b, i) => buf[i] === b);
  }
});

// src/handlers.mjs
import { timingSafeEqual as timingSafeEqual2 } from "node:crypto";

// src/jobs/normalize.mjs
import { createHash } from "node:crypto";

// src/jobs/robots.mjs
function stripTags(s) {
  return s.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&amp;/g, " ").replace(/\s+/g, " ").trim();
}
function parseRobots(txt, agent = "vc-site-check") {
  const rules = [];
  let agents = [];
  let inRules = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (k === "user-agent") {
      if (inRules) {
        agents = [];
        inRules = false;
      }
      agents.push(v.toLowerCase());
    } else if (k === "allow" || k === "disallow") {
      inRules = true;
      if (v === "") continue;
      if (agents.some((a) => a === "*" || a === agent)) rules.push({ allow: k === "allow", path: v });
    }
  }
  const toRe = (p) => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
  return (path) => {
    let best = null;
    for (const r of rules) {
      if (!toRe(r.path).test(path)) continue;
      if (!best || r.path.length > best.path.length || r.path.length === best.path.length && r.allow) best = r;
    }
    return best ? best.allow : true;
  };
}

// src/cv/skills.mjs
var D = {
  // marketing & growth
  "paid media": ["paid social", "paid search"],
  ppc: ["pay per click"],
  sem: [],
  seo: ["search engine optimization"],
  "content marketing": [],
  "email marketing": ["crm marketing"],
  "marketing automation": ["marketo", "pardot"],
  hubspot: [],
  salesforce: [],
  "google ads": ["adwords", "google adwords"],
  "meta ads": ["facebook ads", "fb ads", "instagram ads"],
  tiktok: ["tiktok ads"],
  "linkedin ads": [],
  "amazon dsp": ["amazon advertising", "amazon ads"],
  "the trade desk": ["ttd"],
  programmatic: ["dv360", "display & video 360"],
  "retail media": ["walmart connect"],
  walmart: [],
  instacart: [],
  kroger: [],
  "demand generation": ["demand gen"],
  "lead generation": ["lead gen"],
  "growth marketing": ["growth hacking"],
  "performance marketing": [],
  "user acquisition": ["ua"],
  "a/b testing": ["ab testing", "split testing"],
  attribution: [],
  "google analytics": ["ga4"],
  "media planning": ["media planner"],
  "media buying": ["media buyer"],
  "campaign management": [],
  "brand marketing": [],
  "product marketing": [],
  "go-to-market": ["gtm", "go to market"],
  partnerships: ["partnership"],
  "business development": [],
  "account management": [],
  affiliate: ["affiliate marketing"],
  influencer: ["influencer marketing"],
  "social media": [],
  copywriting: [],
  "conversion rate optimization": ["cro"],
  "marketing analytics": [],
  "budget management": [],
  "team leadership": ["people management", "team management"],
  // engineering
  javascript: ["js", "ecmascript"],
  typescript: ["ts"],
  python: [],
  java: [],
  "c#": ["csharp"],
  "c++": ["cpp"],
  golang: ["go lang"],
  rust: [],
  ruby: ["ruby on rails", "rails"],
  php: [],
  swift: [],
  kotlin: [],
  scala: [],
  "node.js": ["nodejs", "node"],
  react: ["reactjs", "react.js"],
  angular: [],
  vue: ["vuejs", "vue.js"],
  "next.js": ["nextjs"],
  django: [],
  flask: [],
  fastapi: [],
  spring: ["spring boot"],
  ".net": ["dotnet", "asp.net"],
  graphql: [],
  "rest api": ["restful", "rest apis"],
  sql: [],
  postgresql: ["postgres"],
  mysql: [],
  mongodb: [],
  redis: [],
  kafka: [],
  elasticsearch: [],
  aws: ["amazon web services"],
  azure: [],
  "google cloud": ["gcp"],
  docker: [],
  kubernetes: ["k8s"],
  terraform: [],
  "ci/cd": ["cicd", "continuous integration"],
  jenkins: [],
  git: ["github", "gitlab"],
  linux: [],
  microservices: [],
  html: [],
  css: ["tailwind", "sass"],
  "react native": [],
  android: [],
  ios: [],
  "unit testing": ["jest", "pytest"],
  "system design": [],
  "distributed systems": [],
  // data & ai
  "machine learning": ["ml"],
  "deep learning": [],
  nlp: ["natural language processing"],
  "large language models": ["llm", "llms"],
  pytorch: [],
  tensorflow: [],
  pandas: [],
  numpy: [],
  spark: ["pyspark"],
  airflow: [],
  dbt: [],
  snowflake: [],
  bigquery: [],
  tableau: [],
  "power bi": ["powerbi"],
  looker: [],
  excel: [],
  "data analysis": ["data analytics"],
  "data engineering": ["etl"],
  "data science": [],
  statistics: ["statistical"],
  "data visualization": [],
  // product & design
  "product management": ["product manager"],
  roadmap: ["roadmapping"],
  "user research": [],
  figma: [],
  "ux design": ["ux"],
  "ui design": ["ui"],
  agile: [],
  scrum: [],
  jira: [],
  okrs: ["okr"],
  "product analytics": ["mixpanel", "amplitude"],
  // sales, success, ops
  saas: [],
  b2b: [],
  b2c: [],
  "enterprise sales": [],
  "account executive": [],
  "sales development": ["sdr", "bdr"],
  "customer success": [],
  "solutions engineering": ["sales engineering"],
  crm: [],
  "sales operations": ["revops", "revenue operations"],
  negotiation: [],
  "project management": ["pmp"],
  operations: [],
  "supply chain": [],
  "customer support": [],
  onboarding: [],
  // security, finance, people
  cybersecurity: ["infosec", "information security"],
  "penetration testing": ["pentest"],
  siem: [],
  "identity and access management": ["iam"],
  "cloud security": [],
  "threat detection": [],
  "financial modeling": ["fp&a"],
  accounting: [],
  forecasting: [],
  recruiting: ["talent acquisition"],
  "hr": ["human resources"],
  compliance: [],
  // domain
  adtech: ["ad tech"],
  martech: [],
  fintech: [],
  ecommerce: ["e-commerce"],
  marketplace: [],
  cyber: [],
  healthtech: [],
  "artificial intelligence": ["ai"]
};
var esc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
var TERMS = Object.entries(D).map(([canon, aliases]) => ({
  canon,
  re: new RegExp(`(^|[^a-z0-9+#.])(${[canon, ...aliases].map(esc).join("|")})(?=$|[^a-z0-9+#])`, "gi")
}));
var ALIAS_TO_CANON = /* @__PURE__ */ new Map();
for (const [canon, aliases] of Object.entries(D)) {
  ALIAS_TO_CANON.set(canon, canon);
  for (const a of aliases) ALIAS_TO_CANON.set(a.toLowerCase(), canon);
}
var canonSkill = (s) => ALIAS_TO_CANON.get(String(s).trim().toLowerCase()) ?? String(s).trim().toLowerCase();
var SKILL_TERMS = Object.keys(D);
function findSkills(text) {
  const found = /* @__PURE__ */ new Map();
  const t = String(text ?? "");
  for (const { canon, re } of TERMS) {
    re.lastIndex = 0;
    const n = [...t.matchAll(re)].length;
    if (n) found.set(canon, n);
  }
  return found;
}

// src/cv/functions.mjs
var LEVELS = ["junior", "mid", "senior", "lead", "director", "executive"];
var FUNCTION_CATALOG = [
  ["Growth Marketing", /growth/i],
  ["Performance Marketing", /performance/i],
  ["User Acquisition", /user acquisition|\bUA\b|acquisition/i],
  ["Paid Media", /paid (media|social|search)|\bppc\b|\bsem\b|media buy/i],
  ["Demand Generation", /demand gen/i],
  ["Digital Marketing", /digital marketing/i],
  ["Marketing Management", /marketing manager|head of marketing|vp,? marketing|marketing director|director,? marketing/i],
  ["Brand Marketing", /brand/i],
  ["Content Marketing", /content (marketing|strateg|manager|lead)|copywrit/i],
  ["Product Marketing", /product marketing|\bpmm\b/i],
  ["Partnerships & BD", /partnership|business development|\bbd\b|alliances/i],
  ["Go-to-Market", /go.?to.?market|\bgtm\b|us market/i],
  ["Marketing Operations", /marketing op|martech|marketing automation|revops/i],
  ["Account Management & AdTech", /account (manager|executive|director)|ad ?tech|ad ops|media planner/i],
  ["Sales", /\b(sales|account executive|sdr|bdr)\b/i],
  ["Customer Success & Support", /customer (success|support)|support engineer|solutions? (engineer|consultant)/i],
  ["Product Management", /product (manager|owner|lead|director)|head of product/i],
  ["Software Engineering", /\b(software|full.?stack|mobile|ios|android)\b.*\b(engineer|developer)|\bdeveloper\b|\bengineer\b/i],
  ["Backend Engineering", /back.?end|server.?side/i],
  ["Frontend Engineering", /front.?end|\bui engineer/i],
  ["Full-Stack Engineering", /full.?stack/i],
  ["DevOps / SRE", /devops|\bsre\b|site reliability|platform engineer|infrastructure/i],
  ["Data Engineering", /data engineer/i],
  ["Data Science & ML", /data scien|machine learning|\bml\b|\bai\b/i],
  ["Data & Analytics", /analyst|analytics|\bbi\b/i],
  ["Design / UX", /designer|\bux\b|\bui\b|product design/i],
  ["Security", /security|infosec|appsec/i],
  ["QA", /\bqa\b|quality assurance|test automation/i],
  ["People & Recruiting", /recruit|talent acquisition|\bpeople\b|\bhr\b|human resources/i],
  ["Finance", /finance|accountant|fp&a|controller/i],
  ["Operations", /operations|program manager|business operations/i],
  ["Legal & Compliance", /legal|counsel|compliance/i]
];
var FUNCTION_NAMES = FUNCTION_CATALOG.map(([n]) => n);
var functionOf = (text) => FUNCTION_CATALOG.find(([, re]) => re.test(text ?? ""))?.[0] ?? null;
function levelOf(title) {
  if (/\b(junior|jr\.?|intern|associate|entry|assistant|coordinator)\b/i.test(title ?? "")) return "junior";
  if (/\b(vp|svp|chief|c[a-z]o)\b/i.test(title ?? "")) return "executive";
  if (/\b(director|head of|head)\b/i.test(title ?? "")) return "director";
  if (/\b(lead|principal|staff|manager)\b/i.test(title ?? "")) return "lead";
  if (/\b(senior|sr\.?)\b/i.test(title ?? "")) return "senior";
  return null;
}

// src/jobs/normalize.mjs
var sha = (s) => createHash("sha256").update(s).digest("hex");
var norm = (s) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
var TRACKING = /^(utm_|gh_|lever-)/i;
function canonicalUrl(u) {
  const x = new URL(u);
  x.hash = "";
  for (const k of [...x.searchParams.keys()]) if (TRACKING.test(k) || ["ref", "source", "src"].includes(k)) x.searchParams.delete(k);
  x.hostname = x.hostname.toLowerCase();
  x.pathname = x.pathname.replace(/\/+$/, "") || "/";
  return x.toString();
}
var fingerprint = (companyId, title, location) => sha(`${companyId}|${norm(title)}|${norm(location)}`);
function workplaceFrom(location) {
  const l = norm(location);
  return /\bhybrid\b/.test(l) ? "hybrid" : /\bremote\b/.test(l) ? "remote" : "unknown";
}
var decodeEntities = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
function toJob(raw, { companyId, sourceId }) {
  if (!raw.title || !/^https?:\/\//i.test(raw.url ?? "")) return null;
  const title = raw.title.trim();
  const location_raw = raw.location?.trim() || null;
  const plain = raw.descriptionHtml ? stripTags(decodeEntities(raw.descriptionHtml)) : "";
  const text = `${title} ${raw.department ?? ""} ${plain}`;
  return {
    company_id: companyId,
    source_id: sourceId,
    external_id: raw.externalId != null ? String(raw.externalId) : null,
    canonical_url: canonicalUrl(raw.url),
    apply_url: raw.applyUrl && /^https?:\/\//i.test(raw.applyUrl) ? raw.applyUrl : raw.url,
    fingerprint: fingerprint(companyId, title, location_raw),
    title,
    department_raw: raw.department ?? null,
    location_raw,
    workplace: raw.workplace ?? workplaceFrom(location_raw),
    posted_at: raw.postedAt ?? null,
    salary_min: raw.salary?.min ?? null,
    salary_max: raw.salary?.max ?? null,
    salary_currency: raw.salary?.currency ?? null,
    salary_period: raw.salary?.period ?? null,
    excerpt: plain ? plain.slice(0, 280) : null,
    description_hash: raw.descriptionHtml ? sha(raw.descriptionHtml) : null,
    skills: [...findSkills(text).keys()],
    fn: functionOf(`${title} ${raw.department ?? ""}`),
    level: levelOf(title)
  };
}
var jobKey = (j) => j.external_id ? `id:${j.external_id}` : `fp:${j.fingerprint}`;

// src/db.mjs
var JOB_COLS = ["external_id", "canonical_url", "fingerprint", "title", "department_raw", "location_raw", "workplace", "posted_at", "salary_min", "salary_max", "salary_currency", "salary_period", "apply_url", "excerpt", "description_hash", "skills", "fn", "level", "status", "first_discovered_at", "last_seen_at", "missed_scans", "closed_at", "reopened_at"];
var TS = ["posted_at", "first_discovered_at", "last_seen_at", "closed_at", "reopened_at"];
var iso = (v) => v ? new Date(v).toISOString() : null;
var q = (v) => `"${String(v).replace(/"/g, "")}"`;
var inList = (a) => `in.(${a.map(q).join(",")})`;
var SOURCE_STATUS = { ok: "ok", failed: "failed", needs_manual: "needs_attention", needs_adapter: "needs_attention" };
var URLS = { greenhouse: (i) => `https://boards.greenhouse.io/${i}`, lever: (i) => `https://jobs.lever.co/${i}`, ashby: (i) => `https://jobs.ashbyhq.com/${i}`, workable: (i) => `https://apply.workable.com/${i}` };
var pickRow = (job) => {
  const r = {};
  for (const c of JOB_COLS) r[c] = TS.includes(c) ? iso(job[c]) : job[c] ?? null;
  return r;
};
function createDb({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl = fetch } = {}) {
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  const base = url.replace(/\/$/, "") + "/rest/v1";
  const headers = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
  async function rest(path, { method = "GET", body, prefer = "return=representation" } = {}) {
    const r = await fetchImpl(`${base}/${path}`, { method, headers: { ...headers, prefer }, body: body === void 0 ? void 0 : JSON.stringify(body) });
    if (!r.ok) throw new Error(`Database ${method} ${path.split("?")[0]} failed (HTTP ${r.status})`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }
  async function all(path) {
    const out = [];
    for (let off = 0; ; off += 1e3) {
      const page2 = await rest(`${path}${path.includes("?") ? "&" : "?"}limit=1000&offset=${off}`);
      out.push(...page2);
      if (page2.length < 1e3) return out;
    }
  }
  const chunks = (a, n = 100) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
  const state = { slugToId: /* @__PURE__ */ new Map(), idToSlug: /* @__PURE__ */ new Map(), before: /* @__PURE__ */ new Map(), companies: [] };
  return {
    rest,
    all,
    // ---------- scanner ----------
    async listCompanies() {
      const cos = await all("portfolio_companies?select=id,slug,name,careers_url,last_checked_at&slug=not.is.null");
      const srcs = await all("job_sources?select=company_id,adapter,identifier&enabled=eq.true");
      const ats = /* @__PURE__ */ new Map();
      for (const s of srcs) if (s.adapter !== "careers_page" && s.identifier && !ats.has(s.company_id)) ats.set(s.company_id, { adapter: s.adapter, identifier: s.identifier });
      return cos.filter((c) => c.careers_url || ats.has(c.id)).map((c) => ({ id: c.slug, name: c.name, careers_url: c.careers_url ?? void 0, ats: ats.get(c.id), last_checked_at: c.last_checked_at })).sort((a, b) => (a.last_checked_at ? 1 : 0) - (b.last_checked_at ? 1 : 0) || String(a.last_checked_at).localeCompare(String(b.last_checked_at)));
    },
    async load(companies) {
      state.companies = companies;
      const slugs = companies.map((c) => c.id);
      for (const r of await rest(`portfolio_companies?slug=${inList(slugs)}&select=id,slug`)) state.slugToId.set(r.slug, r.id);
      for (const [s, id5] of state.slugToId) state.idToSlug.set(id5, s);
      const store = { jobs: [], sources: {}, scan_runs: [] };
      const srcIdToSlug = /* @__PURE__ */ new Map();
      for (const s of await all(`job_sources?company_id=${inList([...state.slugToId.values()])}&select=*&order=priority.asc`)) {
        const slug = state.idToSlug.get(s.company_id);
        srcIdToSlug.set(s.id, slug);
        if (!store.sources[slug]) store.sources[slug] = { ...s, _id: s.id };
      }
      for (const r of await all(`jobs?company_id=${inList([...state.slugToId.values()])}&select=*`)) {
        const slug = srcIdToSlug.get(r.source_id) ?? state.idToSlug.get(r.company_id);
        const job = { ...r, company_id: slug, source_id: slug };
        for (const c of TS) job[c] = iso(job[c]);
        store.jobs.push(job);
        state.before.set(r.id, JSON.stringify(pickRow(job)));
      }
      return store;
    },
    async save(store) {
      const idOf = (slug) => state.slugToId.get(slug);
      for (const c of state.companies) {
        const s = store.sources[c.id];
        if (!s) continue;
        const adapter = s.adapter ?? "careers_page";
        const patch = { status: SOURCE_STATUS[s.status] ?? s.status ?? "never_scanned", last_attempt_at: s.last_attempt_at ?? null, last_success_at: s.last_success_at ?? null, consecutive_failures: s.consecutive_failures ?? 0, last_error: s.last_error ?? null, last_job_count: s.last_job_count ?? null };
        if (s._id) await rest(`job_sources?id=eq.${s._id}`, { method: "PATCH", body: { ...patch, adapter, identifier: s.identifier ?? null } });
        else {
          const url2 = s.identifier && URLS[adapter] ? URLS[adapter](s.identifier) : c.careers_url;
          if (!url2) continue;
          const [row] = await rest("job_sources", { method: "POST", body: [{ company_id: idOf(c.id), adapter, identifier: s.identifier ?? null, url: url2, ...patch }] });
          s._id = row.id;
        }
      }
      const toInsert = [];
      for (const j of store.jobs) {
        const src = store.sources[j.source_id];
        if (!src?._id) continue;
        const row = { company_id: idOf(j.company_id), source_id: src._id, ...pickRow(j) };
        if (!j.id) toInsert.push({ j, row });
        else if (state.before.get(j.id) !== JSON.stringify(pickRow(j))) {
          await rest(`jobs?id=eq.${j.id}`, { method: "PATCH", body: row });
          state.before.set(j.id, JSON.stringify(pickRow(j)));
        }
      }
      for (const batch of chunks(toInsert)) {
        const rows = await rest("jobs", { method: "POST", body: batch.map((b) => b.row) });
        rows.forEach((r, i) => {
          batch[i].j.id = r.id;
          state.before.set(r.id, JSON.stringify(pickRow(batch[i].j)));
        });
      }
      for (const c of state.companies) {
        const s = store.sources[c.id];
        const js = store.jobs.filter((j) => j.source_id === c.id);
        const open = js.filter((j) => j.status === "open").length, stale = js.filter((j) => j.status === "possibly_stale").length;
        let hiring = "not_yet_scanned";
        if (s?.status === "failed") hiring = "scan_failed";
        else if (s?.status === "ok") hiring = open ? "confirmed_open" : stale ? "possibly_stale" : "confirmed_closed";
        await rest(`portfolio_companies?id=eq.${idOf(c.id)}`, { method: "PATCH", body: { hiring_status: hiring, open_jobs_count: open, last_checked_at: s?.last_attempt_at ?? null } });
      }
      const run = store.scan_runs.at(-1);
      if (run) {
        const sum = (k) => run.results.reduce((n, r) => n + (r[k] ?? 0), 0);
        const failed = run.results.filter((r) => r.status !== "ok").length;
        await rest("scan_runs", { method: "POST", body: [{ status: failed === 0 ? "success" : failed === run.results.length ? "failed" : "partial", started_at: run.started_at, finished_at: run.finished_at, sources_total: run.results.length, sources_ok: run.results.length - failed, sources_failed: failed, jobs_new: sum("new"), jobs_updated: sum("updated"), jobs_closed: sum("closed"), jobs_reopened: sum("reopened"), errors: run.results.filter((r) => r.note).map((r) => ({ company: r.company, status: r.status, note: r.note })) }] });
      }
    },
    // ---------- public catalog for matching (no personal data here; safe to cache briefly) ----------
    async catalog() {
      const ttl = Number(process.env.CATALOG_TTL_MS ?? 6e4);
      if (ttl > 0 && catalogCache.at > Date.now() - ttl && catalogCache.key === url) return catalogCache.value;
      const cos = new Map((await all("portfolio_companies?select=id,name")).map((c) => [c.id, c.name]));
      const firms = new Map((await all("vc_firms?select=id,name")).map((f) => [f.id, f.name]));
      const vcsOf = /* @__PURE__ */ new Map();
      for (const r of await all("vc_company_relationships?select=company_id,vc_firm_id,status&status=neq.disputed")) {
        if (r.status === "disputed" || !firms.has(r.vc_firm_id)) continue;
        (vcsOf.get(r.company_id) ?? vcsOf.set(r.company_id, []).get(r.company_id)).push({ name: firms.get(r.vc_firm_id), verified: r.status === "verified" });
      }
      const jobs = (await all("jobs?status=in.(open,possibly_stale)&select=id,company_id,title,location_raw,workplace,apply_url,skills,fn,level,excerpt,first_discovered_at,status")).map((j) => ({ ...j, company: cos.get(j.company_id) ?? "Unknown company", skills: j.skills ?? [], vcs: vcsOf.get(j.company_id) ?? [] }));
      catalogCache = { at: Date.now(), key: url, value: jobs };
      return jobs;
    }
  };
}
var catalogCache = { at: 0, key: null, value: [] };

// src/handlers.mjs
init_extract();

// src/cv/profile.mjs
var MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";
var RANGE = new RegExp(`(?:(${MONTHS})[a-z]*\\.?\\s+)?((?:19|20)\\d\\d)\\s*(?:-|\u2013|\u2014|to|until)\\s*(?:(?:(${MONTHS})[a-z]*\\.?\\s+)?((?:19|20)\\d\\d)|(present|current|now|today|ongoing))`, "gi");
var EDU = /universit|college|school|b\.?sc|b\.?a\.?\b|bachelor|master|m\.?sc|mba|degree|diploma|bootcamp|certificat|course/i;
var mi = (m) => m ? MONTHS.split("|").findIndex((x) => m.toLowerCase().startsWith(x)) : -1;
var CITIES = ["tel aviv", "jerusalem", "haifa", "herzliya", "ramat gan", "petah tikva", "raanana", "beer sheva", "new york", "san francisco", "london", "berlin", "austin", "boston", "los angeles", "toronto", "chicago"];
function estimateYears(text, now = /* @__PURE__ */ new Date()) {
  const nowY = now.getUTCFullYear() + now.getUTCMonth() / 12;
  const ranges = [];
  for (const line of text.split("\n")) {
    if (EDU.test(line)) continue;
    for (const m of line.matchAll(RANGE)) {
      const s = Number(m[2]) + (mi(m[1]) >= 0 ? mi(m[1]) / 12 : 0);
      const e = m[5] ? nowY : Number(m[4]) + (mi(m[3]) >= 0 ? (mi(m[3]) + 1) / 12 : 1);
      if (e >= s && e - s <= 45 && s >= 1970 && s <= nowY + 0.1) ranges.push([s, Math.min(e, nowY)]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0, cur = null;
  for (const r of ranges) {
    if (!cur) cur = [...r];
    else if (r[0] <= cur[1]) cur[1] = Math.max(cur[1], r[1]);
    else {
      total += cur[1] - cur[0];
      cur = [...r];
    }
  }
  if (cur) total += cur[1] - cur[0];
  let explicit = 0;
  for (const m of text.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:[a-z\s&,-]{0,40})?experience/gi)) explicit = Math.max(explicit, Number(m[1]));
  const y = Math.max(Math.round(total), explicit);
  return y > 0 ? Math.min(y, 40) : null;
}
function levelFromYears(y) {
  return y == null ? null : y < 2 ? "junior" : y < 5 ? "mid" : y < 8 ? "senior" : y < 12 ? "lead" : "director";
}
function titleLevel(text) {
  const lines = text.split("\n");
  let best = null;
  lines.forEach((line, i) => {
    const near = lines.slice(Math.max(0, i - 1), i + 2).join(" ");
    if (!/(?:19|20)\d\d/.test(near) && i > 6) return;
    const l = levelOf(line.length <= 90 ? line : "");
    if (l && (best == null || LEVELS.indexOf(l) > LEVELS.indexOf(best))) best = l;
  });
  return best;
}
function buildProfile(text, now = /* @__PURE__ */ new Date()) {
  const skills = [...findSkills(text)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([s]) => s).slice(0, 40);
  const head = text.split("\n").slice(0, 12).join("\n");
  const fnScores = FUNCTION_CATALOG.map(([name, re]) => {
    const g = new RegExp(re.source, "gi");
    return [name, (text.match(g) ?? []).length + 3 * (head.match(g) ?? []).length];
  }).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const years = estimateYears(text, now);
  const lv = [levelFromYears(years), titleLevel(text)].filter(Boolean).sort((a, b) => LEVELS.indexOf(b) - LEVELS.indexOf(a))[0] ?? "mid";
  const top2 = text.split("\n").slice(0, 6).join(" ").toLowerCase();
  return {
    skills,
    functions: fnScores.slice(0, 3).map(([n]) => n),
    level: lv,
    years,
    locations: CITIES.filter((c) => top2.includes(c)).slice(0, 2),
    remote_ok: true
  };
}
var list = (v, n, len = 40) => [...new Set((Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim().toLowerCase().slice(0, len)).filter(Boolean))].slice(0, n);
function sanitizeProfile(input) {
  const p = input && typeof input === "object" ? input : {};
  const functions = [...new Set((Array.isArray(p.functions) ? p.functions : []).filter((n) => FUNCTION_NAMES.includes(n)))].slice(0, 5);
  const years = Number.isFinite(Number(p.years)) && p.years !== null && p.years !== "" ? Math.min(40, Math.max(0, Math.round(Number(p.years)))) : null;
  return {
    skills: [...new Set(list(p.skills, 60).map(canonSkill))],
    functions,
    level: LEVELS.includes(p.level) ? p.level : "mid",
    years,
    locations: list(p.locations, 5),
    remote_ok: p.remote_ok !== false
  };
}

// src/cv/score.mjs
var bandOf = (s) => s >= 75 ? "strong" : s >= 55 ? "good" : s >= 35 ? "stretch" : "weak";
var W = { skills: 45, role: 25, seniority: 20, location: 10 };
function scoreJob(job, profile) {
  const parts = [];
  const mine = new Set(profile.skills.map(canonSkill));
  const jobSkills = (job.skills ?? []).map(canonSkill);
  const matched = jobSkills.filter((s) => mine.has(s));
  const missing = jobSkills.filter((s) => !mine.has(s));
  let sp, sr;
  if (!jobSkills.length) {
    sp = 0.45;
    sr = "The listing names no skills we recognise, so this part is a neutral estimate";
  } else if (jobSkills.length < 3) {
    sp = (matched.length + 1) / (jobSkills.length + 1);
    sr = `${matched.length} of ${jobSkills.length} listed skills are on your CV (limited detail in the listing)`;
  } else {
    sp = matched.length / jobSkills.length;
    sr = `${matched.length} of ${jobSkills.length} skills the job mentions are on your CV`;
  }
  parts.push(["skills", sp, sr]);
  const idx = job.fn ? profile.functions.indexOf(job.fn) : -1;
  let rp, rr;
  if (!profile.functions.length) {
    rp = 0.5;
    rr = "No target function set (neutral)";
  } else if (idx >= 0) {
    rp = [1, 0.8, 0.65, 0.55, 0.5][idx] ?? 0.5;
    rr = `${job.fn}, ${idx === 0 ? "your main function" : `one of your functions (#${idx + 1})`}`;
  } else if (job.fn) {
    rp = 0.2;
    rr = `${job.fn}, which is not one of your functions`;
  } else {
    rp = 0.3;
    rr = "The job function is unclear from the title";
  }
  parts.push(["role", rp, rr]);
  const jl = job.level ?? levelOf(job.title);
  let lp, lr;
  if (!jl) {
    lp = 0.6;
    lr = "Seniority is not stated in the title";
  } else {
    const d = LEVELS.indexOf(jl) - LEVELS.indexOf(profile.level);
    lp = d === 0 ? 1 : d === -1 ? 0.8 : d === 1 ? 0.65 : d === -2 ? 0.5 : d === 2 ? 0.3 : 0.15;
    lr = d === 0 ? `${jl} level matches yours` : d > 0 ? `${jl} level is ${d} step${d > 1 ? "s" : ""} above your level` : `${jl} level is below your level`;
  }
  parts.push(["seniority", lp, lr]);
  const loc = `${job.location_raw ?? ""} ${job.workplace && job.workplace !== "unknown" ? job.workplace : ""}`.toLowerCase();
  let op, or;
  if (profile.locations.some((l) => loc.includes(l))) {
    op = 1;
    or = "Matches a location you chose";
  } else if (/remote/.test(loc) && profile.remote_ok) {
    op = 0.85;
    or = "Remote, and you are open to remote";
  } else if (!profile.locations.length) {
    op = 0.6;
    or = "No location preference set (neutral)";
  } else if (!loc.trim()) {
    op = 0.5;
    or = "Location not stated";
  } else {
    op = 0.2;
    or = "Outside the locations you chose";
  }
  parts.push(["location", op, or]);
  const reasons = parts.map(([component, pct, reason]) => ({ component, score: Math.round(pct * W[component] * 10) / 10, max: W[component], reason }));
  const score = Math.round(reasons.reduce((a, r) => a + r.score, 0));
  return { score, band: bandOf(score), matched: matched.slice(0, 12), missing: missing.slice(0, 8), reasons };
}

// src/cv/gaps.mjs
function skillGaps(profile, catalog, { minScore = 45, top: top2 = 30, maxGaps = 8 } = {}) {
  const mine = new Set(profile.skills.map(canonSkill));
  const close = catalog.map((j) => ({ j, s: scoreJob(j, profile).score })).filter((x) => x.s >= minScore).sort((a, b) => b.s - a.s).slice(0, top2);
  const missing = /* @__PURE__ */ new Map(), have = /* @__PURE__ */ new Map();
  for (const { j } of close) for (const raw of j.skills ?? []) {
    const s = canonSkill(raw);
    const bucket = mine.has(s) ? have : missing;
    const e = bucket.get(s) ?? { skill: s, count: 0, examples: [] };
    e.count++;
    if (e.examples.length < 2) e.examples.push({ title: j.title, company: j.company });
    bucket.set(s, e);
  }
  const rank = (m) => [...m.values()].sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
  return { based_on: close.length, gaps: rank(missing).filter((g) => g.count >= 2 || close.length < 4).slice(0, maxGaps), strengths: rank(have).slice(0, 8).map(({ skill, count }) => ({ skill, count })) };
}

// src/http.mjs
import { createHash as createHash2, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
var sha256 = (s) => createHash2("sha256").update(String(s)).digest("hex");
var newToken = () => randomBytes(32).toString("base64url");
function send(res, code, body, type = "application/json") {
  res.statusCode = code;
  res.setHeader("content-type", type + "; charset=utf-8");
  res.setHeader("cache-control", "private, no-store, max-age=0");
  res.setHeader("vary", "Cookie");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
var CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
var page = (res, html) => {
  res.setHeader("content-security-policy", CSP);
  send(res, 200, html, "text/html");
};
var checkCsrf = (req) => req.headers["x-requested-with"] === "cvmatch";
async function readRaw(req, limit) {
  const b = req.body;
  if (Buffer.isBuffer(b)) {
    if (b.length > limit) throw Object.assign(new Error("too large"), { status: 413 });
    return b;
  }
  if (typeof b === "string") {
    const x = Buffer.from(b);
    if (x.length > limit) throw Object.assign(new Error("too large"), { status: 413 });
    return x;
  }
  if (b && typeof b === "object") return Buffer.from(JSON.stringify(b));
  const chunks = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > limit) throw Object.assign(new Error("too large"), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}
async function readJson(req, limit = 2e4) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  const raw = (await readRaw(req, limit)).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
function parseCookies(h = "") {
  const out = {};
  for (const part of String(h).split(";")) {
    const i = part.indexOf("=");
    if (i > 0) {
      try {
        out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
      } catch {
      }
    }
  }
  return out;
}
var SESSION_COOKIE = "cvm_sid";
var sessionHours = () => Math.min(168, Math.max(1, Number(process.env.SESSION_HOURS ?? 24)));
var secure = () => process.env.INSECURE_COOKIES === "1" ? "" : "; Secure";
var setSessionCookie = (res, token) => res.setHeader("set-cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionHours() * 3600}${secure()}`);
var clearSessionCookie = (res) => res.setHeader("set-cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure()}`);
var clientIp = (req) => String(req.headers["x-real-ip"] ?? req.headers["x-forwarded-for"] ?? "unknown").split(",")[0].trim();
var secret = () => process.env.TOKEN_SECRET ?? "";
function signToken(id5, purpose, exp = 0) {
  const sig = createHmac("sha256", secret()).update(`${id5}|${purpose}|${exp}`).digest("base64url").slice(0, 32);
  return `${id5}.${exp}.${sig}`;
}
function verifyToken(t, purpose, now = Date.now()) {
  const [id5, exp, sig] = String(t ?? "").split(".");
  if (!id5 || exp === void 0 || !sig || !secret()) return { ok: false };
  const want = createHmac("sha256", secret()).update(`${id5}|${purpose}|${exp}`).digest("base64url").slice(0, 32);
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  if (Number(exp) && Number(exp) < now) return { ok: false, expired: true, id: id5 };
  return { ok: true, id: id5 };
}
async function rateLimit(db, key, max, windowSec, now = Date.now()) {
  const k = encodeURIComponent(key);
  const [row] = await db.rest(`rate_limits?key=eq.${k}&select=key,count,reset_at`);
  if (!row || new Date(row.reset_at).getTime() <= now) {
    await db.rest("rate_limits?on_conflict=key", { method: "POST", body: [{ key, count: 1, reset_at: new Date(now + windowSec * 1e3).toISOString() }], prefer: "resolution=merge-duplicates,return=minimal" });
    return { ok: true };
  }
  if (row.count >= max) return { ok: false, retryAfter: Math.ceil((new Date(row.reset_at).getTime() - now) / 1e3) };
  await db.rest(`rate_limits?key=eq.${k}`, { method: "PATCH", body: { count: row.count + 1 }, prefer: "return=minimal" });
  return { ok: true };
}

// src/sessions.mjs
var expiry = () => new Date(Date.now() + sessionHours() * 3600 * 1e3).toISOString();
async function getSession(db, token) {
  if (!token || typeof token !== "string" || token.length < 30 || token.length > 100) return null;
  const [row] = await db.rest(`cv_sessions?token_hash=eq.${sha256(token)}&select=id,profile,expires_at`);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db.rest(`cv_sessions?id=eq.${row.id}`, { method: "DELETE", prefer: "return=minimal" });
    return null;
  }
  const s = { id: row.id, expires_at: row.expires_at, profile: sanitizeProfile(row.profile) };
  return s;
}
async function saveProfile(db, token, profile) {
  const existing = await getSession(db, token);
  if (existing) {
    await db.rest(`cv_sessions?id=eq.${existing.id}`, { method: "PATCH", body: { profile, expires_at: expiry() }, prefer: "return=minimal" });
    return token;
  }
  const t = newToken();
  await db.rest("cv_sessions", { method: "POST", body: [{ token_hash: sha256(t), profile, expires_at: expiry() }], prefer: "return=minimal" });
  return t;
}
async function deleteSession(db, token) {
  if (token) await db.rest(`cv_sessions?token_hash=eq.${sha256(token)}`, { method: "DELETE", prefer: "return=minimal" });
}

// src/email/send.mjs
var emailEnabled = (env = process.env) => !!(env.RESEND_API_KEY && env.EMAIL_FROM && env.SITE_URL && env.TOKEN_SECRET);
async function sendEmail({ to, subject, html, text, headers = {} }, { fetchImpl = fetch, env = process.env } = {}) {
  if (!emailEnabled(env)) return { ok: false, error: "email not configured" };
  try {
    const r = await fetchImpl(env.EMAIL_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text, headers })
    });
    return r.ok ? { ok: true } : { ok: false, error: `provider HTTP ${r.status}` };
  } catch {
    return { ok: false, error: "provider unreachable" };
  }
}

// src/email/templates.mjs
var esc2 = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var safeUrl = (u) => /^https?:\/\//i.test(u ?? "") ? u : null;
var BAND = { strong: "Strong match", good: "Good match", stretch: "Stretch", weak: "Weak match" };
var wrap = (inner, footer) => `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1B2438;line-height:1.5">${inner}<hr style="border:none;border-top:1px solid #E3DCCD;margin:24px 0"><p style="font-size:12px;color:#6B7488">${footer}</p></div>`;
function confirmEmail({ link, site: site2 }) {
  const html = wrap(`<h2 style="margin:0 0 8px">Confirm your job alerts</h2><p>Someone (hopefully you) asked for job matches based on a CV on ${esc2(site2)}.</p><p><a href="${esc2(link)}" style="background:#B08D57;color:#0B1426;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Confirm and send my matches</a></p><p>The link works for 48 hours. If you did not ask for this, ignore this email and nothing will be sent.</p>`, `We store only a short skills summary, never your CV.`);
  return { subject: "Confirm your job matches", html, text: `Confirm your job alerts: ${link}

The link works for 48 hours. If you did not ask for this, ignore this email.` };
}
function digestEmail({ jobs, unsubUrl, site: site2, weekly }) {
  const rows = jobs.map((j) => {
    const link = safeUrl(j.apply_url);
    return `<div style="border:1px solid #E3DCCD;border-radius:8px;padding:12px;margin:10px 0"><div style="font-weight:600">${link ? `<a href="${esc2(link)}" style="color:#1B2438">${esc2(j.title)}</a>` : esc2(j.title)}</div><div style="color:#6B7488;font-size:13px">${esc2(j.company)}${j.location_raw ? " \xB7 " + esc2(j.location_raw) : ""}</div><div style="margin-top:6px"><b>${j.score}/100</b> \xB7 ${BAND[j.band]}${j.matched.length ? ` \xB7 matches: ${esc2(j.matched.slice(0, 4).join(", "))}` : ""}</div>${j.missing.length ? `<div style="font-size:12px;color:#6B7488">Not on your CV: ${esc2(j.missing.slice(0, 3).join(", "))}</div>` : ""}</div>`;
  }).join("");
  const strong = jobs.filter((j) => j.band === "strong").length;
  const intro = jobs.length ? `<p>${jobs.length} role${jobs.length > 1 ? "s" : ""} that fit your CV${strong ? `, ${strong} strong` : ""}. "Strength" compares the skills, role and level in the listing with your CV.</p>` : "<p>No new roles reached your strength threshold this time.</p>";
  const footer = `${weekly ? "You get this weekly because you asked for it." : "This is a one-time email. Nothing further will be sent."} Sent from ${esc2(site2)}. ${unsubUrl ? `<a href="${esc2(unsubUrl)}">Unsubscribe and delete my details</a>` : ""}`;
  const text = [`Your job matches (${jobs.length})`, "", ...jobs.map((j) => `- ${j.title} at ${j.company}${j.location_raw ? " (" + j.location_raw + ")" : ""}: ${j.score}/100 ${BAND[j.band]}
  ${safeUrl(j.apply_url) ?? ""}`), "", unsubUrl ? `Unsubscribe: ${unsubUrl}` : ""].join("\n");
  return { subject: jobs.length ? `${jobs.length} job match${jobs.length > 1 ? "es" : ""} for your CV${strong ? ` (${strong} strong)` : ""}` : "No new strong matches this week", html: wrap(`<h2 style="margin:0 0 8px">Your job matches</h2>${intro}${rows}`, footer), text };
}

// src/email/subs.mjs
var enc = encodeURIComponent;
var EMAIL_RE = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,190}\.[A-Za-z]{2,}$/;
var site = () => (process.env.SITE_URL ?? "").replace(/\/$/, "");
var DAY = 864e5;
function rankFor(profile, catalog, { min = 0, exclude = /* @__PURE__ */ new Set(), limit = 8 } = {}) {
  return catalog.map((j) => ({ ...j, ...scoreJob(j, profile) })).filter((j) => j.score >= min && !exclude.has(j.id)).sort((a, b) => b.score - a.score).slice(0, limit);
}
async function subscribe(db, { email, frequency, min_score, profile, ip }, deps = {}) {
  const GENERIC = { ok: true, message: "If that address is valid, we sent a confirmation link. Check your inbox (and spam)." };
  email = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, status: 400, error: "Enter a valid email address." };
  const f = frequency === "once" ? "once" : "weekly";
  const min = Math.min(95, Math.max(30, Math.round(Number(min_score)) || 60));
  const a = await rateLimit(db, `sub-ip:${sha256(ip)}`, 6, 3600);
  if (!a.ok) return { ok: false, status: 429, error: "Too many requests. Try again later." };
  const b = await rateLimit(db, `sub-email:${sha256(email)}`, 3, 86400);
  if (!b.ok) return GENERIC;
  const [existing] = await db.rest(`email_subscriptions?email=eq.${enc(email)}&select=id,confirmed_at,last_confirm_sent_at`);
  if (existing?.confirmed_at) return GENERIC;
  if (existing?.last_confirm_sent_at && Date.now() - new Date(existing.last_confirm_sent_at).getTime() < 5 * 6e4) return GENERIC;
  let id5;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (existing) {
    id5 = existing.id;
    await db.rest(`email_subscriptions?id=eq.${id5}`, { method: "PATCH", body: { profile, frequency: f, min_score: min, last_confirm_sent_at: now }, prefer: "return=minimal" });
  } else {
    [{ id: id5 }] = await db.rest("email_subscriptions", { method: "POST", body: [{ email, profile, frequency: f, min_score: min, last_confirm_sent_at: now }] });
  }
  const link = `${site()}/confirm?t=${enc(signToken(id5, "c", Date.now() + 2 * DAY))}`;
  const m = confirmEmail({ link, site: new URL(site()).host });
  const r = await sendEmail({ to: email, ...m }, deps);
  if (!r.ok) return { ok: false, status: 502, error: "We could not send the email right now. Please try again later." };
  return GENERIC;
}
async function sendDigest(db, sub, { once }, deps) {
  const catalog = await db.catalog();
  const profile = sanitizeProfile(sub.profile);
  const jobs = rankFor(profile, catalog, { min: once ? 0 : sub.min_score, exclude: new Set(sub.sent_job_ids ?? []), limit: 8 });
  if (!jobs.length && !once) return { ok: true, sent: false };
  const unsubUrl = once ? null : `${site()}/unsubscribe?t=${enc(signToken(sub.id, "u", 0))}`;
  const m = digestEmail({ jobs, unsubUrl, site: new URL(site()).host, weekly: !once });
  const headers = unsubUrl ? { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {};
  const r = await sendEmail({ to: sub.email, ...m, headers }, deps);
  return r.ok ? { ok: true, sent: true, ids: jobs.map((j) => j.id) } : { ok: false };
}
async function confirm(db, token, deps = {}) {
  const v = verifyToken(token, "c");
  if (!v.ok) return { state: v.expired ? "expired" : "invalid" };
  const [sub] = await db.rest(`email_subscriptions?id=eq.${enc(v.id)}&select=*`);
  if (!sub) return { state: "invalid" };
  if (sub.confirmed_at) return { state: "already" };
  const once = sub.frequency === "once";
  const r = await sendDigest(db, sub, { once }, deps);
  if (!r.ok) return { state: "error" };
  if (once) await db.rest(`email_subscriptions?id=eq.${sub.id}`, { method: "DELETE", prefer: "return=minimal" });
  else await db.rest(`email_subscriptions?id=eq.${sub.id}`, { method: "PATCH", body: { confirmed_at: (/* @__PURE__ */ new Date()).toISOString(), last_sent_at: (/* @__PURE__ */ new Date()).toISOString(), sent_job_ids: (r.ids ?? []).slice(0, 300) }, prefer: "return=minimal" });
  return { state: once ? "sent_once" : "subscribed" };
}
async function unsubscribe(db, token) {
  const v = verifyToken(token, "u");
  if (!v.ok) return { state: "invalid" };
  await db.rest(`email_subscriptions?id=eq.${enc(v.id)}`, { method: "DELETE", prefer: "return=minimal" });
  return { state: "unsubscribed" };
}
async function runDigests(db, { limit = 40, now = Date.now() } = {}, deps = {}) {
  const subs = await db.all("email_subscriptions?confirmed_at=not.is.null&frequency=eq.weekly&select=*");
  const due = subs.filter((s) => !s.last_sent_at || now - new Date(s.last_sent_at).getTime() > 6.5 * DAY).slice(0, limit);
  const out = { due: due.length, sent: 0, skipped: 0, failed: 0 };
  for (const s of due) {
    const r = await sendDigest(db, s, { once: false }, deps);
    if (!r.ok) {
      out.failed++;
      continue;
    }
    if (!r.sent) {
      out.skipped++;
      await db.rest(`email_subscriptions?id=eq.${s.id}`, { method: "PATCH", body: { last_sent_at: new Date(now).toISOString() }, prefer: "return=minimal" });
      continue;
    }
    out.sent++;
    await db.rest(`email_subscriptions?id=eq.${s.id}`, { method: "PATCH", body: { last_sent_at: new Date(now).toISOString(), sent_job_ids: [...s.sent_job_ids ?? [], ...r.ids].slice(-300) }, prefer: "return=minimal" });
  }
  return out;
}
async function purge(db, now = Date.now()) {
  const iso2 = (t) => new Date(t).toISOString();
  await db.rest(`cv_sessions?expires_at=lt.${iso2(now)}`, { method: "DELETE", prefer: "return=minimal" });
  await db.rest(`email_subscriptions?confirmed_at=is.null&created_at=lt.${iso2(now - 3 * DAY)}`, { method: "DELETE", prefer: "return=minimal" });
  await db.rest(`rate_limits?reset_at=lt.${iso2(now)}`, { method: "DELETE", prefer: "return=minimal" });
  await db.rest(`metrics_daily?day=lt.${iso2(now - 400 * DAY).slice(0, 10)}`, { method: "DELETE", prefer: "return=minimal" }).catch(() => {
  });
}

// src/jobs/detect.mjs
var SUPPORTED = /* @__PURE__ */ new Set(["greenhouse", "lever", "ashby", "workable"]);
var RESERVED = /* @__PURE__ */ new Set(["embed", "v1", "js"]);
var PATTERNS = [
  ["greenhouse", /greenhouse\.io\/embed\/job_board(?:\/js)?\?for=([a-z0-9_-]+)/i],
  ["greenhouse", /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/i],
  ["greenhouse", /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/([a-z0-9_-]+)/i],
  ["lever", /api\.(?:eu\.)?lever\.co\/v0\/postings\/([a-z0-9_.-]+)/i],
  ["lever", /jobs\.(?:eu\.)?lever\.co\/([a-z0-9_.-]+)/i],
  ["ashby", /jobs\.ashbyhq\.com\/([a-z0-9_.%-]+)/i],
  ["workable", /apply\.workable\.com\/([a-z0-9_-]+)/i],
  ["comeet", /comeet\.(?:com|co)\/jobs\/([a-z0-9_-]+\/[A-Z0-9.]+)/i]
];
function detectAts(url = "", html = "") {
  for (const text of [url, html]) {
    for (const [adapter, re] of PATTERNS) {
      const m = text.match(re);
      if (m && !RESERVED.has(m[1].toLowerCase())) {
        return { adapter, identifier: m[1], supported: SUPPORTED.has(adapter), evidence: m[0] };
      }
    }
  }
  return null;
}

// src/jobs/adapters/greenhouse.mjs
var greenhouse_exports = {};
__export(greenhouse_exports, {
  fetchJobs: () => fetchJobs,
  id: () => id
});

// src/jobs/retry.mjs
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, { retries = 2, baseMs = 1e3, sleepFn = sleep } = {}) {
  let res;
  for (let a = 0; a <= retries; a++) {
    res = await fn();
    if (res.ok || !res.retryable) return res;
    if (a < retries) await sleepFn(baseMs * 2 ** a + Math.random() * baseMs * 0.3);
  }
  return res;
}
async function getJson(url, { fetchImpl = fetch, ua, timeoutMs = 2e4 } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetchImpl(url, { headers: { accept: "application/json", "user-agent": ua }, signal: ac.signal });
    if (r.status === 404) return { ok: false, retryable: false, status: 404, error: "not found (404): wrong identifier or board disabled" };
    if (r.status === 429 || r.status >= 500) return { ok: false, retryable: true, status: r.status, error: `HTTP ${r.status}` };
    if (!r.ok) return { ok: false, retryable: false, status: r.status, error: `HTTP ${r.status}` };
    try {
      return { ok: true, data: await r.json() };
    } catch {
      return { ok: false, retryable: false, error: "invalid JSON response" };
    }
  } catch (e) {
    return { ok: false, retryable: true, error: e.cause?.code ?? e.name ?? String(e) };
  } finally {
    clearTimeout(t);
  }
}

// src/jobs/adapters/greenhouse.mjs
var id = "greenhouse";
async function fetchJobs(token, { fetchImpl, baseUrl = "https://boards-api.greenhouse.io", ua } = {}) {
  const url = `${baseUrl}/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const r = await getJson(url, { fetchImpl, ua });
  if (!r.ok) return r;
  if (!Array.isArray(r.data?.jobs)) return { ok: false, retryable: false, error: "unexpected response shape (no jobs array)" };
  const jobs = r.data.jobs.map((j) => ({
    externalId: j.id,
    title: j.title,
    url: j.absolute_url,
    location: j.location?.name,
    department: j.departments?.[0]?.name,
    postedAt: j.first_published ?? null,
    // null if absent; never guessed
    descriptionHtml: j.content ? decodeEntities(j.content) : null
  }));
  const total = r.data.meta?.total;
  return { ok: true, complete: total == null || total <= jobs.length, jobs, rawCount: jobs.length };
}

// src/jobs/adapters/lever.mjs
var lever_exports = {};
__export(lever_exports, {
  fetchJobs: () => fetchJobs2,
  id: () => id2
});
var id2 = "lever";
var WORKPLACE = { remote: "remote", hybrid: "hybrid", "on-site": "onsite", onsite: "onsite" };
async function fetchJobs2(company, { fetchImpl, baseUrl = "https://api.lever.co", ua } = {}) {
  const url = `${baseUrl}/v0/postings/${encodeURIComponent(company)}?mode=json`;
  const r = await getJson(url, { fetchImpl, ua });
  if (!r.ok) return r;
  if (!Array.isArray(r.data)) return { ok: false, retryable: false, error: "unexpected response shape (expected array)" };
  const jobs = r.data.map((j) => ({
    externalId: j.id,
    title: j.text,
    url: j.hostedUrl,
    applyUrl: j.applyUrl,
    location: j.categories?.location,
    department: j.categories?.team ?? j.categories?.department,
    workplace: WORKPLACE[String(j.workplaceType ?? "").toLowerCase()],
    postedAt: typeof j.createdAt === "number" ? new Date(j.createdAt).toISOString() : null,
    descriptionHtml: j.description ? j.description + (j.additional ?? "") : null,
    salary: j.salaryRange ? { min: j.salaryRange.min, max: j.salaryRange.max, currency: j.salaryRange.currency, period: j.salaryRange.interval } : void 0
  }));
  return { ok: true, complete: true, jobs, rawCount: jobs.length };
}

// src/jobs/adapters/ashby.mjs
var ashby_exports = {};
__export(ashby_exports, {
  fetchJobs: () => fetchJobs3,
  id: () => id3
});
var id3 = "ashby";
async function fetchJobs3(name, { fetchImpl, baseUrl = "https://api.ashbyhq.com", ua } = {}) {
  const r = await getJson(`${baseUrl}/posting-api/job-board/${encodeURIComponent(name)}`, { fetchImpl, ua });
  if (!r.ok) return r;
  if (!Array.isArray(r.data?.jobs)) return { ok: false, retryable: false, error: "unexpected response shape (no jobs array)" };
  const jobs = r.data.jobs.filter((j) => j.isListed !== false).map((j) => ({
    externalId: j.id,
    title: j.title,
    url: j.jobUrl,
    applyUrl: j.applyUrl,
    location: j.location,
    department: j.department ?? j.team,
    workplace: j.isRemote === true ? "remote" : void 0,
    postedAt: j.publishedAt ? new Date(j.publishedAt).toISOString() : null,
    descriptionHtml: j.descriptionHtml ?? null
  }));
  return { ok: true, complete: true, jobs, rawCount: jobs.length };
}

// src/jobs/adapters/workable.mjs
var workable_exports = {};
__export(workable_exports, {
  fetchJobs: () => fetchJobs4,
  id: () => id4
});
var id4 = "workable";
async function fetchJobs4(account, { fetchImpl, baseUrl = "https://apply.workable.com", ua } = {}) {
  const r = await getJson(`${baseUrl}/api/v1/widget/accounts/${encodeURIComponent(account)}?details=true`, { fetchImpl, ua });
  if (!r.ok) return r;
  if (!Array.isArray(r.data?.jobs)) return { ok: false, retryable: false, error: "unexpected response shape (no jobs array)" };
  const jobs = r.data.jobs.map((j) => {
    const d = j.published_on ?? j.created_at;
    return {
      externalId: j.shortcode ?? j.code,
      title: j.title,
      url: j.url ?? j.shortlink,
      applyUrl: j.application_url,
      location: [j.city, j.state, j.country].filter(Boolean).join(", ") || void 0,
      department: j.department,
      workplace: j.telecommuting ? "remote" : void 0,
      postedAt: d && !Number.isNaN(Date.parse(d)) ? new Date(d).toISOString() : null,
      descriptionHtml: j.description ?? null
    };
  });
  return { ok: true, complete: true, jobs, rawCount: jobs.length };
}

// src/jobs/adapters/index.mjs
var ADAPTERS = { greenhouse: greenhouse_exports, lever: lever_exports, ashby: ashby_exports, workable: workable_exports };

// src/jobs/lifecycle.mjs
function reconcile({ existing, result, now = (/* @__PURE__ */ new Date()).toISOString(), closeAfter = 2 }) {
  if (!result.ok) {
    return { sourceStatus: "failed", error: result.error, retryable: !!result.retryable, jobs: existing, events: [{ type: "source_failure", error: result.error }] };
  }
  const hadLive = existing.some((j) => j.status !== "closed");
  if (result.jobs.length === 0 && hadLive) {
    const error = "suspicious: source returned 0 jobs but had live jobs; nothing was closed";
    return { sourceStatus: "failed", error, retryable: false, jobs: existing, events: [{ type: "source_failure", error }] };
  }
  const events = [];
  const prevByKey = new Map(existing.map((j) => [jobKey(j), j]));
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const nj of result.jobs) {
    const k = jobKey(nj);
    if (seen.has(k)) continue;
    seen.add(k);
    const prev = prevByKey.get(k);
    if (!prev) {
      const job2 = { ...nj, status: "open", first_discovered_at: now, last_seen_at: now, missed_scans: 0, closed_at: null, reopened_at: null };
      out.push(job2);
      events.push({ type: "created", job: job2 });
      continue;
    }
    const changed = ["title", "location_raw", "description_hash", "apply_url"].filter((f) => prev[f] !== nj[f]);
    const wasClosed = prev.status === "closed";
    const job = { ...prev, ...nj, first_discovered_at: prev.first_discovered_at, status: "open", last_seen_at: now, missed_scans: 0, closed_at: null, reopened_at: wasClosed ? now : prev.reopened_at ?? null };
    out.push(job);
    if (wasClosed) events.push({ type: "reopened", job });
    else if (changed.length) events.push({ type: "updated", job, changed });
  }
  for (const prev of existing) {
    if (seen.has(jobKey(prev))) continue;
    if (prev.status === "closed" || result.complete === false) {
      out.push(prev);
      continue;
    }
    const missed = prev.missed_scans + 1;
    const status = missed >= closeAfter ? "closed" : "possibly_stale";
    const job = { ...prev, missed_scans: missed, status, closed_at: status === "closed" ? now : null };
    out.push(job);
    events.push({ type: status === "closed" ? "closed" : "possibly_stale", job });
  }
  return { sourceStatus: "ok", jobs: out, events };
}

// src/jobs/scan.mjs
var UA = () => `cv-job-match/1.0 (job-search research; contact: ${process.env.SCAN_CONTACT ?? "set SCAN_CONTACT"})`;
async function discover(company, { fetchImpl, delayMs, sleepFn }) {
  if (company.ats) return { ...company.ats, supported: !!ADAPTERS[company.ats.adapter] };
  if (!company.careers_url) return { error: "no careers_url or ATS given" };
  const direct = detectAts(company.careers_url);
  if (direct) return direct;
  const origin = new URL(company.careers_url).origin;
  await sleepFn(delayMs);
  try {
    const rr = await fetchImpl(`${origin}/robots.txt`, { headers: { "user-agent": UA() } });
    if (rr.status >= 500) return { error: `robots.txt unavailable (HTTP ${rr.status})` };
    if (rr.ok && !parseRobots(await rr.text())(new URL(company.careers_url).pathname || "/")) return { error: "robots.txt disallows the careers page" };
  } catch (e) {
    return { error: `robots.txt fetch failed: ${e.cause?.code ?? e.name}` };
  }
  await sleepFn(delayMs);
  try {
    const r = await fetchImpl(company.careers_url, { headers: { "user-agent": UA(), accept: "text/html" }, redirect: "follow" });
    if (!r.ok) return { error: `careers page HTTP ${r.status}` };
    const html = (await r.text()).slice(0, 2e6);
    return detectAts(r.url, html) ?? { error: "no supported ATS detected (JavaScript-rendered or custom page)" };
  } catch (e) {
    return { error: `careers page fetch failed: ${e.cause?.code ?? e.name}` };
  }
}
async function runScan(companies, { store, fetchImpl = fetch, bases = {}, delayMs = 1e3, sleepFn = sleep, now = () => (/* @__PURE__ */ new Date()).toISOString() } = {}) {
  const run = { started_at: now(), results: [] };
  for (const c of companies) {
    const t = now();
    const src = store.sources[c.id] ??= { consecutive_failures: 0 };
    src.consecutive_failures ??= 0;
    src.last_attempt_at = t;
    const det = await discover(c, { fetchImpl, delayMs, sleepFn });
    const res = { company: c.name, status: "ok", new: 0, updated: 0, closed: 0, reopened: 0, stale: 0 };
    if (det.error || !det.supported) {
      res.status = det.error ? "needs_manual" : "needs_adapter";
      res.note = det.error ?? `${det.adapter} detected (${det.identifier}) but no adapter yet`;
      Object.assign(src, { adapter: det.adapter ?? null, identifier: det.identifier ?? null, status: res.status, last_error: res.note });
      run.results.push(res);
      continue;
    }
    Object.assign(src, { adapter: det.adapter, identifier: det.identifier });
    await sleepFn(delayMs);
    const result = await withRetry(() => ADAPTERS[det.adapter].fetchJobs(det.identifier, { fetchImpl, baseUrl: bases[det.adapter], ua: UA() }), { sleepFn: delayMs ? sleep : async () => {
    } });
    if (result.ok) result.jobs = result.jobs.map((r) => toJob(r, { companyId: c.id, sourceId: c.id })).filter(Boolean);
    const rec = reconcile({ existing: store.jobs.filter((j) => j.source_id === c.id), result, now: now() });
    store.jobs = store.jobs.filter((j) => j.source_id !== c.id).concat(rec.jobs);
    if (rec.sourceStatus === "ok") Object.assign(src, { status: "ok", last_success_at: t, consecutive_failures: 0, last_error: null, last_job_count: result.jobs.length });
    else {
      src.consecutive_failures += 1;
      Object.assign(src, { status: "failed", last_error: rec.error });
      res.status = "failed";
      res.note = rec.error;
    }
    for (const e of rec.events) {
      if (e.type === "created") res.new++;
      else if (e.type === "updated") res.updated++;
      else if (e.type === "closed") res.closed++;
      else if (e.type === "reopened") res.reopened++;
      else if (e.type === "possibly_stale") res.stale++;
    }
    run.results.push(res);
  }
  run.finished_at = now();
  store.scan_runs.push(run);
  return run;
}
async function runScanJob({ db, only, limit = Infinity, delayMs = 500, fetchImpl, bases }) {
  let companies = await db.listCompanies();
  if (only) companies = companies.filter((c) => c.id === only);
  companies = companies.slice(0, limit);
  if (!companies.length) return { companies: 0, results: [], note: only ? `no scannable company "${only}"` : "no companies with a careers link or ATS yet" };
  const store = await db.load(companies);
  const run = await runScan(companies, { store, delayMs, fetchImpl, bases });
  await db.save(store);
  return { companies: companies.length, results: run.results };
}

// src/jobs/import.mjs
var slugify = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
var enc2 = encodeURIComponent;
var URLS2 = { greenhouse: (i) => `https://boards.greenhouse.io/${i}`, lever: (i) => `https://jobs.lever.co/${i}`, ashby: (i) => `https://jobs.ashbyhq.com/${i}`, workable: (i) => `https://apply.workable.com/${i}` };
var httpUrl = (u) => /^https?:\/\//i.test(u ?? "") ? u : null;
var ID = /^[A-Za-z0-9_.-]{1,80}$/;
async function importCompanies(db, items, { now = (/* @__PURE__ */ new Date()).toISOString() } = {}) {
  const rep = { companies_created: 0, companies_existing: 0, links_created: 0, links_existing: 0, errors: [] };
  if (!Array.isArray(items) || items.length > 500) {
    rep.errors.push("expected a list of at most 500 companies");
    return rep;
  }
  const vcCache = /* @__PURE__ */ new Map();
  const vcId = async (name) => {
    if (!vcCache.has(name)) vcCache.set(name, (await db.rest(`vc_firms?name=eq.${enc2(name)}&select=id`))[0]?.id ?? null);
    return vcCache.get(name);
  };
  for (const it of items) {
    const name = String(it?.name ?? "").trim().slice(0, 120);
    const slug = it?.slug ? slugify(String(it.slug)) : slugify(name);
    if (!name || !slug) {
      rep.errors.push("skipped an item without a name");
      continue;
    }
    let co = (await db.rest(`portfolio_companies?slug=eq.${enc2(slug)}&select=id`))[0];
    if (co) rep.companies_existing++;
    else {
      [co] = await db.rest("portfolio_companies", { method: "POST", body: [{ name, slug, website: httpUrl(it.website), careers_url: httpUrl(it.careers_url) }] });
      rep.companies_created++;
    }
    const ats = it.ats;
    if (ats?.adapter && URLS2[ats.adapter] && ID.test(ats.identifier ?? "")) {
      const url = URLS2[ats.adapter](ats.identifier);
      if (!(await db.rest(`job_sources?company_id=eq.${co.id}&adapter=eq.${ats.adapter}&url=eq.${enc2(url)}&select=id`)).length) await db.rest("job_sources", { method: "POST", body: [{ company_id: co.id, adapter: ats.adapter, identifier: ats.identifier, url }] });
    } else if (ats) rep.errors.push(`${name}: invalid ats block`);
    for (const inv of it.investors ?? []) {
      const vid = await vcId(String(inv.vc ?? ""));
      if (!vid) {
        rep.errors.push(`${name}: unknown VC "${inv.vc}"`);
        continue;
      }
      if ((await db.rest(`vc_company_relationships?vc_firm_id=eq.${vid}&company_id=eq.${co.id}&select=id`)).length) {
        rep.links_existing++;
        continue;
      }
      const ev = httpUrl(inv.evidence_url);
      await db.rest("vc_company_relationships", { method: "POST", body: [{ vc_firm_id: vid, company_id: co.id, evidence_url: ev, status: ev && inv.verify !== false ? "verified" : "unverified", verified_at: ev && inv.verify !== false ? now : null }] });
      rep.links_created++;
    }
  }
  return rep;
}

// src/jobs/harvest.mjs
import dns from "node:dns/promises";
import net from "node:net";
var UA2 = () => `cv-job-match/1.0 (job-search research; contact: ${process.env.SCAN_CONTACT ?? "set SCAN_CONTACT"})`;
var MAX_HTML = 2e6;
var HarvestError = class extends Error {
  constructor(m) {
    super(m);
    this.status = 400;
  }
};
var privateV4 = (ip) => {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 || a >= 224;
};
var privateV6 = (ip) => {
  const x = ip.toLowerCase();
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb") || x.startsWith("::ffff:") && privateV4(x.slice(7));
};
var isPrivateIp = (ip) => net.isIPv4(ip) ? privateV4(ip) : net.isIPv6(ip) ? privateV6(ip) : true;
async function assertPublicUrl(raw, { allowPrivate = process.env.ALLOW_PRIVATE_FETCH === "1" } = {}) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new HarvestError("That is not a valid web address.");
  }
  if (!["http:", "https:"].includes(u.protocol)) throw new HarvestError("Only http and https addresses are allowed.");
  if (u.username || u.password) throw new HarvestError("Addresses with a username or password are not allowed.");
  if (allowPrivate) return u;
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new HarvestError("That address points to a private network.");
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true }).catch(() => {
    throw new HarvestError("We could not find that website.");
  })).map((a) => a.address);
  if (!addrs.length || addrs.some(isPrivateIp)) throw new HarvestError("That address points to a private network.");
  return u;
}
var prettyName = (s) => String(s ?? "").replace(/\.[a-z]{2,}$/i, "").replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80);
async function politeGet(url, { fetchImpl, hops = 3 }) {
  let cur = url;
  for (let i = 0; i <= hops; i++) {
    const u = await assertPublicUrl(cur);
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15e3);
    let r;
    try {
      r = await fetchImpl(u.href, { headers: { "user-agent": UA2(), accept: "text/html,text/plain" }, redirect: "manual", signal: ac.signal });
    } catch {
      throw new HarvestError("We could not load that page (timeout or network error).");
    } finally {
      clearTimeout(t);
    }
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      const loc = r.headers.get("location");
      if (!loc) throw new HarvestError("Bad redirect.");
      cur = new URL(loc, u).href;
      continue;
    }
    return { r, url: u };
  }
  throw new HarvestError("Too many redirects.");
}
function boardsInHtml(html, pageUrl) {
  const found = /* @__PURE__ */ new Map(), unsupported = /* @__PURE__ */ new Map();
  const consider = (str) => {
    const d = detectAts(str, "");
    if (!d) return;
    const key = `${d.adapter}:${d.identifier.toLowerCase()}`;
    if (d.supported) {
      if (!found.has(key)) found.set(key, { adapter: d.adapter, identifier: d.identifier, name: prettyName(d.identifier), source: pageUrl });
    } else if (!unsupported.has(key)) unsupported.set(key, { adapter: d.adapter, identifier: d.identifier });
  };
  for (const m of html.matchAll(/(?:href|src|data-[a-z-]+|content)=["']([^"']+)["']/gi)) consider(m[1].replace(/&amp;/g, "&"));
  for (const m of html.matchAll(/https?:\/\/[^\s"'<>)\\]+/gi)) consider(m[0]);
  return { boards: [...found.values()], unsupported: [...unsupported.values()] };
}
async function harvestBoards(pageUrl, { fetchImpl = fetch } = {}) {
  const u0 = await assertPublicUrl(pageUrl);
  try {
    const { r: r2 } = await politeGet(`${u0.origin}/robots.txt`, { fetchImpl });
    if (r2.status >= 500) throw new HarvestError("That site\u2019s robots.txt is unavailable, so we did not read the page.");
    if (r2.ok && !parseRobots(await r2.text())(u0.pathname || "/")) throw new HarvestError("That site\u2019s robots.txt asks automated tools not to read this page. Paste the company links by hand instead.");
  } catch (e) {
    if (e instanceof HarvestError) throw e;
  }
  const { r, url } = await politeGet(u0.href, { fetchImpl });
  if (!r.ok) throw new HarvestError(`The page answered with HTTP ${r.status}.`);
  const html = (await r.text()).slice(0, MAX_HTML);
  const { boards: allBoards, unsupported: unsup } = boardsInHtml(html, url.href);
  const boards = allBoards.slice(0, 300);
  return {
    page: url.href,
    boards,
    unsupported: unsup.slice(0, 50),
    note: boards.length ? null : "No company job-board links were found in this page\u2019s HTML. Many VC pages load their company list with JavaScript, so nothing is visible to us. Paste the companies\u2019 careers links instead."
  };
}
function toImportItems(entries, { vc, evidence_url } = {}) {
  const items = [];
  const seen = /* @__PURE__ */ new Set();
  for (const e of entries.slice(0, 300)) {
    let adapter = e.adapter, identifier = e.identifier, url = typeof e.url === "string" ? e.url.trim() : null, name = e.name?.toString().trim();
    if ((!adapter || !identifier) && url) {
      const d = detectAts(url, "");
      if (d?.supported) {
        adapter = d.adapter;
        identifier = d.identifier;
      }
    }
    let host = null;
    if (url) {
      try {
        host = new URL(url).hostname.replace(/^www\./, "");
      } catch {
      }
    }
    if (!adapter && !host) continue;
    const key = adapter ? `${adapter}:${String(identifier).toLowerCase()}` : `url:${host}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const item = { name: name || prettyName(identifier || host) };
    if (adapter && identifier) item.ats = { adapter, identifier };
    else item.careers_url = url;
    if (vc) item.investors = [{ vc, ...evidence_url ? { evidence_url } : {} }];
    items.push(item);
  }
  return items;
}

// src/jobs/discover.mjs
import net2 from "node:net";
var MAX_HTML2 = 15e5;
var SLD = /* @__PURE__ */ new Set(["co.il", "org.il", "ac.il", "net.il", "co.uk", "org.uk", "com.au", "co.jp", "com.br", "co.nz", "co.za", "com.tr", "co.in"]);
var EXCLUDE = new Set("linkedin.com twitter.com x.com facebook.com instagram.com youtube.com youtu.be medium.com github.com crunchbase.com techcrunch.com google.com apple.com vimeo.com calcalist.co.il globes.co.il forbes.com bloomberg.com reuters.com wsj.com nytimes.com businesswire.com prnewswire.com substack.com spotify.com wikipedia.org cloudflare.com wixstatic.com squarespace.com typeform.com calendly.com hubspot.com mailchimp.com notion.so airtable.com greenhouse.io lever.co ashbyhq.com workable.com getro.com consider.com linktr.ee bit.ly t.co goo.gl tiktok.com pinterest.com snapchat.com t.me whatsapp.com wa.me comeet.com comeet.co theverge.com wired.com ynet.co.il themarker.com geektime.co.il".split(" "));
var INFRA = ["cloudfront.net", "amazonaws.com", "googleapis.com", "gstatic.com", "googletagmanager.com", "google-analytics.com", "doubleclick.net", "w3.org", "schema.org", "jsdelivr.net", "cloudflare.com", "unpkg.com", "fontawesome.com", "facebook.net", "hotjar.com", "segment.com", "sentry.io", "typekit.net", "wp.com", "wordpress.org", "gravatar.com", "youtube-nocookie.com", "webflow.io", "framer.com", "vercel.app", "netlify.app", "squarespace.com", "wixsite.com", "cdn.prod.website-files.com", "website-files.com", "imgix.net", "cloudinary.com", "sanity.io", "contentful.com", "ctfassets.net", "prismic.io", "hs-scripts.com", "hsforms.com", "intercom.io", "zendesk.com", "stripe.com", "paypal.com", "apple.com", "microsoft.com", "mozilla.org", "creativecommons.org"];
var junkHost = (k) => EXCLUDE.has(k) || INFRA.some((d) => k === d || k.endsWith("." + d)) || [...EXCLUDE].some((d) => k.endsWith("." + d));
var CAREER = /(careers?|jobs?|join[- ]us|join[- ]our[- ]team|hiring|work[- ]with[- ]us|open[- ](positions?|roles?)|opportunit)/i;
var PORTFOLIO = /(portfolio|companies|startups|investments|founders)/i;
var SKIP_EXT = /\.(pdf|jpe?g|png|gif|svg|webp|zip|mp4|mp3|docx?|xlsx?)(\?|$)/i;
function siteKey(u) {
  const h = u.hostname.replace(/^www\./, "").toLowerCase();
  if (net2.isIP(h)) return u.host;
  const p = h.split(".");
  if (p.length <= 2) return h;
  return SLD.has(p.slice(-2).join(".")) ? p.slice(-3).join(".") : p.slice(-2).join(".");
}
function extractLinks(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*?href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u;
    try {
      u = new URL(m[1].replace(/&amp;/g, "&"), base);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || SKIP_EXT.test(u.pathname)) continue;
    out.push({ url: u, text: m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) });
  }
  return out;
}
function urlsInSource(html) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const m of html.matchAll(/https?:\/\/[^\s"'<>\\)]+/gi)) {
    let u;
    try {
      u = new URL(m[0].replace(/[,;.]+$/, ""));
    } catch {
      continue;
    }
    if (SKIP_EXT.test(u.pathname) || seen.has(u.origin)) continue;
    seen.add(u.origin);
    out.push(u);
  }
  return out;
}
function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));
}
var DETAIL = /\/(portfolio|companies|company|startups|investments)\/[^/]+\/?$/i;
function companyName(html, fallback) {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{2,80})["']/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]{1,200}?)<\/title>/i)?.[1];
  const cand = (og ?? title?.split(/\s[|\-–—·:]\s|[|:]/)[0] ?? "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  return cand.length >= 2 && cand.length <= 60 && !/^(home|welcome|homepage|index)$/i.test(cand) ? cand : prettyName(fallback);
}
var isOwnBoard = (identifier, vcHost) => {
  const stem = vcHost.split(".")[0].replace(/[-_]/g, "");
  return stem.length >= 4 && identifier.toLowerCase().replace(/[-_]/g, "").includes(stem);
};
async function fetchHtml(url, ctx) {
  try {
    const u = await assertPublicUrl(url);
    if (!ctx.robots.has(u.origin)) {
      let allow = () => true;
      try {
        const { r: r2 } = await politeGet(`${u.origin}/robots.txt`, { fetchImpl: ctx.fetchImpl });
        if (r2.status >= 500) allow = () => false;
        else if (r2.ok) allow = parseRobots(await r2.text());
      } catch {
      }
      ctx.robots.set(u.origin, allow);
    }
    if (!ctx.robots.get(u.origin)(u.pathname || "/")) return { ok: false, why: "robots.txt disallows it" };
    const { r, url: fu } = await politeGet(u.href, { fetchImpl: ctx.fetchImpl });
    if (!r.ok) return { ok: false, why: `HTTP ${r.status}` };
    return { ok: true, html: (await r.text()).slice(0, MAX_HTML2), url: fu };
  } catch (e) {
    return { ok: false, why: e.message?.slice(0, 120) || "could not load" };
  }
}
async function processVcSite(db, t, firm, ctx) {
  const home = await fetchHtml(t.url, ctx);
  if (!home.ok) return { status: "failed", note: `Could not load the VC website (${home.why}). Check the address in the VC list.` };
  const vcKey = siteKey(home.url), vcHost = home.url.hostname.replace(/^www\./, "");
  const links = extractLinks(home.html, home.url).filter((l) => siteKey(l.url) === vcKey);
  const uniq = (arr) => [...new Map(arr.map((l) => [l.url.origin + l.url.pathname.replace(/\/$/, ""), l])).values()];
  let portfolio = uniq(links.filter((l) => PORTFOLIO.test(l.text + " " + l.url.pathname) && !CAREER.test(l.url.pathname))).slice(0, 4).map((l) => l.url.href);
  const jobsPages = uniq(links.filter((l) => CAREER.test(l.text + " " + l.url.pathname) || /talent/i.test(l.url.pathname))).slice(0, 2).map((l) => l.url.href);
  if (!portfolio.length) for (const path of ["/portfolio", "/companies", "/portfolio-companies", "/startups"]) {
    const p = await fetchHtml(new URL(path, home.url).href, ctx);
    if (p.ok) {
      portfolio.push(p.url.href);
      break;
    }
  }
  const boards = /* @__PURE__ */ new Map(), sites = /* @__PURE__ */ new Map();
  let pages = 0;
  for (const pu of portfolio) {
    const pg = pu === home.url.href ? home : await fetchHtml(pu, ctx);
    if (!pg.ok) continue;
    pages++;
    for (const b of boardsInHtml(pg.html, pg.url.href).boards) if (!isOwnBoard(b.identifier, vcHost)) boards.set(`${b.adapter}:${b.identifier.toLowerCase()}`, { ...b, evidence: pg.url.href });
    for (const l of extractLinks(pg.html, pg.url)) {
      const k = siteKey(l.url);
      if (k === vcKey || junkHost(k)) continue;
      if (!sites.has(k)) sites.set(k, { url: l.url.origin + "/", evidence: pg.url.href });
    }
    for (const u of urlsInSource(pg.html)) {
      const k = siteKey(u);
      if (k === vcKey || junkHost(k)) continue;
      if (!sites.has(k)) sites.set(k, { url: u.origin + "/", evidence: pg.url.href });
    }
  }
  const capNow = Math.max(1, Math.min(300, Number(t.cap) || 80));
  let viaSitemap = 0;
  if (sites.size < 5) {
    const sm = await fetchHtml(new URL("/sitemap.xml", home.url).href, ctx);
    if (sm.ok) {
      let locs = sitemapUrls(sm.html);
      if (/<sitemapindex/i.test(sm.html)) {
        const kids = locs.filter((u) => /(portfolio|compan|startup|investment)/i.test(u)).slice(0, 3);
        locs = [];
        for (const kUrl of kids) {
          const c = await fetchHtml(kUrl, ctx);
          if (c.ok) locs.push(...sitemapUrls(c.html));
        }
      }
      for (const loc of locs) {
        let u;
        try {
          u = new URL(loc);
        } catch {
          continue;
        }
        if (siteKey(u) !== vcKey || !DETAIL.test(u.pathname) || sites.size >= capNow) continue;
        const key = "detail:" + u.href;
        if (!sites.has(key)) {
          sites.set(key, { url: u.href, evidence: u.href });
          viaSitemap++;
        }
      }
    }
  }
  for (const ju of jobsPages) {
    const jp = await fetchHtml(ju, ctx);
    if (!jp.ok) continue;
    const bs = boardsInHtml(jp.html, jp.url.href).boards.filter((b) => !isOwnBoard(b.identifier, vcHost));
    if (bs.length >= 3) {
      pages++;
      for (const b of bs) boards.set(`${b.adapter}:${b.identifier.toLowerCase()}`, { ...b, evidence: jp.url.href });
    }
  }
  let imported = 0;
  if (boards.size) {
    const items = [...boards.values()].map((b) => ({ name: b.name, ats: { adapter: b.adapter, identifier: b.identifier }, investors: [{ vc: firm.name, evidence_url: b.evidence, verify: false }] }));
    imported = (await importCompanies(db, items)).companies_created;
  }
  const cap = Math.max(1, Math.min(300, Number(t.cap) || 80));
  const targets = [...sites.values()].slice(0, cap).map((s) => ({ vc_firm_id: t.vc_firm_id, kind: "company_site", url: s.url, evidence_url: s.evidence }));
  for (let i = 0; i < targets.length; i += 100) await db.rest("discovery_targets?on_conflict=vc_firm_id,url", { method: "POST", body: targets.slice(i, i + 100), prefer: "resolution=ignore-duplicates,return=minimal" });
  const note = `pages read: ${pages}; boards found directly: ${boards.size} (${imported} new companies); company sites queued: ${targets.length}${sites.size > cap ? ` of ${sites.size} (cap ${cap})` : ""}${viaSitemap ? `; via sitemap: ${viaSitemap}` : ""}`;
  if (!pages && !viaSitemap) return { status: "no_board", note: "No readable portfolio page found (it may load with JavaScript). Use Quick add for this VC." };
  return { status: "done", note };
}
async function processCompanySite(db, t, firm, ctx) {
  const home = await fetchHtml(t.url, ctx);
  if (!home.ok) return { status: "failed", note: `Could not load the company site (${home.why}).` };
  const base = home.url, ck = siteKey(base);
  if (firm.website && /^https?:\/\//i.test(firm.website) && ck === siteKey(new URL(firm.website))) {
    const ext = extractLinks(home.html, base).filter((l) => siteKey(l.url) !== ck && !junkHost(siteKey(l.url)));
    const best = ext.find((l) => /(website|visit|www|site|\.com|\.io|\.co)/i.test(l.text)) ?? ext[0] ?? (urlsInSource(home.html).find((u) => siteKey(u) !== ck && !junkHost(siteKey(u))) && { url: urlsInSource(home.html).find((u) => siteKey(u) !== ck && !junkHost(siteKey(u))) });
    if (!best) return { status: "no_board", note: "No company website found on this VC page." };
    await db.rest("discovery_targets?on_conflict=vc_firm_id,url", { method: "POST", body: [{ vc_firm_id: t.vc_firm_id, kind: "company_site", url: best.url.origin + "/", evidence_url: t.url }], prefer: "resolution=ignore-duplicates,return=minimal" });
    return { status: "done", note: `VC company page -> ${best.url.origin}` };
  }
  let boards = boardsInHtml(home.html, base.href).boards;
  const tried = /* @__PURE__ */ new Set([base.href]);
  let careersUrl = null;
  if (!boards.length) {
    const cands = extractLinks(home.html, base).filter((l) => CAREER.test(l.text + " " + l.url.pathname) && siteKey(l.url) === ck).map((l) => l.url.href);
    for (const c of [...new Set(cands)].slice(0, 2)) {
      tried.add(c);
      const p = await fetchHtml(c, ctx);
      if (!p.ok) continue;
      careersUrl ??= p.url.href;
      boards = boardsInHtml(p.html, p.url.href).boards;
      if (boards.length) break;
    }
  }
  if (!boards.length) for (const path of ["/careers", "/jobs"]) {
    const u = new URL(path, base).href;
    if (tried.has(u)) continue;
    tried.add(u);
    const p = await fetchHtml(u, ctx);
    if (!p.ok) continue;
    careersUrl ??= p.url.href;
    boards = boardsInHtml(p.html, p.url.href).boards;
    if (boards.length) break;
  }
  const name = companyName(home.html, base.hostname.replace(/^www\./, "").split(".")[0]);
  const inv = [{ vc: firm.name, evidence_url: t.evidence_url, verify: false }];
  if (boards.length) {
    await importCompanies(db, [{ name, website: base.origin, ats: { adapter: boards[0].adapter, identifier: boards[0].identifier }, investors: inv }]);
    return { status: "done", note: `${name}: ${boards[0].adapter}:${boards[0].identifier}` };
  }
  if (careersUrl) {
    await importCompanies(db, [{ name, website: base.origin, careers_url: careersUrl, investors: inv }]);
    return { status: "done", note: `${name}: careers page only (no supported job system detected)` };
  }
  return { status: "no_board", note: `${name}: no careers page found` };
}
async function startDiscovery(db, { scope = "israeli", max_per_vc = 80 } = {}) {
  const firms = await db.all("vc_firms?select=id,name,firm_type,website");
  const wanted = Array.isArray(scope) ? firms.filter((f) => scope.includes(f.name)) : scope === "all" ? firms : firms.filter((f) => f.firm_type === "israeli");
  const cap = Math.max(1, Math.min(300, Math.round(Number(max_per_vc)) || 80));
  const queued = [], skipped = [];
  for (const f of wanted) {
    if (!/^https?:\/\//i.test(f.website ?? "")) {
      skipped.push({ vc: f.name, reason: "no website set" });
      continue;
    }
    const [ex] = await db.rest(`discovery_targets?vc_firm_id=eq.${f.id}&kind=eq.vc_site&select=id`);
    if (ex) await db.rest(`discovery_targets?id=eq.${ex.id}`, { method: "PATCH", body: { url: f.website, status: "pending", cap, note: null, updated_at: (/* @__PURE__ */ new Date()).toISOString() }, prefer: "return=minimal" });
    else await db.rest("discovery_targets", { method: "POST", body: [{ vc_firm_id: f.id, kind: "vc_site", url: f.website, cap }], prefer: "return=minimal" });
    queued.push(f.name);
  }
  return { queued, skipped };
}
async function discoverStep(db, { budgetMs = 4e4, concurrency = 6, fetchImpl = fetch, now = Date.now } = {}) {
  const t0 = now();
  const ctx = { fetchImpl, robots: /* @__PURE__ */ new Map() };
  const firms = new Map((await db.all("vc_firms?select=id,name,website")).map((f) => [f.id, f]));
  await db.rest(`discovery_targets?status=eq.working&updated_at=lt.${new Date(now() - 10 * 6e4).toISOString()}`, { method: "PATCH", body: { status: "pending" }, prefer: "return=minimal" });
  const log = [];
  let processed = 0;
  while (now() - t0 < budgetMs) {
    const pending = (await db.rest("discovery_targets?status=eq.pending&select=*&limit=60")).sort((a, b) => a.kind === b.kind ? String(a.created_at).localeCompare(String(b.created_at)) : a.kind === "vc_site" ? -1 : 1);
    if (!pending.length) break;
    const pick = pending[0].kind === "vc_site" ? pending.filter((p) => p.kind === "vc_site").slice(0, 2) : pending.slice(0, concurrency);
    const claimed = await db.rest(`discovery_targets?status=eq.pending&id=in.(${pick.map((p) => `"${p.id}"`).join(",")})`, { method: "PATCH", body: { status: "working", updated_at: new Date(now()).toISOString() } });
    await Promise.all(claimed.map(async (t) => {
      const firm = firms.get(t.vc_firm_id) ?? { name: "Unknown" };
      let r;
      try {
        r = t.kind === "vc_site" ? await processVcSite(db, t, firm, ctx) : await processCompanySite(db, t, firm, ctx);
      } catch {
        r = { status: "failed", note: "Unexpected error while reading this site." };
      }
      await db.rest(`discovery_targets?id=eq.${t.id}`, { method: "PATCH", body: { status: r.status, note: r.note.slice(0, 300), attempts: (t.attempts ?? 0) + 1, updated_at: new Date(now()).toISOString() }, prefer: "return=minimal" });
      processed++;
      log.push({ vc: firm.name, kind: t.kind, url: t.url, status: r.status, note: r.note });
    }));
  }
  const left = await db.all("discovery_targets?status=in.(pending,working)&select=id");
  return { processed, remaining: left.length, log: log.slice(-30) };
}
async function discoveryStatus(db) {
  const [targets, firms, rels] = await Promise.all([db.all("discovery_targets?select=vc_firm_id,kind,status"), db.all("vc_firms?select=id,name,firm_type,website"), db.all("vc_company_relationships?select=vc_firm_id,status")]);
  const by = {};
  for (const t of targets) by[t.status] = (by[t.status] ?? 0) + 1;
  return {
    totals: by,
    remaining: (by.pending ?? 0) + (by.working ?? 0),
    vcs: firms.map((f) => {
      const mine = targets.filter((t) => t.vc_firm_id === f.id), r = rels.filter((x) => x.vc_firm_id === f.id);
      return { vc: f.name, type: f.firm_type, website: f.website ?? null, sites_found: mine.filter((t) => t.kind === "company_site").length, sites_done: mine.filter((t) => t.kind === "company_site" && t.status === "done").length, sites_no_board: mine.filter((t) => t.kind === "company_site" && t.status === "no_board").length, pending: mine.filter((t) => ["pending", "working"].includes(t.status)).length, links_unverified: r.filter((x) => x.status === "unverified").length, links_verified: r.filter((x) => x.status === "verified").length };
    }).sort((a, b) => a.vc.localeCompare(b.vc))
  };
}
async function verifyVc(db, vcName) {
  const [f] = await db.rest(`vc_firms?name=eq.${encodeURIComponent(vcName)}&select=id`);
  if (!f) return { ok: false, error: "unknown VC" };
  const rows = await db.rest(`vc_company_relationships?vc_firm_id=eq.${f.id}&status=eq.unverified&evidence_url=not.is.null`, { method: "PATCH", body: { status: "verified", verified_at: (/* @__PURE__ */ new Date()).toISOString() } });
  return { ok: true, verified: rows.length };
}

// src/metrics.mjs
var analyticsOn = () => process.env.ANALYTICS !== "off";
async function track(db, names) {
  if (!analyticsOn() || !names?.length) return;
  let timer;
  try {
    await Promise.race([
      db.rest("rpc/bump_metrics", { method: "POST", body: { p_day: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), p_names: names.map((n) => String(n).slice(0, 80)) }, prefer: "return=minimal" }),
      new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error("timeout")), 1500);
      })
    ]);
  } catch {
  } finally {
    clearTimeout(timer);
  }
}

// src/analytics.mjs
var MIN_FOR_BREAKDOWN = 5;
async function coverage(db) {
  const [firms, cos, rels] = await Promise.all([
    db.all("vc_firms?select=id,name,firm_type"),
    db.all("portfolio_companies?select=id,name,hiring_status,open_jobs_count"),
    db.all("vc_company_relationships?select=vc_firm_id,company_id,status")
  ]);
  const co = new Map(cos.map((c) => [c.id, c]));
  const rows = firms.map((f) => {
    const mine = rels.filter((r) => r.vc_firm_id === f.id && r.status !== "disputed" && co.has(r.company_id));
    const list2 = mine.map((r) => co.get(r.company_id));
    return {
      vc: f.name,
      type: f.firm_type,
      companies: list2.length,
      verified_links: mine.filter((r) => r.status === "verified").length,
      unverified_links: mine.filter((r) => r.status === "unverified").length,
      open_jobs: list2.reduce((n, c) => n + (c.open_jobs_count ?? 0), 0),
      scan_problems: list2.filter((c) => c.hiring_status === "scan_failed").length,
      not_scanned: list2.filter((c) => c.hiring_status === "not_yet_scanned").length
    };
  }).sort((a, b) => b.companies - a.companies || a.vc.localeCompare(b.vc));
  const linked = new Set(rels.filter((r) => r.status !== "disputed").map((r) => r.company_id));
  return {
    summary: {
      vc_firms_total: firms.length,
      vc_firms_with_companies: rows.filter((r) => r.companies > 0).length,
      companies: cos.length,
      companies_without_vc_link: cos.filter((c) => !linked.has(c.id)).length,
      companies_with_open_jobs: cos.filter((c) => (c.open_jobs_count ?? 0) > 0).length,
      open_jobs: cos.reduce((n, c) => n + (c.open_jobs_count ?? 0), 0)
    },
    by_vc: rows
  };
}
var top = (m, n = 15) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([name, count]) => ({ name, count }));
async function usage(db, days = 30, now = Date.now()) {
  days = Math.min(365, Math.max(1, Math.round(days) || 30));
  const since = new Date(now - (days - 1) * 864e5).toISOString().slice(0, 10);
  const rows = await db.all(`metrics_daily?day=gte.${since}&select=day,name,count`);
  const totals = /* @__PURE__ */ new Map(), byDay = /* @__PURE__ */ new Map(), groups = { skill: /* @__PURE__ */ new Map(), level: /* @__PURE__ */ new Map(), fn: /* @__PURE__ */ new Map(), co_click: /* @__PURE__ */ new Map() };
  for (const r of rows) {
    const [kind, ...rest] = r.name.split(":");
    const n = Number(r.count);
    if (rest.length && groups[kind]) {
      groups[kind].set(rest.join(":"), (groups[kind].get(rest.join(":")) ?? 0) + n);
      continue;
    }
    totals.set(r.name, (totals.get(r.name) ?? 0) + n);
    (byDay.get(r.day) ?? byDay.set(r.day, {}).get(r.day))[r.name] = n;
  }
  const T = (k) => totals.get(k) ?? 0;
  const pct = (a, b) => b ? Math.round(a / b * 1e3) / 10 : null;
  const uploads = T("cv_uploaded"), enough = uploads >= MIN_FOR_BREAKDOWN;
  const keys = ["visit", "cv_uploaded", "matches_viewed", "apply_click", "email_requested", "email_confirmed", "digest_sent"];
  return {
    days,
    since,
    totals: Object.fromEntries([...totals].sort()),
    series: [...byDay].sort().map(([day, v]) => ({ day, ...Object.fromEntries(keys.map((k) => [k, v[k] ?? 0])) })),
    funnel: { visit_to_upload_pct: pct(uploads, T("visit")), upload_to_email_request_pct: pct(T("email_requested"), uploads), email_confirm_pct: pct(T("email_confirmed"), T("email_requested")), clicks_per_matches_view: T("matches_viewed") ? Math.round(T("apply_click") / T("matches_viewed") * 100) / 100 : null },
    visitor_skills: enough ? top(groups.skill) : null,
    visitor_levels: enough ? top(groups.level) : null,
    visitor_functions: enough ? top(groups.fn) : null,
    breakdown_note: enough ? null : `Skill, level and function breakdowns appear after ${MIN_FOR_BREAKDOWN} CV uploads (${uploads} so far) so no single visitor can be inferred.`,
    clicks_by_company: top(groups.co_click, 10)
  };
}
async function demand(db) {
  const m = /* @__PURE__ */ new Map();
  for (const j of await db.catalog()) for (const s of j.skills ?? []) m.set(s, (m.get(s) ?? 0) + 1);
  return top(m);
}
async function emailStats(db) {
  const rows = await db.all("email_subscriptions?select=frequency,confirmed_at");
  return { pending_confirmation: rows.filter((r) => !r.confirmed_at).length, weekly_active: rows.filter((r) => r.confirmed_at && r.frequency === "weekly").length };
}
async function analytics(db, days) {
  const [cov, use, dem, em] = await Promise.all([coverage(db), usage(db, days), demand(db), emailStats(db)]);
  return { coverage: cov, usage: use, job_skills_in_demand: dem, email: em };
}

// src/ui.mjs
var CSS = `:root{--bg:#F6F1E7;--card:#FBF8F2;--line:#E3DCCD;--ink:#1B2438;--muted:#6B7488;--nav:#0B1426;--brass:#B08D57;--brass-l:#D4B483;--good:#3E8E6A;--amber:#C98A2B;--bad:#B5483F;color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme:dark){:root{--bg:#0B1426;--card:#101C33;--line:#2B4066;--ink:#EDE8DC;--muted:#8A96AB;--nav:#070E1C;--brass:#D4B483;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif}
header{background:var(--nav);color:#F6F1E7;padding:14px 16px;border-bottom:3px solid var(--brass)}h1{font:600 20px/1.2 Georgia,"Source Serif 4",serif;margin:0}header small{color:var(--brass-l)}
main{max-width:860px;margin:0 auto;padding:14px 14px 60px}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:12px}
h2{font-size:17px;margin:0 0 6px}.hint{color:var(--muted);font-size:13px}label{display:block;font-weight:600;margin:10px 0 4px;font-size:14px}
input,select,textarea{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);font:inherit}textarea{min-height:120px}input[type=checkbox],input[type=radio]{width:auto}
button,.btn{background:var(--brass);color:#0B1426;border:1px solid var(--brass);border-radius:8px;padding:9px 16px;font:600 15px inherit;cursor:pointer;text-decoration:none;display:inline-block}button.sec{background:transparent;color:var(--ink);border-color:var(--line)}button.link{background:none;border:none;color:var(--muted);text-decoration:underline;padding:6px 0;font-weight:400}button:disabled{opacity:.5}
.drop{display:block;border:2px dashed var(--brass);border-radius:10px;padding:22px;text-align:center;cursor:pointer;font-weight:600}.drop.over{background:var(--line)}
.msg{margin-top:8px;font-size:14px}.err{color:var(--bad)}.ok{color:var(--good)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.chip{display:inline-flex;align-items:center;gap:4px;font-size:13px;padding:2px 9px;border-radius:99px;border:1px solid var(--line);background:var(--bg)}.chip.m{border-color:var(--good);color:var(--good)}.chip.x{color:var(--muted);border-style:dashed}.chip button{all:unset;cursor:pointer;color:var(--muted);padding:0 2px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.band{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;font-size:13px}.band span{padding:2px 10px;border-radius:99px;border:1px solid currentColor;font-weight:600}
.job{border:1px solid var(--line);border-radius:10px;padding:12px;margin:10px 0;background:var(--bg)}.top{display:flex;justify-content:space-between;gap:10px}.job h3{font-size:16px;margin:0}.meta{color:var(--muted);font-size:13px}
.badge{flex:none;text-align:center;min-width:74px;border-radius:10px;padding:4px 8px;font-weight:700;border:2px solid currentColor}.badge small{display:block;font-weight:600;font-size:11px}
.strong{color:var(--good)}.good{color:var(--brass)}.stretch{color:var(--amber)}.weak{color:var(--muted)}
details{margin-top:6px;font-size:13px}summary{cursor:pointer;color:var(--muted)}.why{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--line);padding:3px 0}
.apply{margin-top:8px;font-size:13px;padding:6px 12px}.priv{margin-top:10px;padding:8px 10px;border-left:3px solid var(--brass);background:var(--bg)}`;
var shell = (title, body, script) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="referrer" content="no-referrer"><title>${title}</title><style>${CSS}</style></head><body>${body}<script>${script}</script></body></html>`;
var COMMON = `var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
async function api(p,o){o=o||{};var h={'x-requested-with':'cvmatch'};if(o.type)h['content-type']=o.type;
 var r=await fetch(p,{method:o.method||'GET',credentials:'same-origin',headers:h,body:o.body});var j={};try{j=await r.json()}catch(e){}return {ok:r.ok,status:r.status,data:j}}`;
function renderApp() {
  return shell("Job Match: see which roles your CV is strongest for", `
<header><h1>Job Match</h1><small>Which VC-backed roles is your CV strongest for?</small></header>
<main>
<section class="card" id="up"><h2>1. Upload your CV</h2>
<p class="hint">PDF, DOCX or text, up to 4 MB. No account or login.</p>
<label class="drop" id="drop" for="file">Tap to choose your CV file<input type="file" id="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" hidden></label>
<button class="link" id="pastebtn" type="button">or paste text instead</button>
<div id="pastebox" hidden><textarea id="paste" placeholder="Paste your CV text here"></textarea><p><button id="usepaste" type="button">Analyze text</button></p></div>
<div id="upmsg" class="msg" role="status"></div>
<p class="hint priv"><b>Privacy:</b> your CV file is read in memory and never saved. We keep only a short skills summary (no name, email, phone or employers) tied to this browser for <span id="hrs">24</span> hours. Nobody else can see it.</p></section>
<section id="after" hidden>
<div class="card" id="profile"><h2>2. Check your profile</h2><p class="hint">This is what we found. Remove or add anything, then update your matches.</p>
<label>Skills</label><div class="chips" id="skills"></div><input id="newskill" placeholder="Add a skill and press Enter" maxlength="40">
<label>Your main functions (up to 3, first is strongest)</label><div class="chips" id="fns"></div><select id="fnadd"><option value="">Add a function...</option></select>
<div class="row2"><div><label for="level">Level</label><select id="level"></select></div><div><label for="years">Years of experience</label><input id="years" type="number" min="0" max="40"></div></div>
<label for="locs">Where you want to work (comma separated)</label><input id="locs" placeholder="tel aviv, jerusalem" maxlength="120">
<label><input type="checkbox" id="remote"> Open to remote roles</label>
<p><button id="update" type="button">Update my matches</button></p><div id="pmsg" class="msg"></div></div>
<div class="card" id="results"><h2>3. Your matches</h2><div class="band" id="bands"></div>
<div class="row2"><div><label for="min">Show</label><select id="min"><option value="0">All roles</option><option value="35">Stretch and above (35+)</option><option value="55">Good and above (55+)</option><option value="75">Strong only (75+)</option></select></div><div><label for="q">Search</label><input id="q" placeholder="title, company, place" maxlength="60"></div></div>
<div class="row2"><div><label for="vc">VC firm</label><select id="vc"><option value="">All VC firms</option></select></div><div><label for="co">Company</label><select id="co"><option value="">All companies</option></select></div></div>
<div class="row2"><div><label for="wp">Work arrangement</label><select id="wp"><option value="">Any</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></div><div><label style="margin-top:30px;font-weight:400"><input type="checkbox" id="new"> First seen in the last 7 days</label></div></div>
<div id="list"></div><p class="hint">Strength compares the skills, role and level in each listing with your CV. It is a guide, not a promise.</p></div>
<div class="card" id="gaps" hidden><h2>Skills that would open more doors</h2><p class="hint" id="gapnote"></p><div id="gaplist"></div><label>Skills of yours that these roles ask for most</label><div class="chips" id="strong"></div><p class="hint">Only add a skill to your CV if you really have it.</p></div>
<div class="card" id="email" hidden><h2>4. Email me my matches</h2><p class="hint">We email only after you confirm your address.</p>
<label for="em">Email</label><input id="em" type="email" autocomplete="email" maxlength="254">
<label>How often</label><label style="font-weight:400"><input type="radio" name="fq" value="once" checked> Once, now</label><label style="font-weight:400"><input type="radio" name="fq" value="weekly"> Weekly, only new roles at or above my strength level</label>
<label for="ms">Minimum strength for weekly emails</label><select id="ms"><option value="55">Good (55+)</option><option value="65">65+</option><option value="75" selected>Strong (75+)</option><option value="85">85+</option></select>
<label style="font-weight:400"><input type="checkbox" id="cons"> I agree to receive this email. My address and skills summary are stored until I unsubscribe (one click in every email).</label>
<p><button id="send" type="button">Send me a confirmation link</button></p><div id="emsg" class="msg" role="status"></div></div>
<div class="card"><h2>Your data</h2><p class="hint">Delete your skills summary from our servers right now.</p><button class="sec" id="del" type="button">Delete my data</button></div>
</section></main>`, COMMON + `
var P=null,ME=null,timer=null;
function setMsg(id,t,cls){var m=$(id);m.className='msg'+(cls?' '+cls:'');m.textContent=t||''}
async function upload(body,type,name){setMsg('upmsg','Reading your CV...');$('drop').style.opacity=.6;
 var r=await api('/api/cv',{method:'POST',body:body,type:type});$('drop').style.opacity=1;
 if(!r.ok){setMsg('upmsg',r.data.error||'Upload failed','err');return}
 setMsg('upmsg','Done. Found '+r.data.profile.skills.length+' skills.','ok');P=r.data.profile;show()}
$('file').onchange=function(){var f=this.files[0];if(!f)return;if(f.size>4*1024*1024){setMsg('upmsg','That file is over 4 MB. Try a smaller PDF or paste the text.','err');return}upload(f,'application/octet-stream');this.value=''};
['dragover','dragenter'].forEach(function(e){$('drop').addEventListener(e,function(ev){ev.preventDefault();$('drop').classList.add('over')})});
['dragleave','drop'].forEach(function(e){$('drop').addEventListener(e,function(ev){ev.preventDefault();$('drop').classList.remove('over');if(e==='drop'&&ev.dataTransfer.files[0]){var f=ev.dataTransfer.files[0];if(f.size>4*1024*1024){setMsg('upmsg','That file is over 4 MB.','err');return}upload(f,'application/octet-stream')}})});
$('pastebtn').onclick=function(){$('pastebox').hidden=!$('pastebox').hidden};
$('usepaste').onclick=function(){var t=$('paste').value;if(t.trim().length<80){setMsg('upmsg','Paste a little more of your CV.','err');return}upload(t,'text/plain')};
function chips(box,items,onrm,cls){box.replaceChildren();items.forEach(function(s,i){var c=el('span','chip'+(cls?' '+cls:''),s);if(onrm){var b=el('button',null,'\\u00d7');b.type='button';b.setAttribute('aria-label','Remove '+s);b.onclick=function(){onrm(i)};c.append(b)}box.append(c)})}
function show(){$('after').hidden=false;
 chips($('skills'),P.skills,function(i){P.skills.splice(i,1);show()});
 chips($('fns'),P.functions,function(i){P.functions.splice(i,1);show()});
 $('level').value=P.level;$('years').value=P.years==null?'':P.years;$('locs').value=P.locations.join(', ');$('remote').checked=P.remote_ok;
 loadMatches();loadGaps()}
async function boot(){var r=await api('/api/me');ME=r.data;
 ME.levels.forEach(function(l){var o=el('option',null,l);o.value=l;$('level').append(o)});
 ME.functions.forEach(function(f){var o=el('option',null,f);o.value=f;$('fnadd').append(o)});
 if(ME.emailEnabled)$('email').hidden=false;
 if(ME.hasProfile){P=ME.profile;show()}}
$('newskill').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();var v=this.value.trim().toLowerCase();if(v&&P.skills.indexOf(v)<0&&P.skills.length<60){P.skills.push(v)}this.value='';show()}});
$('fnadd').onchange=function(){var v=this.value;if(v&&P.functions.indexOf(v)<0&&P.functions.length<3)P.functions.push(v);this.value='';show()};
$('update').onclick=async function(){P.level=$('level').value;P.years=$('years').value===''?null:Number($('years').value);P.locations=$('locs').value.split(',').map(function(s){return s.trim().toLowerCase()}).filter(Boolean);P.remote_ok=$('remote').checked;
 setMsg('pmsg','Updating...');var r=await api('/api/profile',{method:'POST',type:'application/json',body:JSON.stringify(P)});
 if(r.ok){P=r.data.profile;setMsg('pmsg','Updated.','ok');show()}else setMsg('pmsg',r.data.error||'Could not update','err')};
var LAB={strong:'Strong',good:'Good',stretch:'Stretch',weak:'Weak'};
async function loadMatches(){var qs='min='+$('min').value+'&q='+encodeURIComponent($('q').value)+'&vc='+encodeURIComponent($('vc').value)+'&company='+encodeURIComponent($('co').value)+'&workplace='+$('wp').value+($('new').checked?'&new=7':'');
 var r=await api('/api/matches?'+qs);
 if(r.status===401){$('after').hidden=true;setMsg('upmsg','Your session expired. Please upload your CV again.','err');return}
 var d=r.data;fillSel('vc',d.facets.vcs,'All VC firms');fillSel('co',d.facets.companies,'All companies');$('bands').replaceChildren();['strong','good','stretch','weak'].forEach(function(b){var s=el('span',b,d.bands[b]+' '+LAB[b].toLowerCase());$('bands').append(s)});
 var L=$('list');L.replaceChildren();
 if(!d.total){L.append(el('p','hint','No jobs are listed yet. Check back soon.'));return}
 if(!d.jobs.length)L.append(el('p','hint','No roles match these filters.'));
 d.jobs.forEach(function(j){var c=el('div','job');var top=el('div','top');var l=el('div');l.append(el('h3',null,j.title));
  l.append(el('div','meta',[j.company,j.location,j.workplace&&j.workplace!=='unknown'?j.workplace:null].filter(Boolean).join(' \\u00b7 ')));
  if(j.vcs&&j.vcs.length)l.append(el('div','meta','Backed by '+j.vcs.map(function(v){return v.name+(v.verified?'':' (unverified)')}).join(', ')));top.append(l);
  var bd=el('div','badge '+j.band,String(j.score));bd.append(el('small',null,LAB[j.band]));top.append(bd);c.append(top);
  if(j.matched.length||j.missing.length){var cs=el('div','chips');j.matched.slice(0,6).forEach(function(s){cs.append(el('span','chip m','\\u2713 '+s))});j.missing.slice(0,4).forEach(function(s){cs.append(el('span','chip x','not on CV: '+s))});c.append(cs)}
  var dt=el('details');dt.append(el('summary',null,'Why '+j.score+'/100'));j.reasons.forEach(function(x){var w=el('div','why');w.append(el('span',null,x.reason),el('span',null,x.score+'/'+x.max));dt.append(w)});c.append(dt);
  if(j.excerpt)c.append(el('p','meta',j.excerpt));
  if(j.apply_url){var a=el('a','btn apply','View and apply');a.href='/go?j='+encodeURIComponent(j.id);a.target='_blank';a.rel='noopener noreferrer';c.append(a)}
  L.append(c)})}
function fillSel(id,items,all){var s=$(id),cur=s.value;s.replaceChildren();var o=el('option',null,all);o.value='';s.append(o);items.forEach(function(i){var x=el('option',null,i.name+' ('+i.n+')');x.value=i.name;s.append(x)});s.value=cur}
async function loadGaps(){var r=await api('/api/gaps');if(!r.ok){$('gaps').hidden=true;return}var d=r.data;$('gaps').hidden=false;
 $('gapnote').textContent=d.based_on?('Based on the '+d.based_on+' roles you fit best.'):'Not enough close-fit roles yet to compare.';
 var L=$('gaplist');L.replaceChildren();if(!d.gaps.length&&d.based_on)L.append(el('p','hint','No clear gaps: the close-fit roles mostly ask for skills you already show.'));
 d.gaps.forEach(function(g){var w=el('div','why');var l=el('span',null,g.skill);var ex=g.examples.map(function(e){return e.title+' at '+e.company}).join('; ');w.append(l,el('span',null,g.count+' of '+d.based_on));L.append(w);L.append(el('div','meta','e.g. '+ex))});
 chips($('strong'),d.strengths.map(function(x){return x.skill+' ('+x.count+')'}),null,'m')}
['vc','co','wp','new'].forEach(function(i){$(i).onchange=loadMatches});
$('min').onchange=loadMatches;$('q').addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(loadMatches,300)});
$('send').onclick=async function(){if(!$('cons').checked){setMsg('emsg','Please tick the box to agree.','err');return}
 var fq=document.querySelector('input[name=fq]:checked').value;setMsg('emsg','Sending...');this.disabled=true;
 var r=await api('/api/email/subscribe',{method:'POST',type:'application/json',body:JSON.stringify({email:$('em').value,frequency:fq,min_score:Number($('ms').value),consent:true})});
 this.disabled=false;setMsg('emsg',r.ok?r.data.message:(r.data.error||'Could not send'),r.ok?'ok':'err')};
$('del').onclick=async function(){if(!confirm('Delete your skills summary now?'))return;await api('/api/delete',{method:'POST'});P=null;$('after').hidden=true;setMsg('upmsg','Your data was deleted.','ok')};
boot();`);
}
function renderTokenPage(kind) {
  const c = kind === "confirm";
  return shell(
    c ? "Confirm" : "Unsubscribe",
    `<header><h1>Job Match</h1></header><main><div class="card"><h2>${c ? "Confirm your job matches" : "Unsubscribe"}</h2><p class="hint">${c ? "Press the button to confirm this address and receive your matches." : "Press the button to stop all emails and delete your address and skills summary."}</p><p><button id="go" type="button">${c ? "Confirm" : "Unsubscribe and delete my details"}</button></p><div id="m" class="msg" role="status"></div></div></main>`,
    COMMON + `var t=new URLSearchParams(location.search).get('t');history.replaceState(null,'',location.pathname);
var MSG={subscribed:'Confirmed. Your first matches are on the way, then weekly updates.',sent_once:'Confirmed. Your matches are on the way.',already:'This address is already confirmed.',expired:'This link has expired. Request a new one from the site.',invalid:'This link is not valid.',error:'We could not send the email right now. Please try the link again in a few minutes.',unsubscribed:'You are unsubscribed and your details were deleted.'};
$('go').onclick=async function(){var m=$('m');if(!t){m.className='msg err';m.textContent=MSG.invalid;return}this.disabled=true;
 var r=await api('/api/email/${kind}',{method:'POST',type:'application/json',body:JSON.stringify({t:t})});
 m.className='msg '+(r.ok&&r.data.state!=='error'?'ok':'err');m.textContent=MSG[r.data.state]||'Something went wrong.';if(!r.ok||r.data.state==='error')this.disabled=false}`
  );
}
function renderAdmin() {
  return shell("Admin", `<header><h1>Admin</h1><small>Catalog tools</small></header><main>
<div class="card"><label for="tk">Admin token</label><input id="tk" type="password" autocomplete="off"><p class="hint">Kept only in this tab; never stored.</p></div>
<div class="card"><h2>Discover everything (automatic)</h2>
<p class="hint">Reads each VC's website, finds its companies, finds each company's job board and adds them. Keep this tab open: it works in small steps (the first run can take 30 to 60 minutes; the nightly job finishes anything left).</p>
<label for="scope">Which VCs</label><select id="scope"><option value="israeli">All Israeli VCs</option><option value="all">All 27 VCs (global firms add many non-Israeli companies)</option></select>
<label for="cap">Max companies per VC</label><input id="cap" type="number" value="80" min="1" max="300">
<label style="font-weight:400"><input type="checkbox" id="scanafter" checked> Scan the jobs afterwards</label>
<p><button id="disc" type="button">Start discovery</button> <button class="sec" id="stopdisc" type="button">Stop</button></p><div id="discmsg" class="msg" role="status"></div><div id="disclog" class="hint"></div></div>
<div class="card"><h2>VC websites and results</h2><p class="hint">Fix any website that fails. Links found automatically are saved as <b>unverified</b> (with the page they came from as evidence). After spot-checking a VC, press Mark verified.</p><div id="vctable"></div></div>
<div class="card"><h2>Quick add (easiest)</h2>
<label for="vc">Which VC are these companies from?</label><select id="vc"><option value="">(no VC link)</option></select><p class="hint">The list loads after you enter the token above and leave that box.</p>
<label for="ev">A page on that VC's website that lists these companies (optional)</label><input id="ev" placeholder="https://example-vc.com/portfolio"><p class="hint">Filled in = saved as <b>verified</b>. Empty = saved as <b>unverified</b>.</p>
<h3>A. Find job boards on a page</h3><input id="pg" placeholder="https://example-vc.com/portfolio"><p><button id="find" type="button">Find job boards</button></p><div id="found"></div>
<h3>B. Paste careers links, one per line</h3><textarea id="lines" placeholder="https://boards.greenhouse.io/acme&#10;https://jobs.lever.co/beta&#10;https://jobs.ashbyhq.com/gamma"></textarea><p><button id="addlines" type="button">Add these companies</button></p><div id="addres" class="msg"></div></div>
<div class="card"><h2>Import portfolio companies</h2><p class="hint">JSON list. Add "evidence_url" to an investor only if you saw the company on that VC's page; otherwise it is stored as unverified.</p>
<textarea id="items" spellcheck="false">[
  {"name":"Example Co","website":"https://example.com","ats":{"adapter":"greenhouse","identifier":"REPLACE"},"investors":[{"vc":"Aleph","evidence_url":"https://..."}]}
]</textarea><p><button id="imp" type="button">Import</button> <button class="sec" id="scan" type="button">Scan 10 companies now</button> <button class="sec" id="stat" type="button">Status</button> <button class="sec" id="ana" type="button">Analytics</button></p></div>
<div id="report"></div>
<div class="card"><pre id="out" style="white-space:pre-wrap;margin:0"></pre></div></main>`, COMMON + `
async function call(p,m,b){var r=await fetch(p,{method:m,headers:{'authorization':'Bearer '+$('tk').value,'content-type':'application/json'},body:b});var t=await r.text();$('out').textContent=r.status+' '+t}

async function adm(p,b){var r=await fetch(p,{method:b===undefined?'GET':'POST',headers:{'authorization':'Bearer '+$('tk').value,'content-type':'application/json'},body:b===undefined?undefined:JSON.stringify(b)});var d={};try{d=await r.json()}catch(e){}return {ok:r.ok,status:r.status,data:d}}
$('tk').onchange=async function(){loadVcTable();var r=await adm('/api/admin/status');if(!r.ok)return;var v=$('vc');v.replaceChildren();var o=el('option',null,'(no VC link)');o.value='';v.append(o);(r.data.vcs||[]).forEach(function(n){var x=el('option',null,n);x.value=n;v.append(x)})};

var STOP=false;
function dmsg(t,cls){var m=$('discmsg');m.className='msg'+(cls?' '+cls:'');m.textContent=t}
async function loadVcTable(){var r=await adm('/api/admin/discover/status');if(!r.ok)return;var T=$('vctable');T.replaceChildren();
 var sc=$('scope');while(sc.options.length>2)sc.remove(2);r.data.vcs.forEach(function(v){var o=el('option',null,'Only '+v.vc);o.value=v.vc;sc.append(o)});
 var tb=table(['VC','Website','Sites found','With job board','No board','Unverified links',''],r.data.vcs.map(function(v){return [v.vc,'',v.sites_found,v.sites_done,v.sites_no_board,v.links_unverified,'']}));
 r.data.vcs.forEach(function(v,i){var row=tb.rows[i+1];var inp=document.createElement('input');inp.value=v.website||'';inp.placeholder='https://...';inp.style.minWidth='160px';var sv=el('button','sec','Save');sv.type='button';sv.onclick=async function(){var a=await adm('/api/admin/vc-website',{vc:v.vc,website:inp.value});sv.textContent=a.ok?'Saved':'Error'};row.cells[1].append(inp,sv);
  if(v.links_unverified){var vb=el('button','sec','Mark verified');vb.type='button';vb.onclick=async function(){var a=await adm('/api/admin/verify-vc',{vc:v.vc});vb.textContent=a.ok?(a.data.verified+' verified'):'Error'};row.cells[6].append(vb)}});
 T.append(tb)}
function logLine(l){var d=el('div',null,'['+l.status+'] '+l.vc+': '+l.note);$('disclog').prepend(d);while($('disclog').children.length>40)$('disclog').lastChild.remove()}
$('stopdisc').onclick=function(){STOP=true;dmsg('Stopping after the current step...')};
$('disc').onclick=async function(){STOP=false;$('disclog').replaceChildren();this.disabled=true;dmsg('Queuing VCs...');
 var sv=$('scope').value;var st=await adm('/api/admin/discover/start',{scope:(sv==='israeli'||sv==='all')?sv:[sv],max_per_vc:Number($('cap').value)});
 if(!st.ok){dmsg(st.data.error||'Could not start ('+st.status+')','err');this.disabled=false;return}
 if(st.data.skipped.length)logLine({status:'skipped',vc:'No website set',note:st.data.skipped.map(function(x){return x.vc}).join(', ')});
 var done=0,rem=1;while(!STOP&&rem>0){var s=await adm('/api/admin/discover/step',{});if(!s.ok){dmsg('Step failed ('+s.status+'): '+(s.data.error||''),'err');break}done+=s.data.processed;rem=s.data.remaining;s.data.log.forEach(logLine);dmsg('Discovery: '+done+' sites processed, '+rem+' left...')}
 if(rem===0)dmsg('Discovery finished: '+done+' sites processed.','ok');
 if(!STOP&&rem===0&&$('scanafter').checked){var stt=await adm('/api/admin/status');var n=Math.ceil(((stt.data&&stt.data.companies)||0)/10)+1;for(var i=0;i<n&&!STOP;i++){dmsg('Scanning jobs, round '+(i+1)+' of '+n+'...');var a=await adm('/api/admin/scan',{});if(!a.ok)break}dmsg(STOP?'Stopped.':'All done. Press Analytics to see what you collect now.','ok')}
 this.disabled=false;loadVcTable()};
function addMsg(t,cls){var m=$('addres');m.className='msg'+(cls?' '+cls:'');m.textContent=t}
function summary(d){return d.submitted+' submitted: '+d.companies_created+' new companies, '+d.companies_existing+' already there, '+d.links_created+' VC links added'+(d.errors&&d.errors.length?'. Problems: '+d.errors.join('; '):'.')}
$('addlines').onclick=async function(){addMsg('Adding...');var r=await adm('/api/admin/quick-add',{vc:$('vc').value,evidence_url:$('ev').value,lines:$('lines').value});addMsg(r.ok?summary(r.data):(r.data.error||'Failed ('+r.status+')'),r.ok?'ok':'err')};
$('find').onclick=async function(){var F=$('found');F.replaceChildren();F.append(el('p','hint','Reading the page...'));var r=await adm('/api/admin/harvest',{url:$('pg').value});F.replaceChildren();
 if(!r.ok){F.append(el('p','msg err',r.data.error||'Failed ('+r.status+')'));return}
 var d=r.data;if(d.note)F.append(el('p','msg err',d.note));
 if(d.unsupported.length)F.append(el('p','hint','Found but not supported yet: '+d.unsupported.map(function(u){return u.adapter+':'+u.identifier}).join(', ')));
 if(!d.boards.length)return;
 if(!$('ev').value)$('ev').placeholder=d.page;
 var rows=[];d.boards.forEach(function(b){var w=el('div','why');var c=document.createElement('input');c.type='checkbox';c.checked=true;c.style.width='auto';var n=document.createElement('input');n.value=b.name;n.maxLength=80;n.style.margin='0 8px';var t=el('span','hint',b.adapter+': '+b.identifier);w.append(c,n,t);F.append(w);rows.push({c:c,n:n,b:b})});
 var btn=el('button',null,'Add selected');btn.type='button';btn.onclick=async function(){var sel=rows.filter(function(x){return x.c.checked}).map(function(x){return {name:x.n.value,adapter:x.b.adapter,identifier:x.b.identifier}});addMsg('Adding...');var a=await adm('/api/admin/quick-add',{vc:$('vc').value,evidence_url:$('ev').value,boards:sel});addMsg(a.ok?summary(a.data):(a.data.error||'Failed'),a.ok?'ok':'err')};F.append(el('p'));F.lastChild.append(btn)};
$('imp').onclick=function(){var v;try{v=JSON.parse($('items').value)}catch(e){$('out').textContent='That is not valid JSON';return}call('/api/admin/import','POST',JSON.stringify({items:v}))};
$('scan').onclick=function(){call('/api/admin/scan','POST','{}')};$('stat').onclick=function(){call('/api/admin/status','GET')};
function table(h,rows){var t=el('table');t.style.cssText='width:100%;border-collapse:collapse;font-size:13px';var tr=el('tr');h.forEach(function(x){var c=el('th',null,x);c.style.cssText='text-align:left;border-bottom:1px solid var(--line);padding:4px';tr.append(c)});t.append(tr);
 rows.forEach(function(r){var q=el('tr');r.forEach(function(x){var c=el('td',null,x==null?'-':String(x));c.style.cssText='padding:4px;border-bottom:1px solid var(--line)';q.append(c)});t.append(q)});return t}
function section(title,node,note){var c=el('div','card');c.append(el('h2',null,title));if(note)c.append(el('p','hint',note));c.append(node);$('report').append(c)}
$('ana').onclick=async function(){$('report').replaceChildren();var r=await fetch('/api/admin/analytics?days=30',{headers:{'authorization':'Bearer '+$('tk').value}});if(!r.ok){$('out').textContent=r.status+' '+(await r.text());return}$('out').textContent='';var d=await r.json(),c=d.coverage.summary,u=d.usage;
 section('Where the jobs come from',table(['VC firm','Type','Companies','Verified links','Unverified links','Open jobs','Scan problems','Not scanned'],d.coverage.by_vc.map(function(x){return [x.vc,x.type,x.companies,x.verified_links,x.unverified_links,x.open_jobs,x.scan_problems,x.not_scanned]})),
  'Collecting from '+c.companies+' companies across '+c.vc_firms_with_companies+' of '+c.vc_firms_total+' VC firms; '+c.open_jobs+' open jobs at '+c.companies_with_open_jobs+' companies. '+c.companies_without_vc_link+' companies have no VC link. Jobs at a company backed by several firms count under each.');
 var f=u.funnel;section('Usage, last '+u.days+' days',table(['Metric','Total'],Object.entries(u.totals)),'Visit to upload: '+(f.visit_to_upload_pct==null?'-':f.visit_to_upload_pct+'%')+' | Upload to email request: '+(f.upload_to_email_request_pct==null?'-':f.upload_to_email_request_pct+'%')+' | Email confirmed: '+(f.email_confirm_pct==null?'-':f.email_confirm_pct+'%')+' | Apply clicks per matches view: '+(f.clicks_per_matches_view==null?'-':f.clicks_per_matches_view));
 section('By day',table(['Day','Visits','CVs','Matches viewed','Apply clicks','Email requests','Confirmed','Digests'],u.series.map(function(x){return [x.day,x.visit,x.cv_uploaded,x.matches_viewed,x.apply_click,x.email_requested,x.email_confirmed,x.digest_sent]})));
 var sup=u.visitor_skills,dem=d.job_skills_in_demand;section('Skills: what visitors have vs what jobs ask for',table(['Visitors have','CVs','Jobs ask for','Jobs'],Array.from({length:15},function(_,i){return [sup&&sup[i]?sup[i].name:'',sup&&sup[i]?sup[i].count:'',dem[i]?dem[i].name:'',dem[i]?dem[i].count:'']})),u.breakdown_note||'Counts are anonymous totals across all visitors.');
 if(u.clicks_by_company.length)section('Apply clicks by company',table(['Company','Clicks'],u.clicks_by_company.map(function(x){return [x.name,x.count]})));
 section('Email',table(['Pending confirmation','Active weekly'],[[d.email.pending_confirmation,d.email.weekly_active]]),'Addresses are never shown here.')};`);
}

// src/handlers.mjs
var safeUrl2 = (u) => /^https?:\/\//i.test(u ?? "") ? u : null;
var sameSecret = (a, b) => {
  const x = Buffer.from(sha256(a)), y = Buffer.from(sha256(b));
  return timingSafeEqual2(x, y);
};
function makeHandlers(deps = {}) {
  const db = () => deps.db ?? createDb();
  const cookieToken = (req) => parseCookies(req.headers.cookie)[SESSION_COOKIE];
  const guard = (req, res, method) => {
    if (req.method !== method) {
      send(res, 405, { error: `${method} only` });
      return false;
    }
    if (method !== "GET" && !checkCsrf(req)) {
      send(res, 403, { error: "Missing X-Requested-With header" });
      return false;
    }
    return true;
  };
  const fail = (res, e) => e instanceof CvError || e instanceof HarvestError || e?.status ? send(res, e.status ?? 400, { error: e.message }) : send(res, 500, { error: "Something went wrong. Please try again." });
  const adminOk = async (req, res, d) => {
    const t = process.env.ADMIN_TOKEN;
    if (!t || t.length < 20) {
      send(res, 503, { error: "Set ADMIN_TOKEN (20+ characters)" });
      return false;
    }
    const rl = await rateLimit(d, `admin:${sha256(clientIp(req))}`, 30, 600);
    if (!rl.ok) {
      send(res, 429, { error: "Too many attempts" });
      return false;
    }
    const h = req.headers.authorization ?? "";
    if (!h.startsWith("Bearer ") || !sameSecret(h.slice(7), t)) {
      send(res, 401, { error: "Unauthorized" });
      return false;
    }
    return true;
  };
  const cronOk = (req, res) => {
    const s = process.env.CRON_SECRET;
    if (!s || s.length < 16) {
      send(res, 503, { error: "Set CRON_SECRET (16+ characters)" });
      return false;
    }
    const h = req.headers.authorization ?? "";
    if (!h.startsWith("Bearer ") || !sameSecret(h.slice(7), s)) {
      send(res, 401, { error: "Unauthorized" });
      return false;
    }
    return true;
  };
  return {
    // ---------- pages ----------
    "/": async (req, res) => {
      if (req.method !== "GET") return send(res, 405, { error: "GET only" });
      await track(db(), ["visit"]);
      page(res, renderApp({ emailEnabled: emailEnabled() }));
    },
    "/admin": async (req, res) => {
      if (req.method !== "GET") return send(res, 405, { error: "GET only" });
      page(res, renderAdmin());
    },
    "/confirm": async (req, res) => {
      if (req.method !== "GET") return send(res, 405, { error: "GET only" });
      page(res, renderTokenPage("confirm"));
    },
    "/unsubscribe": async (req, res) => {
      if (req.method === "GET") return page(res, renderTokenPage("unsubscribe"));
      if (req.method !== "POST") return send(res, 405, { error: "GET or POST only" });
      try {
        const t = new URL(req.url, "http://x").searchParams.get("t");
        const d = db();
        const r = await unsubscribe(d, t);
        if (r.state === "unsubscribed") await track(d, ["email_unsubscribed"]);
        return send(res, r.state === "unsubscribed" ? 200 : 400, r);
      } catch (e) {
        return fail(res, e);
      }
    },
    "/api/ping": async (req, res) => {
      res.statusCode = 200;
      res.setHeader("content-type", "text/plain");
      res.end("ok");
    },
    // ---------- CV ----------
    "/api/cv": async (req, res) => {
      if (!guard(req, res, "POST")) return;
      try {
        const d = db();
        const rl = await rateLimit(d, `cv:${sha256(clientIp(req))}`, 20, 3600);
        if (!rl.ok) return send(res, 429, { error: "Too many uploads from your network. Try again in a while." });
        const buf = await readRaw(req, MAX_BYTES + 1);
        const text = await extractCvText(buf);
        const profile = sanitizeProfile(buildProfile(text));
        const token = await saveProfile(d, cookieToken(req), profile);
        setSessionCookie(res, token);
        await track(d, ["cv_uploaded", ...profile.skills.map((x) => "skill:" + x), "level:" + profile.level, ...profile.functions.map((f) => "fn:" + f)]);
        send(res, 200, { ok: true, profile });
      } catch (e) {
        if (e instanceof CvError) await track(db(), ["cv_rejected"]);
        fail(res, e);
      }
    },
    "/api/me": async (req, res) => {
      if (!guard(req, res, "GET")) return;
      try {
        const s = await getSession(db(), cookieToken(req));
        send(res, 200, { hasProfile: !!s, profile: s?.profile ?? null, expires_at: s?.expires_at ?? null, emailEnabled: emailEnabled(), functions: FUNCTION_NAMES, levels: LEVELS });
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/profile": async (req, res) => {
      if (!guard(req, res, "POST")) return;
      try {
        const d = db();
        const s = await getSession(d, cookieToken(req));
        if (!s) return send(res, 401, { error: "Upload your CV first." });
        const profile = sanitizeProfile(await readJson(req));
        await saveProfile(d, cookieToken(req), profile);
        await track(d, ["profile_edited"]);
        send(res, 200, { ok: true, profile });
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/matches": async (req, res) => {
      if (!guard(req, res, "GET")) return;
      try {
        const d = db();
        const s = await getSession(d, cookieToken(req));
        if (!s) return send(res, 401, { error: "Upload your CV first." });
        const u = new URL(req.url, "http://x").searchParams;
        const str = (k) => (u.get(k) ?? "").slice(0, 80);
        const q2 = str("q").toLowerCase(), vc = str("vc"), company = str("company"), wp = str("workplace");
        const min = Math.min(100, Math.max(0, Number(u.get("min")) || 0)), limit = Math.min(200, Math.max(1, Number(u.get("limit")) || 50));
        const newDays = Math.min(30, Math.max(0, Math.round(Number(u.get("new")) || 0)));
        const catalog = await d.catalog();
        const count = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
        const vcN = /* @__PURE__ */ new Map(), coN = /* @__PURE__ */ new Map();
        for (const j of catalog) {
          count(coN, j.company);
          for (const v of j.vcs) count(vcN, v.name);
        }
        const facets = { vcs: [...vcN].map(([name, n]) => ({ name, n })).sort((a, b) => a.name.localeCompare(b.name)), companies: [...coN].map(([name, n]) => ({ name, n })).sort((a, b) => a.name.localeCompare(b.name)) };
        const cutoff = newDays ? Date.now() - newDays * 864e5 : 0;
        const pool = catalog.filter((j) => (!vc || j.vcs.some((v) => v.name === vc)) && (!company || j.company === company) && (!["remote", "hybrid", "onsite"].includes(wp) || j.workplace === wp) && (!cutoff || new Date(j.first_discovered_at).getTime() >= cutoff));
        const scored = pool.map((j) => ({ j, m: scoreJob(j, s.profile) })).sort((a, b) => b.m.score - a.m.score);
        const bands = { strong: 0, good: 0, stretch: 0, weak: 0 };
        for (const { m } of scored) bands[m.band]++;
        const jobs = scored.filter(({ j, m }) => m.score >= min && (!q2 || `${j.title} ${j.company} ${j.location_raw ?? ""}`.toLowerCase().includes(q2))).slice(0, limit).map(({ j, m }) => ({ id: j.id, title: j.title, company: j.company, vcs: j.vcs, location: j.location_raw, workplace: j.workplace, apply_url: safeUrl2(j.apply_url), excerpt: j.excerpt, first_seen: j.first_discovered_at, ...m }));
        await track(d, ["matches_viewed", vc && "filter_vc", company && "filter_company", ["remote", "hybrid", "onsite"].includes(wp) && "filter_workplace", newDays && "filter_new", min && "filter_min"].filter(Boolean));
        send(res, 200, { total: catalog.length, matching: pool.length, bands, facets, jobs });
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/gaps": async (req, res) => {
      if (!guard(req, res, "GET")) return;
      try {
        const d = db();
        const s = await getSession(d, cookieToken(req));
        if (!s) return send(res, 401, { error: "Upload your CV first." });
        const g = skillGaps(s.profile, await d.catalog());
        await track(d, ["gaps_viewed"]);
        send(res, 200, g);
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/delete": async (req, res) => {
      if (!guard(req, res, "POST")) return;
      try {
        const d = db();
        await deleteSession(d, cookieToken(req));
        clearSessionCookie(res);
        await track(d, ["data_deleted"]);
        send(res, 200, { ok: true });
      } catch (e) {
        fail(res, e);
      }
    },
    // ---------- email ----------
    "/api/email/subscribe": async (req, res) => {
      if (!guard(req, res, "POST")) return;
      if (!emailEnabled()) return send(res, 503, { error: "Email is not enabled on this site." });
      try {
        const d = db();
        const s = await getSession(d, cookieToken(req));
        if (!s) return send(res, 401, { error: "Upload your CV first." });
        const b = await readJson(req);
        if (b.consent !== true) return send(res, 400, { error: "Please tick the box to agree to receive the email." });
        const r = await subscribe(d, { email: b.email, frequency: b.frequency, min_score: b.min_score, profile: s.profile, ip: clientIp(req) }, deps.emailDeps);
        if (r.ok) await track(d, ["email_requested"]);
        send(res, r.ok ? 200 : r.status, r.ok ? { ok: true, message: r.message } : { error: r.error });
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/email/confirm": async (req, res) => {
      if (!guard(req, res, "POST")) return;
      try {
        const b = await readJson(req);
        const d = db();
        const r = await confirm(d, b.t, deps.emailDeps);
        if (r.state === "subscribed" || r.state === "sent_once") await track(d, ["email_confirmed", r.state === "sent_once" && "email_once_sent"].filter(Boolean));
        send(res, r.state === "invalid" || r.state === "expired" ? 400 : 200, r);
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/email/unsubscribe": async (req, res) => {
      if (!guard(req, res, "POST")) return;
      try {
        const b = await readJson(req);
        const d = db();
        const r = await unsubscribe(d, b.t);
        if (r.state === "unsubscribed") await track(d, ["email_unsubscribed"]);
        send(res, r.state === "invalid" ? 400 : 200, r);
      } catch (e) {
        fail(res, e);
      }
    },
    // ---------- admin (catalog) ----------
    "/api/admin/import": async (req, res) => {
      if (req.method !== "POST") return send(res, 405, { error: "POST only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        const b = await readJson(req, 5e5);
        send(res, 200, await importCompanies(d, b.items));
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/admin/harvest": async (req, res) => {
      if (req.method !== "POST") return send(res, 405, { error: "POST only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        const b = await readJson(req);
        send(res, 200, await harvestBoards(String(b.url ?? ""), { fetchImpl: deps.harvestFetch ?? fetch }));
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/admin/quick-add": async (req, res) => {
      if (req.method !== "POST") return send(res, 405, { error: "POST only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        const b = await readJson(req, 2e5);
        const lines = typeof b.lines === "string" ? b.lines.split(/\s+/).filter((x) => /^https?:\/\//i.test(x)).map((url) => ({ url })) : [];
        const entries = [...Array.isArray(b.boards) ? b.boards : [], ...lines];
        const items = toImportItems(entries, { vc: b.vc ? String(b.vc) : void 0, evidence_url: /^https?:\/\//i.test(b.evidence_url ?? "") ? b.evidence_url : void 0 });
        if (!items.length) return send(res, 400, { error: "Nothing to add. Paste careers links (one per line) or choose boards from the list." });
        send(res, 200, { ...await importCompanies(d, items), submitted: items.length });
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/admin/discover/start": async (req, res) => {
      if (req.method !== "POST") return send(res, 405, { error: "POST only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        const b = await readJson(req);
        const scope = Array.isArray(b.scope) ? b.scope.map((x) => String(x).slice(0, 80)).slice(0, 40) : b.scope === "all" ? "all" : "israeli";
        send(res, 200, await startDiscovery(d, { scope, max_per_vc: b.max_per_vc }));
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/admin/discover/step": async (req, res) => {
      if (req.method !== "POST") return send(res, 405, { error: "POST only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        send(res, 200, await discoverStep(d, { fetchImpl: deps.discoverFetch ?? fetch, budgetMs: deps.stepBudgetMs ?? 4e4 }));
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/admin/discover/status": async (req, res) => {
      if (req.method !== "GET") return send(res, 405, { error: "GET only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        send(res, 200, await discoveryStatus(d));
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/admin/verify-vc": async (req, res) => {
      if (req.method !== "POST") return send(res, 405, { error: "POST only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        const b = await readJson(req);
        const r = await verifyVc(d, String(b.vc ?? "").slice(0, 80));
        send(res, r.ok ? 200 : 400, r);
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/admin/vc-website": async (req, res) => {
      if (req.method !== "POST") return send(res, 405, { error: "POST only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        const b = await readJson(req);
        let w = String(b.website ?? "").trim();
        if (w && !/^https?:\/\//i.test(w)) w = "https://" + w;
        try {
          if (w) new URL(w);
        } catch {
          return send(res, 400, { error: "That is not a valid web address." });
        }
        const rows = await d.rest(`vc_firms?name=eq.${encodeURIComponent(String(b.vc ?? "").slice(0, 80))}`, { method: "PATCH", body: { website: w || null } });
        send(res, rows.length ? 200 : 400, rows.length ? { ok: true } : { error: "unknown VC" });
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/admin/scan": async (req, res) => {
      if (req.method !== "POST") return send(res, 405, { error: "POST only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        const b = await readJson(req);
        const only = typeof b.company === "string" && /^[a-z0-9-]{1,80}$/.test(b.company) ? b.company : void 0;
        send(res, 200, await runScanJob({ db: d, only, limit: only ? 1 : 10, delayMs: 300, ...deps.scanDeps }));
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/admin/status": async (req, res) => {
      if (req.method !== "GET") return send(res, 405, { error: "GET only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        const cos = await d.all("portfolio_companies?select=id,name,hiring_status,open_jobs_count,last_checked_at");
        const by = {};
        for (const c of cos) by[c.hiring_status] = (by[c.hiring_status] ?? 0) + 1;
        const vcs = (await d.all("vc_firms?select=name")).map((v) => v.name).sort();
        send(res, 200, { companies: cos.length, unscanned: by.not_yet_scanned ?? 0, by_status: by, open_jobs: cos.reduce((n, c) => n + (c.open_jobs_count ?? 0), 0), email_enabled: emailEnabled(), vcs });
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/admin/analytics": async (req, res) => {
      if (req.method !== "GET") return send(res, 405, { error: "GET only" });
      try {
        const d = db();
        if (!await adminOk(req, res, d)) return;
        send(res, 200, await analytics(d, Number(new URL(req.url, "http://x").searchParams.get("days")) || 30));
      } catch (e) {
        fail(res, e);
      }
    },
    // ---------- outbound apply links (counted, never identified) ----------
    "/go": async (req, res) => {
      if (req.method !== "GET") return send(res, 405, { error: "GET only" });
      try {
        const id5 = new URL(req.url, "http://x").searchParams.get("j") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(id5)) return send(res, 404, { error: "Not found" });
        const d = db();
        const [job] = await d.rest(`jobs?id=eq.${id5}&select=apply_url,company_id,status`);
        if (!job || !safeUrl2(job.apply_url)) return send(res, 404, { error: "Not found" });
        const [co] = await d.rest(`portfolio_companies?id=eq.${encodeURIComponent(job.company_id)}&select=name`);
        await track(d, ["apply_click", co && "co_click:" + co.name].filter(Boolean));
        res.statusCode = 302;
        res.setHeader("location", job.apply_url);
        res.setHeader("referrer-policy", "no-referrer");
        res.setHeader("cache-control", "private, no-store");
        res.setHeader("x-robots-tag", "noindex");
        res.end("");
      } catch (e) {
        fail(res, e);
      }
    },
    // ---------- cron ----------
    "/api/cron/scan": async (req, res) => {
      if (!cronOk(req, res)) return;
      try {
        const d = db();
        await purge(d);
        const limit = Math.min(Number(new URL(req.url, "http://x").searchParams.get("limit") ?? 20) || 20, 50);
        const disc = await discoverStep(d, { fetchImpl: deps.discoverFetch ?? fetch, budgetMs: deps.cronDiscoverMs ?? 2e4 }).catch(() => ({ processed: 0, remaining: 0 }));
        send(res, 200, { discovery: { processed: disc.processed, remaining: disc.remaining }, ...await runScanJob({ db: d, limit, delayMs: 300, ...deps.scanDeps }) });
      } catch (e) {
        fail(res, e);
      }
    },
    "/api/cron/digest": async (req, res) => {
      if (!cronOk(req, res)) return;
      try {
        const d = db();
        const r = await runDigests(d, { limit: 40 }, deps.emailDeps);
        await track(d, Array(r.sent).fill("digest_sent"));
        send(res, 200, r);
      } catch (e) {
        fail(res, e);
      }
    }
  };
}

// src/router.mjs
function makeRouter(deps = {}) {
  const routes = makeHandlers(deps);
  return async function router(req, res) {
    const path = new URL(req.url, "http://x").pathname.replace(/\/+$/, "") || "/";
    const handler = Object.hasOwn(routes, path) ? routes[path] : null;
    if (!handler) {
      res.statusCode = 404;
      res.setHeader("content-type", "application/json");
      return res.end('{"error":"Not found"}');
    }
    try {
      return await handler(req, res);
    } catch {
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end('{"error":"Server error"}');
      }
    }
  };
}
var router_default = makeRouter();

// api/index.js
var index_default = router_default;
var config = { maxDuration: 60 };
export {
  config,
  index_default as default
};
