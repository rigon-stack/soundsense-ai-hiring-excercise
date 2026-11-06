import "server-only";
// Imported (not read from disk at runtime) so the data is bundled with the server code.
import rawCalls from "../../soundsense-exercise-data/candidate-calls.json";
import { parseTranscript } from "./transcript";
import type { Call } from "./types";

type RawCall = {
  id: string;
  call_date: string;
  estimated_duration: string;
  transcript: string;
  summary: string;
};

function isRawCall(x: unknown): x is RawCall {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return ["id", "call_date", "estimated_duration", "transcript", "summary"].every((k) => typeof o[k] === "string");
}

function loadCalls(data: unknown): RawCall[] {
  if (!Array.isArray(data) || !data.every(isRawCall)) {
    throw new Error("candidate-calls.json has an unexpected shape");
  }
  return data;
}

const calls = loadCalls(rawCalls);
const sortedIds = calls.map((c) => c.id).sort((a, b) => a.localeCompare(b));

export function listCallIds(): string[] {
  return sortedIds;
}

export function getCall(id: string): Call | null {
  const c = calls.find((x) => x.id === id);
  if (!c) return null;
  return { id: c.id, date: c.call_date, turns: parseTranscript(c.transcript), summary: c.summary };
}
