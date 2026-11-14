#!/usr/bin/env node
/**
 * Seed the deployment from MCP payloads we already captured.
 *
 * Why: the MCP allows one call per minute, writes included. Re-fetching the
 * same 11 payloads just to populate a second deployment would burn 11 minutes
 * of the demo budget. The captures are the same bytes the MCP returned.
 *
 * Usage:
 *   node scripts/seed.mjs <capture-dir>
 *
 * Requires in .env.local (never committed):
 *   NEXT_PUBLIC_CONVEX_URL
 *   MCP_SEED_KEY
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/seed.mjs <capture-dir>");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line && !line.trimStart().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const url = process.env.SEED_URL || env.NEXT_PUBLIC_CONVEX_URL;
const key = env.MCP_SEED_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_CONVEX_URL and MCP_SEED_KEY must be set in .env.local");
  process.exit(1);
}

/** Pull the tool payload out of a captured JSON-RPC response. */
function payload(file) {
  const body = JSON.parse(readFileSync(file, "utf8"));
  if (body.error) throw new Error(`${file}: RPC error ${body.error.message}`);
  const text = body.result?.content?.find((p) => p.type === "text")?.text;
  if (typeof text !== "string") return body.result;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** filename -> [tool, args] */
function describe(name) {
  const m = name.match(/^raw_(.+)\.txt$/);
  if (!m) return null;
  const stem = m[1];

  if (stem === "get_my_accounts") return ["get_my_accounts", {}];
  if (stem === "get_feature_requests") return ["get_feature_requests", {}];
  if (stem === "get_release_notes") return ["get_release_notes", {}];
  if (stem === "get_signals") return ["get_signals", {}];
  if (stem === "get_flytbase_team") return ["get_flytbase_team", {}];
  if (stem === "whoami") return ["whoami", {}];
  if (stem === "get_data_format") return ["get_data_format", {}];

  let hit = stem.match(/^get_all_paperwork_([AB])$/);
  if (hit) return ["get_all_paperwork", { account: hit[1] }];

  hit = stem.match(/^get_file_(.+)$/);
  if (hit) return ["get_file", { id: hit[1] }];

  return [stem, {}];
}

async function seed(tool, args, raw) {
  const res = await fetch(`${url}/api/mutation`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path: "ingest:seedSnapshot",
      args: { key, tool, args, raw },
      format: "json",
    }),
  });
  const body = await res.json();
  if (!res.ok || body.status === "error") {
    throw new Error(`${tool}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body.value;
}

const ORDER = [
  "get_my_accounts",
  "get_all_paperwork",
  "get_file",
  "get_signals",
  "get_flytbase_team",
  "get_feature_requests",
  "get_release_notes",
  "whoami",
  "get_data_format",
];

const files = readdirSync(dir)
  .filter((f) => /^raw_.+\.txt$/.test(f))
  .map((f) => ({ name: f, ...(describe(f) ? { tool: describe(f)[0], args: describe(f)[1] } : {}) }))
  .filter((f) => f.tool)
  .sort((a, b) => ORDER.indexOf(a.tool) - ORDER.indexOf(b.tool) || a.name.localeCompare(b.name));

if (files.length === 0) {
  console.error(`no raw_*.txt captures in ${dir}`);
  process.exit(1);
}

let ok = 0;
for (const file of files) {
  const path = join(dir, file.name);
  if (!existsSync(path)) continue;
  try {
    const raw = payload(path);
    await seed(file.tool, file.args, raw);
    console.log(`seeded ${file.tool} ${JSON.stringify(file.args)}  (${file.name})`);
    ok++;
  } catch (error) {
    console.error(`FAILED ${file.name}: ${error.message}`);
  }
}

console.log(`\n${ok}/${files.length} payloads applied`);
