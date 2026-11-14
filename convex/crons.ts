import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * The pump spends at most one MCP call per minute. It runs more often than the
 * limit so a queued call goes out promptly instead of waiting for a whole tick.
 */
crons.interval("mcp pump", { seconds: 20 }, internal.ingest.pump, {});

export default crons;
