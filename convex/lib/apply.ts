import type { MutationCtx } from "../_generated/server";

/**
 * The only file that knows the MCP's field names.
 *
 * Everything downstream (queries, rules, the UI) reads our own tables. When the
 * MCP payload changes shape, only this file needs to change.
 */

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const bool = (v: unknown): boolean => v === true;

/** Deal value only exists once the paperwork supports it. */
export const WORTH_STAGES = ["qualified", "cleared", "agreed"] as const;
export type Stage = (typeof WORTH_STAGES)[number] | "identified";

export const stageOf = (v: unknown): Stage => {
  const s = str(v);
  return s === "qualified" || s === "cleared" || s === "agreed"
    ? s
    : "identified";
};

const warmthOf = (v: unknown) => {
  const s = str(v);
  return s === "guarded" || s === "warm" || s === "ally" ? s : "neutral";
};

const factStatusOf = (v: unknown) => {
  const s = str(v);
  return s === "verified" || s === "told" ? s : "claim";
};

/** Insert or patch, keyed on an indexed external id. */
async function upsert<T extends "accounts" | "people" | "deals" | "facts" | "offers" | "signals" | "records">(
  ctx: MutationCtx,
  table: T,
  index: string,
  key: string,
  value: Record<string, unknown>,
  patch: Record<string, unknown> = value,
) {
  const existing = await ctx.db
    .query(table)
    .withIndex(index as never, (q) => q.eq("externalId" as never, key as never))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, patch as never);
    return existing._id;
  }
  return await ctx.db.insert(table, value as never);
}

// ---------------------------------------------------------------------------
// get_my_accounts / export
// ---------------------------------------------------------------------------

async function applyExport(ctx: MutationCtx, raw: unknown) {
  const root = isObj(raw) ? raw : {};
  const minute = num(root.minute);
  const worldClosed = bool(root.world_closed);

  for (const account of arr(root.accounts)) {
    if (!isObj(account)) continue;
    const accountId = str(account.id);
    if (!accountId) continue;

    await upsert(ctx, "accounts", "by_externalId", accountId, {
      externalId: accountId,
      name: str(account.name, accountId),
      officialStory: str(account.official_story) || undefined,
      minute: minute ?? undefined,
      worldClosed,
      updatedAt: Date.now(),
      raw: account,
    });

    for (const person of arr(account.stakeholders)) {
      if (!isObj(person)) continue;
      const id = str(person.id);
      if (!id) continue;
      await upsert(ctx, "people", "by_externalId", id, {
        externalId: id,
        accountId,
        name: str(person.name),
        role: str(person.role),
        relationship: warmthOf(person.relationship),
        available: person.available !== false,
        raw: person,
      });
    }

    for (const deal of arr(account.opportunities)) {
      if (!isObj(deal)) continue;
      const id = str(deal.id);
      if (!id) continue;
      const stage = stageOf(deal.stage);
      const worth = num(deal.worth_up_to);
      const blocker = isObj(deal.blocker)
        ? {
            text: str(deal.blocker.text),
            status: str(deal.blocker.status),
          }
        : null;
      const deadline = isObj(deal.deadline)
        ? {
            text: str(deal.deadline.text),
            minute: num(deal.deadline.minute) ?? 0,
          }
        : null;

      await upsert(ctx, "deals", "by_externalId", id, {
        externalId: id,
        accountId,
        title: str(deal.title, id),
        stage,
        // The schema says value exists only from `qualified` on. Enforce it
        // here so no UI can accidentally print a pre-qualified number.
        worthUpTo: stage === "identified" ? null : worth,
        size: str(deal.size) || undefined,
        blocker,
        evidence: arr(deal.evidence).map((e) => str(e)).filter(Boolean),
        deadline,
        raw: deal,
      });
    }

    for (const fact of arr(account.facts)) {
      if (!isObj(fact)) continue;
      const id = str(fact.id);
      if (!id) continue;
      await upsert(ctx, "facts", "by_externalId", id, {
        externalId: id,
        accountId,
        text: str(fact.text),
        saidBy: str(fact.said_by),
        status: factStatusOf(fact.status),
        verifiedBy: str(fact.verified_by) || undefined,
        learnedAtMinute: num(fact.learned_at_minute) ?? 0,
        raw: fact,
      });
    }

    for (const offer of arr(account.offers)) {
      if (!isObj(offer)) continue;
      const id = str(offer.id);
      if (!id) continue;
      const status = str(offer.status);
      await upsert(ctx, "offers", "by_externalId", id, {
        externalId: id,
        accountId,
        title: str(offer.title, id),
        value: num(offer.value) ?? 0,
        pitchTo: str(offer.pitch_to) || undefined,
        status:
          status === "won" || status === "declined" ? status : "open",
        raw: offer,
      });
    }

    // Deadlines carry no id, so replace the account's set wholesale.
    const staleDeadlines = await ctx.db
      .query("deadlines")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    for (const row of staleDeadlines) await ctx.db.delete(row._id);
    for (const dl of arr(account.deadlines)) {
      if (!isObj(dl)) continue;
      await ctx.db.insert("deadlines", {
        accountId,
        text: str(dl.text),
        minute: num(dl.minute) ?? 0,
        passed: bool(dl.passed),
      });
    }
  }

  for (const file of arr(root.files)) {
    if (!isObj(file)) continue;
    const id = str(file.id);
    if (!id) continue;
    const accountId = str(file.account) || null;
    await upsert(ctx, "records", "by_externalId", `file:${id}`, {
      externalId: `file:${id}`,
      accountId,
      path: str(file.path, id),
      kind: "file",
      data: file,
      addedAt: Date.now(),
    });
  }
}

