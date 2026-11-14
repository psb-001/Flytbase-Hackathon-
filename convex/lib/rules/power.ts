import type {
  PersonCard,
  PowerAnswer,
  PowerDeal,
  RoleCell,
  RoleName,
  Warmth,
} from "../dto";
import { type AccountView, buildIndex, dataOf, money } from "../view";

type Contact = {
  id: string;
  name: string;
  role: string;
  on_file_since?: string;
  last_contact_before_handover?: string;
  note?: string;
};

type Profile = {
  contacts_on_file?: Contact[];
  not_on_file?: string[];
  flytbase_side?: {
    commercial_owner?: string;
    csm?: { who: string; from: string; to?: string }[];
  };
};

const ROLE_RANK: [RegExp, number][] = [
  [/programme lead/i, 6],
  [/head of/i, 6],
  [/director|chief/i, 5],
  [/controller/i, 4],
  [/inspector/i, 3],
  [/manager/i, 3],
  [/lead/i, 2],
];

const rankOf = (role: string) => {
  for (const [pattern, rank] of ROLE_RANK) if (pattern.test(role)) return rank;
  return 1;
};

const sentence = (text: string, max = 160) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/**
 * Q2. Four named roles per deal. An empty seat stays empty and carries the
 * question that would fill it — we never promote a contact into a role the
 * paperwork does not support.
 */
