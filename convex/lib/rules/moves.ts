import type { Move, MovesAnswer } from "../dto";
import { type AccountView, addDays, buildIndex, dataOf } from "../view";

type Profile = {
  flytbase_side?: {
    commercial_owner?: string;
    csm?: { who: string; from: string; to?: string }[];
  };
};

type Candidate = {
  id: string;
  action: string;
  dealId: string;
  ownerId: string;
  dueOffset: number;
  /** 0..1, how fast this stops being possible */
  urgency: number;
  whyNow: string;
  /** the exact message to send, so the UI can offer "copy the ask" */
  ask: string;
  evidenceIds: string[];
};

const STAGE_SCORE: Record<string, number> = {
  identified: 0.25,
  qualified: 0.6,
  cleared: 0.8,
  agreed: 1,
};

const BLOCKER_SCORE = (status: string | undefined) =>
  status === "open" ? 1 : status === "cleared" ? 0.6 : 0.8;

const titleOf = (id: string, view: AccountView) =>
  view.deals.find((d) => d.externalId === id)?.title ?? id;

const pretty = (id: string) =>
  id === "you"
    ? "You (CSM)"
    : id
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

/**
 * Q3. Exactly three moves, ranked by a written score.
 *
 * The export has no deal deadlines at all, so "due inside the deadline" cannot
 * be computed from it. Each due date is instead set inside the contract term
 * and inside the window the source itself names (a week for the data-flow pack,
 * "this week" for the public event, January for the handover).
 */
