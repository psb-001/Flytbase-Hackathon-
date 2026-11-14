# Account Quest — FlytBase CRM Dashboard

Live five-question CRM dashboard for the **Questionathon / Account Quest** hackathon.

---

## What it does

Answers **five fixed questions** per account, with every number, name, and date traceable to its source MCP call:

| # | Question | Answer contract |
|---|----------|----------------|
| Q1 | What is this account worth? | **Backed / Claimed / Unknown** buckets — never one sum |
| Q2 | Who holds the power? | Decider / Payer / User / Blocker per deal + warmth + waiting-on |
| Q3 | What should we do first? | Exactly 3 ranked moves, each with owner id + deadline |
| Q4 | What is about to go wrong? | 4 risk detectors, each with a date it turns bad |
| Q5 | What is still unknown? | Gaps, flagged by confidence bucket |

Clicking any cited number or name opens a **source drawer** showing:
- the exact MCP tool that returned the record
- the raw payload (expandable)
- the ingestion timestamp

The only write action is **adding a note** — it goes into a queue and fires through the one-call-per-minute MCP rate limit server-side. The browser never touches the MCP token.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 App Router + TypeScript |
| State / realtime | Convex (`agreeable-canary-351`, ap-southeast-2) |
| Data ingest | MCP server via Convex cron + action queue |
| Hosting | Vercel (prod) |

---

## Data flow

```
MCP server
    │  one call / minute, server-side only
    ▼
Convex actions (convex/mcp.ts)
    │  raw captures stored → parsed → DTO
    ▼
Convex tables: accounts, deals, people, facts, offers, signals, notes
    │
    ▼
convex/lib/answer.ts  (Q1–Q5 engines, rule files in lib/rules/)
    │
    ▼
queries.portfolio  →  buildData()  →  hydrate()  →  React components
                                               ▲
                               subscribe() lets the UI re-render
                               when the store updates (live)
```

The frontend calls `useQuery(api.queries.portfolio)` once on mount. Everything else is reactive — Convex pushes updates automatically.

---

## Money display

Two accounts bill in different currencies (Account A = GBP, Account B = EUR). Totals are **never** summed across accounts. The `money(amount, currency)` helper always prefixes the ISO code.

| Bucket | Meaning |
|--------|---------|
| **Backed** | Deal in `agreed` / `cleared` stage with signed commitment |
| **Claimed** | Deal in `qualified` / `identified` with a stated value |
| **Unknown** | No number on record — counted, not summed |

---

## Running locally

```bash
# 1. Install
npm install

# 2. Set env (copy from .env.local — never commit it)
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_CONVEX_URL and CONVEX_DEPLOY_KEY

# 3. Dev
npx convex dev
npm run dev
```

The seed script replays the captured MCP snapshots into Convex (dev or prod):

```bash
# Dev
node scripts/seed.mjs

# Prod
SEED_URL=https://agreeable-canary-351.ap-southeast-2.convex.cloud \
SEED_KEY=<prod-deploy-key> \
node scripts/seed.mjs
```

---

## Security

- **MCP token** lives only in Convex environment variables — never in source code, build output, or the browser.
- `.env.local` is in `.gitignore`.
- The repo contains zero mock data — all displayed values originate from the MCP.

---

## Dataset

| Account | Currency | Deals |
|---------|----------|-------|
| A — Eastern Counties Police Alliance | GBP | `a_renewal` (claimed 350k), `a_tarn` (backed 200k) |
| B — Aldermoor Industrial Group | EUR | `b_renewal` (backed 140k), `b_idle`, `b_sister` (unknown) |

Signals: `champion_leaves` (17 Nov 2026), `urgent_request` (18 Nov 2026 · FB-11206).

---

## Submission

- **Live URL**: set at deploy time (Vercel)
- **Repo**: `psb-001/Flytbase-Hackathon-`
- **Thinking doc**: `THINKING.md` in this repo
- **Video**: 3-min walkthrough (linked below once recorded)
