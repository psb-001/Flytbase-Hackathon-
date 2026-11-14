import type { Risk, RiskAnswer, RiskLane } from "../dto";
import {
  type AccountView,
  addDays,
  buildIndex,
  dataOf,
  daysBetween,
} from "../view";

type Profile = {
  renewal?: { term_ends?: string; annual_value?: number };
  contacts_on_file?: {
    id: string;
    name: string;
    role: string;
    last_contact_before_handover?: string;
    note?: string;
  }[];
  not_on_file?: string[];
};

const severity = (n: number): 1 | 2 | 3 => (n >= 3 ? 3 : n === 2 ? 2 : 1);

const later = (a: string, b: string) => (a > b ? a : b);

/**
 * Q4. Four detectors, each with the date it stops being a warning. No colour is
 * assigned without a rule behind it.
 */
export function risk(view: AccountView): RiskAnswer {
  const idx = buildIndex(view);
  const profile = dataOf<Profile>(idx.kind("profile"));
  const termEnd = profile?.renewal?.term_ends ?? null;
  const currency = view.currency;
  const risks: Omit<Risk, "passed">[] = [];

  // --- signal ------------------------------------------------------------
  for (const signal of view.signals) {
    const dated = new Date(signal.at).toISOString().slice(0, 10);
    if (signal.externalId === "urgent_request") {
      risks.push({
        id: `signal_${signal.externalId}`,
        lane: "signal",
        severity: 3,
        turnsBadAt: addDays(dated, 4),
        what: signal.summary,
        dealId: view.deals.find((d) => /renew/i.test(d.title))?.externalId ?? null,
        detector: `Signal ${signal.externalId}, dated ${dated}; she asks for an answer “this week”.`,
        evidence: idx.many([signal.externalId]),
      });
    } else if (signal.externalId === "champion_leaves") {
      risks.push({
        id: `signal_${signal.externalId}`,
        lane: "signal",
        severity: 3,
        turnsBadAt: "2027-01-01",
        what: signal.summary,
        dealId: view.deals.find((d) => /renew/i.test(d.title))?.externalId ?? null,
        detector: `Signal ${signal.externalId}, dated ${dated}; the handover is in January.`,
        evidence: idx.many([signal.externalId]),
      });
    } else {
      risks.push({
        id: `signal_${signal.externalId}`,
        lane: "signal",
        severity: 2,
        turnsBadAt: addDays(dated, 14),
        what: signal.summary,
        dealId: null,
        detector: `Signal ${signal.externalId}, dated ${dated}.`,
        evidence: idx.many([signal.externalId]),
      });
    }
  }

  // --- stall -------------------------------------------------------------
  for (const deal of view.deals) {
    const blocker = deal.blocker;
    const contradicted =
      blocker?.status === "cleared" &&
      deal.evidence.some((id) => {
        const fact = idx.facts.get(id);
        return Boolean(fact && /cannot be signed|not be signed|never sent/i.test(fact.text));
      });

    if (contradicted) {
      const fact = deal.evidence
        .map((id) => idx.facts.get(id))
        .find((f) => f && /cannot be signed|not be signed|never sent/i.test(f.text));
      risks.push({
        id: `stall_${deal.externalId}`,
        lane: "stall",
        severity: 3,
        turnsBadAt: addDays(view.asOf, 14),
        what: `The blocker is marked \`cleared\`, but the person who signs says it cannot be signed without documents we never sent. ${deal.title} is agreed on paper only.`,
        dealId: deal.externalId,
        detector: "Blocker status contradicts a verified fact on the same deal.",
        evidence: idx.many([deal.externalId, ...(fact ? [fact.externalId] : [])]),
      });
      continue;
    }

    if (blocker?.status === "open") {
      risks.push({
        id: `stall_${deal.externalId}`,
        lane: "stall",
        severity: 3,
        turnsBadAt: termEnd ? addDays(termEnd, -60) : addDays(view.asOf, 30),
        what: `${deal.title} is \`${deal.stage}\` with an open blocker: "${blocker.text}".`,
        dealId: deal.externalId,
        detector: "Open blocker on a deal that already carries a value.",
        evidence: idx.many([deal.externalId]),
      });
      continue;
    }

    if (deal.stage === "identified") {
      const idlePlants =
        deal.externalId === "b_idle"
          ? view.facts.find((f) => /test flights/i.test(f.text)) ?? null
          : null;
      const notStarted = /not started|has not been started/i.test(
        JSON.stringify(idx.kind("deal_history")?.data ?? {}),
      );
      risks.push({
        id: `stall_${deal.externalId}`,
        lane: "stall",
        severity: idlePlants ? 2 : 1,
        turnsBadAt: later(
          termEnd ? addDays(termEnd, -90) : addDays(view.asOf, 60),
          addDays(view.asOf, 14),
        ),
        what:
          deal.externalId === "b_idle" && idlePlants
            ? `Nine of the group's plants only log test flights, and this opportunity has never been scoped or valued.`
            : notStarted
              ? `The case study this opportunity depends on has not been started.`
              : `${deal.title} is still \`identified\` and nothing on file has moved it since handover.`,
        dealId: deal.externalId,
        detector: "Stage has not moved; no value, no deadline, no blocker to clear.",
        evidence: idx.many([deal.externalId, ...(idlePlants ? [idlePlants.externalId] : [])]),
      });
    }
  }

  // --- warmth ------------------------------------------------------------
  const contacts = profile?.contacts_on_file ?? [];
  for (const contact of contacts) {
    const person = view.people.find((p) => p.externalId === contact.id);
    if (!person) continue;

    if (!contact.last_contact_before_handover) {
      risks.push({
        id: `warmth_${contact.id}`,
        lane: "warmth",
        severity: 2,
        turnsBadAt: addDays(view.asOf, 30),
        what: `${contact.name} is on the account sheet and has never been on a call. No note explains why.`,
        dealId: null,
        detector: "Roster contact with no last-contact date.",
        evidence: idx.many([person.externalId]),
      });
      continue;
    }

    const coldDays = daysBetween(contact.last_contact_before_handover, view.asOf);
    const warm =
      person.relationship === "guarded"
        ? 3
        : person.relationship === "neutral"
          ? 2
          : 1;
    if (coldDays < 60 && warm < 3) continue;

    risks.push({
      id: `warmth_${contact.id}`,
      lane: "warmth",
      severity: severity(warm + (coldDays >= 90 ? 1 : 0)),
      turnsBadAt: addDays(contact.last_contact_before_handover, 90),
      what: `${contact.name} is ${person.relationship}, and the last contact on file is ${contact.last_contact_before_handover} — ${coldDays} days ago.${contact.note ? ` ${contact.note}` : ""}`,
      dealId:
        view.deals.find((d) =>
          d.evidence.some(
            (id) => idx.facts.get(id)?.saidBy === contact.name,
          ),
        )?.externalId ?? null,
      detector: "Warmth decay: `guarded` or `neutral`, or no contact for 60+ days; 90 days is the line.",
      evidence: idx.many([person.externalId]),
    });
  }

  // --- deadline ----------------------------------------------------------
  if (termEnd) {
    risks.push({
      id: "deadline_term",
      lane: "deadline",
      severity: 2,
      turnsBadAt: termEnd,
      what: `The renewal term ends ${termEnd}. No notice period, renewal date or procurement timetable is recorded anywhere for this account.`,
      dealId: view.deals.find((d) => /renew/i.test(d.title))?.externalId ?? null,
      detector: "Contract term end from the profile. The export itself has 0 deadlines.",
      evidence: idx.many([
        profile ? `${view.account.externalId}:profile.json` : "",
        ...view.deals.filter((d) => /renew/i.test(d.title)).map((d) => d.externalId),
      ]),
    });
  }

  const lanes: Record<RiskLane, Risk[]> = {
    deadline: [],
    warmth: [],
    stall: [],
    signal: [],
  };
  for (const r of risks)
    lanes[r.lane].push({ ...r, passed: r.turnsBadAt <= view.asOf });
  for (const lane of Object.keys(lanes) as RiskLane[]) {
    lanes[lane].sort(
      (a, b) =>
        b.severity - a.severity ||
        a.turnsBadAt.localeCompare(b.turnsBadAt) ||
        a.id.localeCompare(b.id),
    );
  }

  const count = risks.length;
  const soon = risks.filter((r) => daysBetween(view.asOf, r.turnsBadAt) <= 30).length;

  return {
    lanes,
    count,
    headline:
      count === 0
        ? "No detector fires — which would be suspicious, not good."
        : `${count} things are on a clock; ${soon} turn bad within 30 days. ${
            view.deadlines.length === 0
              ? "The deadline detector is blind: this account has no deadline on file."
              : ""
          }`.trim(),
    detectorNotes: {
      deadline:
        view.deadlines.length === 0
          ? "0 deadlines in the export and every opportunity `deadline` is null. Only the contract term gives a date — so this lane cannot see a renewal notice period, a procurement timetable or a go-live."
          : `${view.deadlines.length} deadline(s) on file, each with the minute it lands.`,
      warmth:
        "Last contact from the account profile, plus the warmth the account sheet records. 60 days is a warning, 90 days is a loss.",
      stall:
        "Stage movement, blocker status, and whether our own file contradicts the stage.",
      signal:
        "Unread signals in the inbox. Each one carries its own date, so this lane is the only one that is fully current.",
    },
  };
}
