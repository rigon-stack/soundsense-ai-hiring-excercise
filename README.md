# Collections Summary Reviewer

A web app that reviews an existing collections-call summary against its transcript and `summary-rules.txt`. It does not generate summaries.

Live site: _add the Netlify URL here_

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key (server-side only; never prefix with `NEXT_PUBLIC_`) |
| `OPENROUTER_MODEL` | Model used for reviews, e.g. `openrouter/free` or a paid model ID |

`.env.local` is git-ignored. On Netlify, add the same two variables under Site configuration > Environment variables and redeploy.

Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm test`, `npm run typecheck`.

## Routes

- `GET /api/calls` – call IDs, sorted.
- `GET /api/calls/:id` – call date, parsed transcript turns and summary (404 for unknown IDs).
- `POST /api/calls/:id/review` – runs the review and returns `{ callId, status, findings }`.

## How the review works

1. The call data (`candidate-calls.json`) is imported into the server bundle, and `summary-rules.txt` is copied into `src/lib/rules.generated.ts` by `scripts/gen-rules.mjs` before dev/build/test, so nothing is read from disk at runtime.
2. The prompt contains the call date, transcript, summary, the summary rules and the README overrides (don't invent findings, "no DPA stated with agent", keep StepChange/Citizens Advice, redact private entities, relative dates, ignore hold hallucinations).
3. The model must reply with JSON findings (`type`, `certainty`, `source`, `turn_id`, `quote`, `explanation`). The reply is validated. A transcript quote needs a turn ID. The prompt tells the model to quote the transcript for `contradiction`/`omission` and the summary for `rule_breach`/`unsupported`, but a mismatch is not rejected: the quote check in step 5 decides whether the finding holds up.
4. An API failure, invalid JSON or invalid structure is retried once, then a clear error is returned. The API key is never included in responses or errors.
5. Each quote is checked in code (after normalising whitespace and curly quotes): transcript quotes must appear in the cited turn, summary quotes in the summary. Non-matching findings are kept but marked **unverified**.
6. Status is computed in code: **Not passed** if at least one verified finding is definite, otherwise **Passed**. Uncertain and unverified findings are still shown.

## Known limitations

- Free OpenRouter models (`openrouter/free`) are slow (roughly 10–60 s) and sometimes rate-limited. A slow review plus the single retry can exceed Netlify's function time limit. A paid, faster model is recommended for the live site.
- Quote verification is exact text matching after normalisation; a paraphrased quote is marked unverified even if the finding is right.
- Accuracy depends on the model. There is no answer key, so results should be read against the transcripts. The known errors to look for are listed in `plan.md` (Phase 5).
- No login, database, uploads, saved history or audio.