// ---------------------------------------------------------------------------
// get_all_paperwork
// ---------------------------------------------------------------------------

async function applyPaperwork(ctx: MutationCtx, args: Obj, raw: unknown) {
  const root = isObj(raw) ? raw : {};
  const accountId = str(root.account) || str(args.account);
  for (const record of arr(root.records)) {
    if (!isObj(record)) continue;
    const path = str(record.path);
    if (!path) continue;
    const externalId = `${accountId || "-"}:${path}`;
    const hasData = isObj(record.data) || Array.isArray(record.data);
    await upsert(ctx, "records", "by_externalId", externalId, {
      externalId,
      accountId: accountId || null,
      path,
      kind: str(record.kind, "document"),
      text: typeof record.text === "string" ? record.text : undefined,
      data: hasData ? record.data : undefined,
      addedAt: Date.now(),
    });

    // The profile is the only record that states the account's currency.
    if (str(record.kind) === "profile" && accountId && isObj(record.data)) {
      const currency = str(record.data.currency);
      if (currency) {
        const existing = await ctx.db
          .query("accounts")
          .withIndex("by_externalId", (q) => q.eq("externalId", accountId))
          .first();
        if (existing) await ctx.db.patch(existing._id, { currency });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// get_file
// ---------------------------------------------------------------------------

async function applyFile(ctx: MutationCtx, args: Obj, raw: unknown) {
  const root = isObj(raw) ? raw : {};
  const fileId = str(root.id) || str(args.id);
  if (!fileId) return;
  const externalId = `file:${fileId}`;

  const existing = await ctx.db
    .query("records")
    .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
    .first();

  // The file list from get_my_accounts already knows which account owns this
  // file and its path. A get_file body must not erase that.
  const accountId = str(root.account) || existing?.accountId || null;
  const path = str(root.path) || existing?.path || str(root.name) || fileId;

  const text =
    typeof root.text === "string"
      ? root.text
      : typeof root.content === "string"
        ? root.content
        : undefined;

  await upsert(ctx, "records", "by_externalId", externalId, {
    externalId,
    accountId,
    path,
    kind: "file",
    text,
    data: text ? undefined : root,
    addedAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// get_signals
// ---------------------------------------------------------------------------

async function applySignals(ctx: MutationCtx, raw: unknown) {
  const root = isObj(raw) ? raw : {};
  for (const signal of arr(root.signals)) {
    if (!isObj(signal)) continue;
    const id = str(signal.id);
    if (!id) continue;
    const accountId = str(signal.account);
    const at = Date.parse(str(signal.dated)) || Date.now();

    await upsert(ctx, "signals", "by_externalId", id, {
      externalId: id,
      accountId: accountId || undefined,
      at,
      kind: str(signal.kind) || id,
      summary: str(signal.summary),
      before: signal.before ?? undefined,
      after: signal.after ?? undefined,
      linkedDealId: str(signal.linked_deal) || undefined,
      read: false,
      raw: signal,
    });

    for (const record of arr(signal.records)) {
      if (!isObj(record)) continue;
      const path = str(record.path);
      if (!path) continue;
      const externalId = `${accountId || "-"}:${path}`;
      await upsert(ctx, "records", "by_externalId", externalId, {
        externalId,
        accountId: accountId || null,
        path,
        kind: str(record.kind, "document"),
        text: typeof record.text === "string" ? record.text : undefined,
        data: isObj(record.data) ? record.data : undefined,
        addedAt: Date.now(),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Reference corpora (no account of their own)
// ---------------------------------------------------------------------------

async function applyReference(
  ctx: MutationCtx,
  path: string,
  kind: string,
  raw: unknown,
) {
  await upsert(ctx, "records", "by_externalId", `ref:${kind}`, {
    externalId: `ref:${kind}`,
    accountId: null,
    path,
    kind,
    data: raw,
    addedAt: Date.now(),
  });
}

async function applyWhoami(ctx: MutationCtx, raw: unknown) {
  if (!isObj(raw)) return;
  for (const acc of arr(raw.new_accounts)) {
    if (!isObj(acc)) continue;
    const id = str(acc.id);
    if (!id) continue;
    const name = str(acc.name, id);
    await upsert(ctx, "accounts", "by_externalId", id, {
      externalId: id,
      name,
      updatedAt: Date.now(),
      raw: acc,
    });
  }
}

// ---------------------------------------------------------------------------

export async function applyToolResult(
  ctx: MutationCtx,
  tool: string,
  args: Obj,
  raw: unknown,
) {
  switch (tool) {
    case "whoami":
      await applyWhoami(ctx, raw);
      return;
    case "get_my_accounts":
    case "get_pack":
    case "get_new_account":
      await applyExport(ctx, raw);
      return;
    case "get_all_paperwork":
      await applyPaperwork(ctx, args, raw);
      return;
    case "get_file":
      await applyFile(ctx, args, raw);
      return;
    case "get_signals":
      await applySignals(ctx, raw);
      return;
    case "get_feature_requests":
      await applyReference(ctx, "feature_requests.json", "feature_requests", raw);
      return;
    case "get_release_notes":
      await applyReference(ctx, "release_notes.json", "release_notes", raw);
      return;
    case "get_flytbase_team":
      await applyReference(ctx, "team.json", "team", raw);
      return;
    default:
      // Unknown tool: the snapshot still holds the raw payload, nothing to model.
      return;
  }
}