export function power(view: AccountView): PowerAnswer {
  const idx = buildIndex(view);
  const profile = dataOf<Profile>(idx.kind("profile"));
  const contacts = new Map(
    (profile?.contacts_on_file ?? []).map((c) => [c.id, c]),
  );
  const currency = view.currency;

  const personById = new Map(view.people.map((p) => [p.externalId, p]));

  const personForFactSayer = (saidBy: string) =>
    view.people.find((p) => p.name === saidBy) ?? null;

  const factRows = (ids: string[]) =>
    ids
      .map((id) => idx.facts.get(id))
      .filter((f): f is NonNullable<typeof f> => Boolean(f));

  /** What this person is waiting on from us, said in their own words. */
  const waitingOnFor = (personId: string): { text: string; evidence: string[] } | null => {
    const person = personById.get(personId);
    if (!person) return null;

    const waiting =
      view.facts.find(
        (f) =>
          f.saidBy === person.name &&
          /nobody has shown|not been shown|never been shown|no reply/i.test(f.text),
      ) ??
      view.facts.find(
        (f) =>
          f.saidBy === person.name &&
          /waiting for|has asked|asked (us|for)|cannot be signed/i.test(f.text),
      );
    if (waiting) return { text: sentence(waiting.text), evidence: [waiting.externalId] };

    const signal = view.signals.find(
      (s) =>
        s.summary.includes(person.name) &&
        /wants|asked|needs|written directly|no reply|has not been shown/i.test(s.summary),
    );
    if (signal) return { text: sentence(signal.summary), evidence: [signal.externalId] };

    return null;
  };

  const dealPeople = (evidence: string[]) => {
    const sayers = new Set(factRows(evidence).map((f) => f.saidBy));
    return view.people.filter(
      (p) => sayers.has(p.name) || evidence.includes(p.externalId),
    );
  };

  const cell = (
    role: RoleName,
    personId: string | null,
    why: string,
    ask: string | null,
    evidenceIds: string[],
  ): RoleCell => {
    const person = personId ? personById.get(personId) : null;
    const waiting = personId ? waitingOnFor(personId) : null;
    return {
      role,
      personId: person ? person.externalId : null,
      name: person?.name ?? null,
      warmth: (person?.relationship as Warmth | undefined) ?? null,
      waitingOn: waiting?.text ?? null,
      ask: person ? null : ask,
      why,
      evidence: idx.many([...(person ? [person.externalId] : []), ...evidenceIds]),
    };
  };

  const deals: PowerDeal[] = view.deals.map((deal) => {
    const evidence = [...deal.evidence];
    const people = dealPeople(evidence);
    const facts = factRows(evidence);
    const isSister = /sister|case study/i.test(deal.title);
    const isRenewal = /renew/i.test(deal.title);

    // --- blocker ---------------------------------------------------------
    let blockerId: string | null = null;
    let blockerWhy = "";
    let blockerAsk: string | null = null;

    const financePerson = view.people.find((p) => /finance|controller/i.test(p.role));
    if (deal.blocker && /finance/i.test(deal.blocker.text) && financePerson) {
      blockerId = financePerson.externalId;
      blockerWhy = `Named in the blocker: "${deal.blocker.text}".`;
    } else {
      const dpoFact = facts.find((f) =>
        /cannot be signed|not be signed|never sent|no reply/i.test(f.text),
      );
      if (dpoFact) {
        const person = personForFactSayer(dpoFact.saidBy);
        if (person) {
          blockerId = person.externalId;
          blockerWhy = `Says the deal cannot proceed: "${sentence(dpoFact.text)}".`;
        }
      }
    }

    if (!blockerId) {
      if (deal.blocker?.status === "open") {
        blockerWhy = `Blocker is open but no person is named: "${deal.blocker.text}".`;
        blockerAsk = "Ask who owns the blocker, by name.";
      } else if (isSister) {
        blockerWhy = "No blocker is named, and no sister-company contact is on file.";
        blockerAsk = "Ask Stefan Roy who could stop the sister-company case study.";
      } else if (isRenewal) {
        blockerWhy = "No blocker is on file — and no procurement or finance contact exists to be one.";
        blockerAsk = "Ask Rhys Calder who signs, or can stop, the renewal after January.";
      } else {
        const guard = facts.find((f) => /guard contractor/i.test(f.text));
        blockerWhy = guard
          ? "The blocker is a contract, not a person: the guard contractor does not act on drone alerts."
          : "No blocker is on file for this deal.";
        blockerAsk = guard
          ? "Ask Beatriz Alonso which guard contractor covers the plant."
          : "Ask who could block this deal.";
      }
    }

    // --- decider ---------------------------------------------------------
    const pool = people
      .filter((p) => p.externalId !== blockerId)
      .sort((a, b) => rankOf(b.role) - rankOf(a.role) || a.name.localeCompare(b.name));

    const decider = isSister ? null : (pool[0] ?? null);

    // --- payer -----------------------------------------------------------
    const payer =
      people.find(
        (p) => /finance|controller/i.test(p.role) && p.externalId !== decider?.externalId,
      ) ??
      (deal.blocker && /finance/i.test(deal.blocker.text) ? financePerson ?? null : null);

    // --- user ------------------------------------------------------------
    const user =
      people.find(
        (p) =>
          /inspector|plant manager|operator|unit/i.test(p.role) &&
          p.externalId !== decider?.externalId &&
          p.externalId !== blockerId,
      ) ?? null;

    const cells: RoleCell[] = [
      cell(
        "decider",
        decider?.externalId ?? null,
        decider
          ? `${decider.role}; signed or owns the programme on file.`
          : isSister
            ? "The sister company has no named contact anywhere in the record."
            : "No decider is on file.",
        isSister
          ? "Ask Stefan Roy to name the sister company's sponsor."
          : "Ask who signs this off.",
        evidence,
      ),
      cell(
        "payer",
        payer?.externalId ?? null,
        payer
          ? `${payer.role}; cost sits with them on file.`
          : "No finance contact exists on this account — the sheet says so.",
        "Ask which finance team pays this, and who signs it.",
        evidence,
      ),
      cell(
        "user",
        user?.externalId ?? null,
        user
          ? `${user.role}; their facts are in this deal's evidence.`
          : "Nobody who uses this is named in the evidence.",
        "Ask who operates it day to day.",
        evidence,
      ),
      cell("blocker", blockerId, blockerWhy, blockerAsk, evidence),
    ];

    return {
      dealId: deal.externalId,
      title: deal.title,
      stage: deal.stage,
      money: money(deal.worthUpTo, currency),
      cells,
    };
  });

  const cellOwners = new Map<string, RoleName[]>();
  for (const deal of deals) {
    for (const c of deal.cells) {
      if (!c.personId) continue;
      const list = cellOwners.get(c.personId) ?? [];
      list.push(c.role);
      cellOwners.set(c.personId, list);
    }
  }

  const WEIGHT: Record<RoleName, number> = {
    decider: 3,
    payer: 2,
    blocker: 2,
    user: 1,
  };

  const roster: PersonCard[] = view.people
    .map((person) => {
      const contact = contacts.get(person.externalId);
      const roles = cellOwners.get(person.externalId) ?? [];
      return {
        id: person.externalId,
        name: person.name,
        role: person.role,
        relationship: person.relationship,
        available: person.available,
        deals: deals
          .filter((d) => d.cells.some((c) => c.personId === person.externalId))
          .map((d) => d.dealId),
        lastContact: contact?.last_contact_before_handover ?? null,
        note: contact?.note ?? null,
        source: "roster" as const,
        evidence: idx.many([person.externalId]),
        _score: roles.reduce((t, r) => t + WEIGHT[r], 0),
      };
    })
    .sort(
      (a, b) =>
        b._score - a._score ||
        rankOf(b.role) - rankOf(a.role) ||
        a.name.localeCompare(b.name),
    )
    .map(({ _score, ...card }) => card as PersonCard);

  // People we have heard from who are not on the account sheet at all.
  const rosterNames = new Set(view.people.map((p) => p.name));
  const offRoster: PersonCard[] = [];
  const seen = new Set<string>();
  for (const fact of view.facts) {
    const name = fact.saidBy;
    if (!name || rosterNames.has(name) || /^srv$/i.test(name) || seen.has(name)) continue;
    seen.add(name);
    offRoster.push({
      id: fact.externalId,
      name,
      role: "Spoke to us; not on the account sheet",
      relationship: "neutral",
      available: true,
      deals: view.deals
        .filter((d) => d.evidence.includes(fact.externalId))
        .map((d) => d.externalId),
      lastContact: null,
      note: "The only record of this person is the fact they gave us.",
      source: "fact",
      evidence: idx.many([fact.externalId]),
    });
  }

  const allCells = deals.flatMap((d) => d.cells);
  const filled = allCells.filter((c) => c.personId !== null).length;
  const total = allCells.length;

  const powerHeldBy = roster
    .map((person) => {
      const roles = cellOwners.get(person.id) ?? [];
      if (roles.length === 0) return null;
      const deciderCount = roles.filter((r) => r === "decider").length;
      const bits: string[] = [];
      if (deciderCount)
        bits.push(
          `decides ${deciderCount} of ${deals.length} deal${deals.length === 1 ? "" : "s"}`,
        );
      if (roles.includes("blocker")) bits.push("can block it");
      if (roles.includes("payer")) bits.push("pays");
      if (roles.includes("user")) bits.push("uses it");
      bits.push(person.relationship);
      const signal = view.signals.find((s) => s.summary.includes(person.name));
      if (signal) bits.push(signal.summary.split(".")[0]);
      return {
        personId: person.id,
        name: person.name,
        why: bits.join(" · "),
        evidence: idx.many([
          ...(signal ? [signal.externalId] : []),
          ...person.evidence.map((e) => e.id),
        ]),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 4);

  const top = deals
    .map((d) => ({
      title: d.title,
      holders: d.cells
        .filter((c) => c.name)
        .map((c) => `${c.name} (${c.role})`),
    }))
    .filter((d) => d.holders.length > 0)[0];

  const cold = roster.filter(
    (p) => p.relationship === "guarded" || p.relationship === "neutral",
  ).length;

  return {
    deals,
    roster,
    offRoster,
    coverage: { filled, total, missing: total - filled },
    headline: `${filled} of ${total} role seats are filled. ${
      top ? `${top.title}: ${top.holders.join(", ")}.` : ""
    } ${cold} contact${cold === 1 ? " is" : "s are"} guarded or neutral.`,
    powerHeldBy,
  };
}
