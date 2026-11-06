import "server-only";

export class ReviewError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type ChatMessage = { role: string; content: string };
/** Returns the model's text reply. Swappable in tests. */
export type ModelCaller = (messages: ChatMessage[]) => Promise<string>;

// Free models can take 10-60s. The timeout covers reading the whole body, since
// OpenRouter sends keep-alive whitespace before the result.
const TIMEOUT_MS = 45_000;

/** Calls OpenRouter. The API key is read here only and never included in errors. */
export const callOpenRouter: ModelCaller = async (messages) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) {
    throw new ReviewError("The review service is not configured on the server.", 500);
  }

  let res: Response;
  let body: { choices?: { message?: { content?: unknown } }[] } | null;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new ReviewError(`The model provider returned an error (HTTP ${res.status}).`, 502);
    }
    body = await res.json().catch((e) => {
      if (e instanceof DOMException && e.name === "TimeoutError") throw e;
      return null;
    });
  } catch (e) {
    if (e instanceof ReviewError) throw e;
    throw new ReviewError("Could not reach the model provider (network error or timeout).", 502);
  }

  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new ReviewError("The model provider returned an empty response.", 502);
  }
  return content;
};
