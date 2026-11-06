import type { Turn } from "../types";
import type { Finding } from "./schema";

export type VerifiedFinding = Finding & { verified: boolean };
export type ReviewStatus = "passed" | "not_passed";
export type ReviewResult = { callId: string; status: ReviewStatus; findings: VerifiedFinding[] };

/** Normalises curly quotes/apostrophes and whitespace so cosmetic differences don't break matching. */
export function normalise(text: string): string {
  return text
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Marks each finding verified only if its quote appears in the cited turn (transcript) or the summary. */
export function verifyFindings(findings: Finding[], turns: Turn[], summary: string): VerifiedFinding[] {
  const normSummary = normalise(summary);
  return findings.map((f) => {
    const quote = normalise(f.quote);
    let verified = false;
    if (quote !== "") {
      if (f.source === "summary") {
        verified = normSummary.includes(quote);
      } else {
        const turn = turns.find((t) => t.turnId === f.turn_id);
        verified = !!turn && normalise(turn.text).includes(quote);
      }
    }
    return { ...f, verified };
  });
}

/** Not passed only when at least one verified finding is definite. */
export function computeStatus(findings: VerifiedFinding[]): ReviewStatus {
  return findings.some((f) => f.verified && f.certainty === "definite") ? "not_passed" : "passed";
}
