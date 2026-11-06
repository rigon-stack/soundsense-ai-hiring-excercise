# Collections Summary Reviewer

A web app that reviews an existing collections-call summary against its transcript and `summary-rules.txt`. It does not generate summaries.

Live site: https://creative-bavarois-15d6e8.netlify.app/

## Run it

```bash
npm install
cp .env.example .env.local   # fill in both values
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key. Server-side only, never `NEXT_PUBLIC_`. |
| `OPENROUTER_MODEL` | Model for reviews, e.g. `openrouter/auto`. |

`.env.local` is git-ignored. On Netlify, add the same two variables under Site configuration > Environment variables and redeploy.

## Check it

- `npm test` (26 tests), `npm run lint`, `npm run typecheck`, `npm run build`.
- In the app: pick a call, press **Review**. Expected results:
  - CALL-003: not passed, flags the arrears amount (£460).
  - CALL-014: not passed, flags the employer name (Cedar Lane Distribution).
  - CALL-016: not passed, flags the payment amount (£230).
  - CALL-019: not passed, flags that the agent called, the omitted consent, and the "after two" vs "2 pm" time (the last may come back as uncertain).
  - CALL-001: passed, no findings.
- API: `GET /api/calls`, `GET /api/calls/CALL-006`, `GET /api/calls/CALL-999` (404), `POST /api/calls/CALL-003/review`.

## How it works

1. Call data is imported into the server bundle, and `summary-rules.txt` is copied into `src/lib/rules.generated.ts` by `scripts/gen-rules.mjs` before dev, build, lint and test, so nothing is read from disk at runtime on Netlify.
2. The transcript is parsed into turn ID, timestamp, speaker and text. Unusual labels (`Mother`, `Father`, `Partner`, `Unclear speaker`, `Transcript note`) are kept, and unparseable lines are kept rather than dropped.
3. The prompt contains the call date, transcript, summary, the rules, and the README overrides (don't invent findings, "no DPA stated with agent", keep StepChange/Citizens Advice, redact private entities, relative dates, ignore hold hallucinations).
4. The model returns JSON findings (`type`, `certainty`, `source`, `turn_id`, `quote`, `explanation`). The reply is validated. An API failure, invalid JSON or invalid structure is retried once, then a clear error is returned. The key never appears in responses or errors.
5. Each quote is checked in code after normalising whitespace and curly quotes: transcript quotes must appear in the cited turn, summary quotes in the summary. Non-matching findings are kept and labelled **unverified**.
6. Status is computed in code: **Not passed** if at least one verified finding is definite, otherwise **Passed**. Uncertain and unverified findings are still shown.

## What I prioritised and why

- **Trustworthy findings over clever ones.** The model's output is never taken at face value: it is validated, and every quote is verified by code. Pass/fail is decided by code, not by the model.
- **Not silently losing evidence.** Unparseable lines and unmatched quotes are kept and labelled, not dropped.
- **A working deploy path early.** Data and rules are bundled so Netlify has no runtime file dependencies, and the key stays server-side.
- **Tests on the logic that matters:** the parser, finding validation and retry, quote verification and the status rule.

## Assumptions

- The summary rules and README overrides are the only standard to review against. There is no answer key.
- A "definite" finding is one the model is clear about; the model decides this, and the code only checks the quote.
- A quote that isn't found at the cited turn is unverified, even if the finding is otherwise right.
- The quote source is not forced by finding type. The prompt asks for the transcript on contradictions and omissions and the summary on rule breaches and unsupported claims, but a mismatch is accepted and left to quote verification. This was relaxed after the model's wrong labelling made a review fail.
- Call date is used to interpret relative dates such as "tomorrow".

## What I checked

- Unit tests, lint, typecheck and build all pass locally.
- All 20 calls open locally in the right order; unknown IDs return 404; CALL-006 shows `Mother` and CALL-012 shows `Father`.
- I ran all 20 reviews locally with `openrouter/auto`. The expected errors for CALL-003, 014, 016 and 019 were found and verified. Findings I read in full for CALL-008, 009, 012 and 013 were real errors in the summaries, not inventions.
- A bad API key returns a clear 502 after one retry, without exposing the key. The key does not appear in the page, client bundle or review response.
- On the live Netlify site, a review of CALL-001 returned "Passed".

## Known limitations

- **Speed and timeouts.** `openrouter/auto` picks a different model each time. Reviews took 3 to 62 seconds, and one run of CALL-004 timed out. A slow review plus the single retry can exceed Netlify's function time limit and come back as a bare 502. Free models were too slow and rate-limited to use.
- **Accuracy depends on the model.** I only read about four of the flagged calls closely. I did not verify that the five calls that passed locally (001, 004, 005, 006, 007) are truly accurate, and I did not read every other flagged call.
- **Exact quote matching.** A paraphrased quote is marked unverified even when the finding is right.
- **CALL-019 timing.** The "after two" vs "2 pm" error came back as uncertain, not definite.
- **Not checked:** the live site on CALL-003, the setup from a clean checkout, and the UI was not clicked through by me beyond the API.
- No login, database, uploads, saved history or audio.

## What I would do next

1. Fix the model and cap latency: pick a fast, fixed model, lower the per-call timeout, and use a background job or streaming so Netlify's limit doesn't matter.
2. Build a small answer key from the 20 calls and run it in CI to measure false positives and negatives instead of reading results by hand.
3. Fuzzy-match quotes, so a lightly paraphrased quote is still verified.
4. Cache reviews per call and model to avoid repeat cost and wait.
5. Show the highlighted quote inside the cited turn, and let a reviewer mark findings right or wrong.
