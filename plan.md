# Collections Summary Reviewer: Plan

## Goal

A web app where a user picks a call and gets a review of its existing summary against the transcript and `summary-rules.txt`. The app does not generate summaries.

Data lives in `soundsense-exercise-data/`.

## How we work

Run this loop for each phase, and only start the next phase after shipping the current one:

1. Build in the build session.
2. Review the diff in the review session.
3. Hand test using the phase's "Hand test" list.
4. Clean? Ship it to Netlify and check the live site. Not clean? Tell the build session what to fix, then repeat from step 2.

## Decisions

- **Stack:** Next.js with TypeScript; one app for the screen and routes.
- **Hosting:** Netlify.
- **Model:** called through OpenRouter, with the API key and model name set as described under "Keys and deployment".
- **Data:** read from `candidate-calls.json`; no database.
- **Rules:** send `summary-rules.txt` plus the README's review scope and overrides (below) to the model.

## Keys and deployment

The same two variables must exist in both places:

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Model used for reviews |

- **Local:** put the values in `.env.local`. It must be in `.gitignore` and never committed.
- **Live:** add the same variables in Netlify's environment variables, then redeploy so they take effect.
- **Template:** commit `.env.example` with the variable names and no values.
- **Server-side only:** read the key only in server code, and never prefix it with `NEXT_PUBLIC_`.
- **Data files:** the calls and rules must be included in the deployed build, so bundle them with the server code rather than relying on files being present at runtime.

## Review requirements

Each finding contains:

| Field | Values |
|---|---|
| `type` | `contradiction`, `unsupported`, `omission`, `rule_breach` |
| `certainty` | `definite`, `uncertain` |
| `source` | `transcript`, `summary` |
| `turn_id` | Transcript turn such as `T05`; required when `source` is `transcript` |
| `quote` | Exact text from the source |
| `explanation` | Short reason |

Quote source by type:

- `contradiction`, `omission`: quote the transcript.
- `rule_breach`, `unsupported`: quote the summary.

Result status:

- **Not passed:** at least one verified definite finding.
- **Passed:** no verified definite findings. Any uncertain or unverified findings are still shown.

README overrides the model must follow:

- Some summaries are accurate, so never invent a finding.
- A missing category is only an omission if it was discussed and the rules require it.
- Report missing verification as "no DPA stated with agent". This is an exception to the general omission rule.
- Keep named advice bodies such as Citizens Advice and StepChange; redact employers, garages and other private entities.
- Use the call date to interpret relative dates such as "tomorrow".
- Transcription imperfections are intentional, and hold or silence hallucinations must be ignored.

## Routes

- `GET /api/calls`: lists call IDs for the picker, sorted by ID.
- `GET /api/calls/:id`: returns the call's date, parsed transcript turns and summary.
- `POST /api/calls/:id/review`: runs the review and returns the status and findings.

## Screen

- Call picker at the top.
- Transcript and summary below it.
- Passed/not passed status and findings beside them.

## Phases

### Phase 1: Browse calls (about 15 min)

- Set up the Next.js app.
- Add `.env.local`, `.env.example` and the `.gitignore` entry.
- Connect the site to Netlify and add both environment variables.
- Load the calls and parse each transcript into turn ID, timestamp, speaker and text. Keep labels such as `Mother`, `Unclear speaker` and `Transcript note`.
- Add `GET /api/calls` and `GET /api/calls/:id`.
- Build the picker, transcript and summary views.

**Hand test**

- All 20 calls appear in order and each one opens.
- CALL-006 shows the `Mother` label and CALL-012 shows `Father`.
- An unknown call ID returns a 404.
- `git status` doesn't show `.env.local`.
- All of the above also works on the live Netlify site.

### Phase 2: Review a call (about 25 min)

- Add `POST /api/calls/:id/review`, calling OpenRouter with the transcript, summary, rules and review requirements.
- Validate the JSON and its structure against the findings format.
- If the JSON or structure is invalid, or the API call fails, retry once. If it fails again, return a clear error.

**Hand test**

- Reviewing CALL-003 returns valid findings, including the arrears amount.
- A bad API key returns a clear error after one retry, without crashing or exposing the key.
- Reviewing CALL-003 also works on the live Netlify site, which proves the Netlify keys work.
- The API key doesn't appear in the browser's network responses or page source.

### Phase 3: Check each quote (about 10 min)

- Normalise whitespace and curly quotes before matching.
- For transcript quotes, confirm the quote appears in the cited turn. For summary quotes, confirm it appears in the summary.
- Mark a finding `unverified` if its quote doesn't match. Never remove it silently.
- Calculate passed/not passed in code using the status rule above.

**Hand test**

- Automated tests cover: a matching quote, a wrong turn ID, an invented quote and a curly-quote difference.
- An unverified definite finding does not cause "not passed".

### Phase 4: Show the review (about 15 min)

- Add a Review button with loading and error states.
- Show the status and findings, with type, certainty, evidence, quote and explanation.
- Clearly label uncertain and unverified findings.
- If time allows: clicking a finding highlights its cited turn.

**Hand test**

- Findings match the route's response, and a failed review shows the error on screen.
- Switching calls clears the previous review.

### Phase 5: Check accuracy and finish (about 15 min)

- Review all 20 calls and read the results against the transcripts.
- Adjust the prompt if needed.
- Write a README covering setup, environment variables, how the review works, known limitations and the live site link.

**Hand test** (each call must flag the listed error):

| Call | Expected finding |
|---|---|
| CALL-003 | States a banned arrears amount, "£460" |
| CALL-014 | Names an employer, "Cedar Lane Distribution" |
| CALL-016 | States a banned payment amount, "£230" |
| CALL-019 | Says the customer called, but the agent called (T01) |
| CALL-019 | Omits "Consent gained to record vulnerability" (T09–T10) |
| CALL-019 | Says "at 2 pm", but "after two" was agreed (T15, T22) |

- Confirm that calls which look accurate don't get invented errors.
- Follow the README from a clean checkout to confirm the setup works.
- Repeat a few reviews on the live site, and watch for Netlify function timeouts on slower model responses.

## Out of scope

- Generating or rewriting summaries.
- Logins, a database, uploads and saved review history.
- Audio.

## Open items

- The full hiring challenge brief isn't in the pack. Check its delivery requirements against this plan before Phase 1.
- There's no answer key, so Phase 5 accuracy relies on the known errors and reading the results by hand.
