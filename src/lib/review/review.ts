import "server-only";
import type { Call } from "../types";
import { buildMessages } from "./prompt";
import { callOpenRouter, ReviewError, type ModelCaller } from "./openrouter";
import { parseModelOutput, ValidationError, type Finding } from "./schema";

/**
 * Runs the review. On an API failure or invalid JSON/structure, retries once;
 * a second failure becomes a clear ReviewError.
 */
export async function reviewCall(call: Call, caller: ModelCaller = callOpenRouter): Promise<Finding[]> {
  const messages = buildMessages(call);
  let lastError: ReviewError | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return parseModelOutput(await caller(messages));
    } catch (e) {
      if (e instanceof ReviewError) {
        // Missing configuration won't be fixed by retrying.
        if (e.status === 500) throw e;
        lastError = e;
      } else if (e instanceof ValidationError) {
        lastError = new ReviewError(`The model returned an invalid review (${e.message}).`, 502);
      } else {
        lastError = new ReviewError("The review failed unexpectedly.", 502);
      }
    }
  }
  throw lastError ?? new ReviewError("The review failed.", 502);
}
