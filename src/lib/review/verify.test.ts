import { describe, expect, it } from "vitest";
import { computeStatus, verifyFindings } from "./verify";
import type { Finding } from "./schema";
import type { Turn } from "../types";

const turns: Turn[] = [
  { turnId: "T01", timestamp: "00:00", speaker: "Agent", text: "I’ll call  you\nafter two." },
  { turnId: "T02", timestamp: "00:05", speaker: "Customer", text: "That’s fine." },
];
const summary = "The customer called the company. Payment made.";

const base: Finding = {
  type: "contradiction",
  certainty: "definite",
  source: "transcript",
  turn_id: "T01",
  quote: "after two",
  explanation: "x",
};

describe("verifyFindings", () => {
  it("verifies a matching transcript quote", () => {
    expect(verifyFindings([base], turns, summary)[0].verified).toBe(true);
  });

  it("does not verify a quote cited against the wrong turn", () => {
    expect(verifyFindings([{ ...base, turn_id: "T02" }], turns, summary)[0].verified).toBe(false);
  });

  it("does not verify an unknown turn or an invented quote", () => {
    expect(verifyFindings([{ ...base, turn_id: "T99" }], turns, summary)[0].verified).toBe(false);
    expect(verifyFindings([{ ...base, quote: "at 2 pm sharp" }], turns, summary)[0].verified).toBe(false);
  });

  it("matches across curly quotes and whitespace differences", () => {
    expect(verifyFindings([{ ...base, quote: "I'll call you after two." }], turns, summary)[0].verified).toBe(true);
    expect(verifyFindings([{ ...base, turn_id: "T02", quote: "That’s   fine" }], turns, summary)[0].verified).toBe(true);
  });

  it("verifies summary quotes against the summary", () => {
    const f: Finding = { ...base, type: "rule_breach", source: "summary", turn_id: null, quote: "Payment made." };
    expect(verifyFindings([f], turns, summary)[0].verified).toBe(true);
    expect(verifyFindings([{ ...f, quote: "Payment of £230" }], turns, summary)[0].verified).toBe(false);
  });
});

describe("computeStatus", () => {
  const v = (certainty: Finding["certainty"], verified: boolean) => ({ ...base, certainty, verified });

  it("is not passed with a verified definite finding", () => {
    expect(computeStatus([v("definite", true)])).toBe("not_passed");
  });

  it("is passed when the only definite finding is unverified", () => {
    expect(computeStatus([v("definite", false)])).toBe("passed");
  });

  it("is passed with only uncertain findings, or none", () => {
    expect(computeStatus([v("uncertain", true)])).toBe("passed");
    expect(computeStatus([])).toBe("passed");
  });
});