export function moves(view: AccountView): MovesAnswer {
  const idx = buildIndex(view);
  const profile = dataOf<Profile>(idx.kind("profile"));
  const fallbackOwner = profile?.flytbase_side?.csm?.slice(-1)[0]?.who ?? "you";
  const teamById = new Map(view.team.map((t) => [t.id, t]));

  /** Owners are picked by role from get_flytbase_team, never invented. */
  const roleOwner = (preferred: string[], fallback = fallbackOwner) =>
    preferred.find((id) => teamById.has(id)) ?? fallback;

  const csm = roleOwner(["neel_sharma", "sam"]);
  const engineer = roleOwner(["pranjal_suyal", "srv"]);
  const commercial = roleOwner(["achal_negi"]);
  const gtm = roleOwner(["yashash_rao", "achal_negi"]);

  const has = (id: string) => view.facts.some((f) => f.externalId === id);
  const dealByStage = (stage: string) =>
    view.deals.find((d) => d.stage === stage) ?? null;
  const dealByTitle = (re: RegExp) =>
    view.deals.find((d) => re.test(d.title)) ?? null;

  const candidates: Candidate[] = [];

  // 1. An agreed deal is waiting on a document we already know how to produce.
  const agreed = dealByStage("agreed");
  if (agreed && has("srv_dataflow")) {
    const dpo = view.facts.find((f) => f.externalId === "fo_dpia_2");
    candidates.push({
      id: "send_dataflow",
      action: `Send Fatima Osei the data-flow pack, then chase it to signature`,
      dealId: agreed.externalId,
      ownerId: engineer,
      dueOffset: 7,
      urgency: 0.95,
      whyNow: `The agreed ${agreed.title} deal is waiting on one document. Engineering says a week; she says three weeks after that. Four months have already gone.`,
      ask:
        "Fatima — the data-flow pack is attached: flows, retention periods, storage location and access controls. Engineering needs about a week to produce it. Can you confirm it unblocks the DPIA signature, and tell me the date you need it by?",
      evidenceIds: [
        "srv_dataflow",
        ...(dpo ? [dpo.externalId] : []),
        "pj_ticket",
        "support_ticket_history",
      ],
    });
  }

  // 2. A live signal with a date attached.
  const urgent = view.signals.find((s) => s.externalId === "urgent_request");
  if (urgent) {
    const renewal = dealByTitle(/renew/i);
    candidates.push({
      id: "answer_karen",
      action:
        "Answer Insp. Karen Mbeki in writing: training dates and who covers a failed dock on 5 December",
      dealId: renewal?.externalId ?? view.deals[0]?.externalId ?? "",
      ownerId: csm,
      dueOffset: 7,
      urgency: 0.9,
      whyNow:
        "She has written directly and logged a ticket. We already price both answers as offers, so this is a reply, not a project.",
      ask:
        "Karen — two answers in writing before 5 December. One: the training dates for the extra operators. Two: who is accountable if a dock fails on the day. Tell me the slot you need and I will confirm both.",
      evidenceIds: [
        urgent.externalId,
        ...view.offers
          .filter((o) => o.pitchTo === "Insp. Karen Mbeki")
          .map((o) => o.externalId),
        "km_usage_1",
      ],
    });
  }

  // 3. The champion is leaving and no successor is named.
  const leaves = view.signals.find((s) => s.externalId === "champion_leaves");
  if (leaves) {
    const renewal = dealByTitle(/renew/i);
    candidates.push({
      id: "name_successor",
      action:
        "Get the January successor named and on a call, with the renewal dates in front of them",
      dealId: renewal?.externalId ?? view.deals[0]?.externalId ?? "",
      ownerId: commercial,
      dueOffset: 31,
      urgency: 0.7,
      whyNow:
        "Every call on file was with one person. He leaves in January and nobody has been named.",
      ask:
        "Rhys — before the January handover, who takes over the drone programme? I would like 20 minutes with them, with the renewal dates in front of us.",
      evidenceIds: [leaves.externalId],
    });
  }

  // 4. An open finance blocker on a qualified renewal.
  const blocked = view.deals.find(
    (d) => d.blocker?.status === "open" && /finance/i.test(d.blocker.text),
  );
  if (blocked) {
    const finance = view.people.find((p) => /finance|controller/i.test(p.role));
    candidates.push({
      id: "show_savings",
      action: `Show Nadia Rahman the savings working behind the number — or withdraw the number`,
      dealId: blocked.externalId,
      ownerId: csm,
      dueOffset: 14,
      urgency: 0.95,
      whyNow: `The renewal is qualified and the blocker is open: "${blocked.blocker?.text}". The person who pays has never seen the figure.`,
      ask:
        "Nadia — here is the working behind the savings figure, line by line. If it does not hold, say so and we withdraw the number rather than defend it.",
      evidenceIds: [
        blocked.externalId,
        ...(finance ? [finance.externalId] : []),
        "nr_cost_2",
        "sr_roll_0",
      ],
    });
  }

  // 5. The person who actually built the rollout is not on the account.
  const deputy = view.facts.find((f) => /deputy/i.test(f.text));
  if (deputy) {
    const idle = dealByTitle(/idle/i) ?? dealByTitle(/sister/i) ?? view.deals[0];
    candidates.push({
      id: "name_deputy",
      action:
        "Get Stefan Roy's deputy named and on the next call — he is the one who knows how the rollout was done",
      dealId: idle?.externalId ?? "",
      ownerId: csm,
      dueOffset: 7,
      urgency: 0.8,
      whyNow:
        "Beatriz Alonso says the deputy, not Stefan, set up the docks. He is referred to by role in every note and has no name on file.",
      ask:
        "Stefan — who actually set up the docks, plant by plant? I would like that person on the next call, not just the summary.",
      evidenceIds: [deputy.externalId, "ba_deputy_0"],
    });
  }

  // 6. A confident claim that our own file contradicts.
  const claim = view.facts.find((f) => f.status === "claim" && /thirteen of fifteen/i.test(f.text));
  const verified = view.facts.find((f) => f.status === "verified" && /four plants/i.test(f.text));
  if (claim && verified) {
    const sister = dealByTitle(/sister/i) ?? view.deals[0];
    candidates.push({
      id: "correct_record",
      action:
        "Correct the “13 of 15 plants” record with Stefan Roy and ask for the case study in the same call",
      dealId: sister?.externalId ?? "",
      ownerId: gtm,
      dueOffset: 21,
      urgency: 0.65,
      whyNow:
        "His claim and our flight log disagree: four plants fly regularly, nine log test flights only, and Plant 15 has no dock. The sister-company case study rests on this.",
      ask:
        "Stefan — our flight log shows four plants flying regularly, nine on test flights only, and Plant 15 with no dock. Can we correct the record, and still do the case study?",
      evidenceIds: [claim.externalId, verified.externalId],
    });
  }

  const maxValue = Math.max(
    1,
    ...view.deals.map((d) => d.worthUpTo ?? 0),
  );

  const scored = candidates
    .filter((c) => c.dealId)
    .map((candidate) => {
      const deal = view.deals.find((d) => d.externalId === candidate.dealId);
      const value = deal?.worthUpTo ? Math.min(1, deal.worthUpTo / maxValue) : 0.1;
      const stage = STAGE_SCORE[deal?.stage ?? "identified"] ?? 0.25;
      const blocker = BLOCKER_SCORE(deal?.blocker?.status);
      const total = Math.round(
        100 * (0.45 * value + 0.25 * stage + 0.2 * candidate.urgency + 0.1 * blocker),
      );
      return {
        candidate,
        score: {
          value: Math.round(value * 100),
          stage: Math.round(stage * 100),
          blocker: Math.round(blocker * 100),
          urgency: Math.round(candidate.urgency * 100),
          total,
        },
      };
    })
    .sort(
      (a, b) =>
        b.score.total - a.score.total ||
        a.candidate.dueOffset - b.candidate.dueOffset ||
        a.candidate.id.localeCompare(b.candidate.id),
    );

  const top: Move[] = scored.slice(0, 3).map((entry, i) => ({
    rank: i + 1,
    action: entry.candidate.action,
    dealId: entry.candidate.dealId,
    dealTitle: titleOf(entry.candidate.dealId, view),
    ownerId: entry.candidate.ownerId,
    ownerName: teamById.get(entry.candidate.ownerId)?.name ?? pretty(entry.candidate.ownerId),
    ownerRole: teamById.get(entry.candidate.ownerId)?.role ?? null,
    due: addDays(view.asOf, entry.candidate.dueOffset),
    whyNow: entry.candidate.whyNow,
    ask: entry.candidate.ask,
    score: entry.score,
    evidence: idx.many(entry.candidate.evidenceIds),
  }));

  const first = top[0];
  return {
    top,
    headline: first
      ? `Do this first: ${first.action}. Owner ${first.ownerName}, due ${first.due} — ${first.whyNow}`
      : "No move clears the bar on the current record.",
  };
}
