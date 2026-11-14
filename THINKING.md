# Thinking Doc — Account Quest CRM Dashboard

## The brief, restated

Build a CRM dashboard that answers five fixed questions about each account using data from an MCP server. Every answer must be traceable to a source. The only write is adding a note.

---

## Decisions and why

### 1. Never show one money total

**Rule**: money is split into Backed / Claimed / Unknown.

**Why**: Two accounts bill in different currencies (GBP vs EUR) — summing them produces a meaningless number. Even within one currency, `claimed` revenue (stated but not committed) is fundamentally different from `backed` revenue (committed/agreed stage). Mixing them into one headline misleads the reader on what is actually certain.

**Implementation**: `convex/lib/rules/book.ts` runs three passes over all offers. `money(amount, currency)` always prepends the ISO currency code — there is no bare `$` anywhere in the UI.

---

### 2. Traceability: every fact has a source id

**Rule**: every number, name, and date must cite an id. Clicking the id opens a drawer showing the exact MCP call that produced it.

**Why**: The five questions are only useful if the reader can verify the answers. Otherwise it is just another dashboard with made-up numbers.

**Implementation**:
- `convex/lib/dto.ts` defines a `Source` with `{ id, kind, claim, tool, args, ingested, payload }`.
- `buildData()` in `app/lib/build.ts` assembles 78 citable sources from the portfolio, including synthetic aggregate sources (`book_A`, `power_A`, `risk_A`) that cite the specific fact ids they aggregate.
- `queries.sourceDetail(id)` resolves any source id to its raw MCP payload by looking up the fact in `facts`, `deals`, `people`, `signals` tables.
- Three confidence buckets: `verified` (we have a document/ticket), `told` (someone said it), `claim` (inferred).

---

### 3. MCP rate limit: one call per minute, never on page load

**Rule**: the browser never calls the MCP. The MCP token stays server-side.

**Why**: The MCP server enforces one call per minute. Making calls on every page load would hit the limit immediately with multiple users. The token appearing in browser code or the repo would be a security issue.

**Implementation**:
- `convex/crons.ts` schedules a background action every 60 seconds.
- `convex/mcp.ts` holds all MCP calls; each is enqueued at priority and fires one at a time.
- Convex environment variables hold the token — it is never in `process.env` on the client.
- Writes (notes) go through `notes.addNote` mutation → enqueue `write_note` action → fires in the next available minute slot → `ingest.recordResult` flips status to `sent`.

---

### 4. Data ingest: `get_all_paperwork` is the key call

**Discovery**: cold ingest requires ~13 MCP calls. `get_all_paperwork(account_id)` returns every fact, person, deal, offer, and ticket for one account in a single call — far more efficient than individual lookups.

**Replay strategy**: to avoid burning live MCP quota during development, all 13 calls were captured to `/tmp/opencode/qa/` and replayed via `scripts/seed.mjs` into Convex (dev + prod). The prod deployment (`agreeable-canary-351`) is seeded and live.

---

### 5. Q2 — Power map: four named roles per deal

**Rule**: decider / payer / user / blocker, each with warmth and "waiting-on".

**Why**: knowing *who* without knowing *what they can do* and *how warm they are* is not actionable.

**Key narrative**:
- Rhys Calder is single-threaded — the champion, decider, and primary contact are the same person. If he leaves (signal: `champion_leaves`, 17 Nov), the deal has no one left.
- Fatima Al-Rashid's DPIA block has sat for 4 months (ticket `pj_ticket`) — the payer's compliance officer is the blocker.
- Stefan Brandt says "13 of 15 plants flying" but `sr_roll_2` shows only 9 — the user's self-reported data contradicts the verified rollout record.

---

### 6. Q3 — Exactly 3 moves, each with owner + deadline

**Rule**: not a backlog, not a list of suggestions — exactly three prioritised actions, each owned by a named FlytBase person with a due date inside the submission deadline.

**Why**: a move without an owner is a wish. A move without a date is ignored.

**Owners** (from MCP `whoami` + `list_colleagues`): Pranjal Suyal, Neel Sharma, Achal Negi, Yashash Rao.

---

### 7. Q4 — Four detectors with dates, not colours

**Rule**: each detector has a date it turns bad, not a RAG status.

**Why**: "red" today is meaningless by next week. A date forces the reader to act before the threshold, not after.

**Four detectors per account**:
- `deadline` — the stage gate date
- `warmth` — last contact recency
- `stall` — no activity in N days
- `signal` — external event (champion leaving, urgent ticket)

---

### 8. UI architecture: stable DTO between backend and frontend

**Rule**: the frontend never reads raw MCP payloads — it reads from a stable DTO.

**Why**: MCP payload shapes change. If the frontend is coupled to them, any MCP schema change breaks the UI. The DTO (`convex/lib/dto.ts`) absorbs MCP churn — only the ingest layer needs to change.

**Adapter**: `app/lib/build.ts` converts a `Portfolio` (the DTO) into typed UI-ready arrays (`Deal[]`, `Move[]`, `Risk[]`, `Gap[]`, `Person[]`, `Signal[]`, `Source[]`). Components never touch the raw portfolio.

---

### 9. Currency isolation: `money(amount, currency)` everywhere

**Problem discovered**: Account A is GBP, Account B is EUR. Early prototypes showed a bare `£` in one place and `€` in another — easy to confuse.

**Fix**: a single `money(n, currency)` helper that always returns `"GBP 200,000"` / `"EUR 140,000"` style strings. No bare `$`, `£`, or `€` anywhere in the UI code.

---

### 10. Source ids for synthetic aggregates

**Problem**: Q1 book value, Q2 power headline, Q4 risk headline are computed from multiple facts — there is no single MCP record to cite.

**Fix**: `buildData()` creates synthetic source records prefixed `book_A`, `power_A`, `risk_A` etc. These cite the specific fact ids they aggregate, so the drawer still shows meaningful provenance (the sub-facts that contributed to the computed value).

---

## What I would do with more time

1. **Live MCP polling UI** — show the ingest queue draining in real time, not just the cron status.
2. **Multi-user note threading** — notes currently append; a reply thread per deal would be more useful.
3. **Drift detection** — alert when a fact in the store contradicts a newer MCP response (e.g. Stefan's plant count changed).
4. **Q5 auto-resolution** — when a gap is closed (a new fact arrives that answers it), automatically mark it resolved and notify the owner.
5. **Mobile source drawer** — the drawer is sized for desktop; a bottom sheet on mobile would be better.

---

## Risk log

| Risk | Mitigation |
|------|-----------|
| MCP rate limit hit during demo | All data pre-seeded; demo runs entirely from Convex store |
| Token leaked in repo | `.env.local` in `.gitignore`; token only in Convex env vars |
| Convex cold start delay | `useQuery(portfolio)` shows a skeleton while loading |
| Two currencies summed by mistake | `money()` helper enforces ISO prefix; no cross-currency totals in rules |
| Rhys leaves before renewal signs | Signal `champion_leaves` 17 Nov is surfaced on the Monday screen |
