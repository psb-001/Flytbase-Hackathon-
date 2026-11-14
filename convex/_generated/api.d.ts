/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as ingest from "../ingest.js";
import type * as lib_answer from "../lib/answer.js";
import type * as lib_apply from "../lib/apply.js";
import type * as lib_dto from "../lib/dto.js";
import type * as lib_rules_book from "../lib/rules/book.js";
import type * as lib_rules_gaps from "../lib/rules/gaps.js";
import type * as lib_rules_moves from "../lib/rules/moves.js";
import type * as lib_rules_power from "../lib/rules/power.js";
import type * as lib_rules_risk from "../lib/rules/risk.js";
import type * as lib_view from "../lib/view.js";
import type * as mcp from "../mcp.js";
import type * as notes from "../notes.js";
import type * as queries from "../queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  ingest: typeof ingest;
  "lib/answer": typeof lib_answer;
  "lib/apply": typeof lib_apply;
  "lib/dto": typeof lib_dto;
  "lib/rules/book": typeof lib_rules_book;
  "lib/rules/gaps": typeof lib_rules_gaps;
  "lib/rules/moves": typeof lib_rules_moves;
  "lib/rules/power": typeof lib_rules_power;
  "lib/rules/risk": typeof lib_rules_risk;
  "lib/view": typeof lib_view;
  mcp: typeof mcp;
  notes: typeof notes;
  queries: typeof queries;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
