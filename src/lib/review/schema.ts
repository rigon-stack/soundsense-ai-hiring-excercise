export const FINDING_TYPES = ["contradiction", "unsupported", "omission", "rule_breach"] as const;
export const CERTAINTIES = ["definite", "uncertain"] as const;
export const SOURCES = ["transcript", "summary"] as const;

export type FindingType = (typeof FINDING_TYPES)[number];
export type Certainty = (typeof CERTAINTIES)[number];
export type Source = (typeof SOURCES)[number];

export type Finding = {
  type: FindingType;
  certainty: Certainty;
  source: Source;
  /** Required when source is "transcript", e.g. "T05". Null for summary quotes. */
  turn_id: string | null;
  quote: string;
  explanation: string;
};

export class ValidationError extends Error {}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string, i: number): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new ValidationError(`findings[${i}].${field} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function nonEmptyString(value: unknown, field: string, i: number): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`findings[${i}].${field} must be a non-empty string`);
  }
  return value;
}

/** Validates the model's JSON against the findings format. Throws ValidationError. */
export function validateFindings(data: unknown): Finding[] {
  if (typeof data !== "object" || data === null || !Array.isArray((data as { findings?: unknown }).findings)) {
    throw new ValidationError('Expected an object with a "findings" array');
  }
  return (data as { findings: unknown[] }).findings.map((raw, i) => {
    if (typeof raw !== "object" || raw === null) throw new ValidationError(`findings[${i}] must be an object`);
    const o = raw as Record<string, unknown>;
    const type = oneOf(o.type, FINDING_TYPES, "type", i);
    const certainty = oneOf(o.certainty, CERTAINTIES, "certainty", i);
    const source = oneOf(o.source, SOURCES, "source", i);

    let turn_id: string | null = null;
    if (source === "transcript") {
      turn_id = nonEmptyString(o.turn_id, "turn_id", i);
      if (!/^T\d+$/.test(turn_id)) throw new ValidationError(`findings[${i}].turn_id must look like T05`);
    }

    return {
      type,
      certainty,
      source,
      turn_id,
      quote: nonEmptyString(o.quote, "quote", i),
      explanation: nonEmptyString(o.explanation, "explanation", i),
    };
  });
}

/** Parses model text as JSON (tolerating a markdown code fence) and validates it. */
export function parseModelOutput(text: string): Finding[] {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new ValidationError("Model output was not valid JSON");
  }
  return validateFindings(data);
}
