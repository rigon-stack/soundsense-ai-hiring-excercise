import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { reviewCall } from "./review";
import { ReviewError } from "./openrouter";
import { parseModelOutput, validateFindings, ValidationError } from "./schema";
import type { Call } from "../types";

const call: Call = {
  id: "CALL-X",
  date: "2026-10-20",
  summary: "DPA completed.",
  turns: [{ turnId: "T01", timestamp: "00:00", speaker: "Agent", text: "Hello" }],
};

const good = {
  type: "contradiction",
  certainty: "definite",
  source: "transcript",
  turn_id: "T01",
  quote: "Hello",
  explanation: "x",
};
const goodJson = JSON.stringify({ findings: [good] });

describe("validateFindings", () => {
  it("accepts a valid finding and an empty list", () => {
    expect(validateFindings({ findings: [good] })).toHaveLength(1);
    expect(validateFindings({ findings: [] })).toEqual([]);
  });

  it("requires turn_id for transcript sources", () => {
    expect(() => validateFindings({ findings: [{ ...good, turn_id: null }] })).toThrow(ValidationError);
  });

  it("rejects bad enums, empty quotes and wrong quote source", () => {
    expect(() => validateFindings({ findings: [{ ...good, type: "bogus" }] })).toThrow(ValidationError);
    expect(() => validateFindings({ findings: [{ ...good, quote: " " }] })).toThrow(ValidationError);
    expect(() => validateFindings({ findings: [{ ...good, type: "rule_breach" }] })).toThrow(ValidationError);
  });

  it("accepts a summary finding with a null turn_id", () => {
    const f = { ...good, type: "rule_breach", source: "summary", turn_id: null };
    expect(validateFindings({ findings: [f] })[0].turn_id).toBeNull();
  });

  it("parses fenced JSON and rejects non-JSON", () => {
    expect(parseModelOutput("```json\n" + goodJson + "\n```")).toHaveLength(1);
    expect(() => parseModelOutput("not json")).toThrow(ValidationError);
  });
});

describe("reviewCall retry", () => {
  it("retries once after invalid output, then succeeds", async () => {
    const caller = vi.fn().mockResolvedValueOnce("oops").mockResolvedValueOnce(goodJson);
    expect(await reviewCall(call, caller)).toHaveLength(1);
    expect(caller).toHaveBeenCalledTimes(2);
  });

  it("retries once after an API failure, then returns a clear error", async () => {
    const caller = vi.fn().mockRejectedValue(new ReviewError("The model provider returned an error (HTTP 401).", 502));
    await expect(reviewCall(call, caller)).rejects.toThrow(/HTTP 401/);
    expect(caller).toHaveBeenCalledTimes(2);
  });

  it("returns a clear error when output is invalid twice", async () => {
    const caller = vi.fn().mockResolvedValue("{}");
    await expect(reviewCall(call, caller)).rejects.toThrow(/invalid review/);
    expect(caller).toHaveBeenCalledTimes(2);
  });

  it("does not retry when the server is not configured", async () => {
    const caller = vi.fn().mockRejectedValue(new ReviewError("not configured", 500));
    await expect(reviewCall(call, caller)).rejects.toThrow(/not configured/);
    expect(caller).toHaveBeenCalledTimes(1);
  });
});
