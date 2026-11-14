import type { Answer } from "./dto";
import { book } from "./rules/book";
import { gaps } from "./rules/gaps";
import { moves } from "./rules/moves";
import { power } from "./rules/power";
import { risk } from "./rules/risk";
import type { AccountView } from "./view";

/** Assemble the five answers for one account. Pure: same input, same output. */
export function buildAnswer(view: AccountView): Answer {
  return {
    accountId: view.account.externalId,
    accountName: view.account.name,
    officialStory: view.account.officialStory ?? null,
    currency: view.currency,
    asOf: view.asOf,
    worldClosed: view.account.worldClosed ?? false,
    book: book(view),
    power: power(view),
    moves: moves(view),
    risk: risk(view),
    gaps: gaps(view),
  };
}
