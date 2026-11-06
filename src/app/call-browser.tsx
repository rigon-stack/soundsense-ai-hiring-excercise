"use client";

import { useEffect, useRef, useState } from "react";
import type { Call } from "@/lib/types";
import type { ReviewResult } from "@/lib/review/verify";

const TYPE_LABEL: Record<string, string> = {
  contradiction: "Contradiction",
  unsupported: "Unsupported",
  omission: "Omission",
  rule_breach: "Rule breach",
};

export function CallBrowser() {
  const [ids, setIds] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [highlight, setHighlight] = useState("");
  // Bumped on every call switch so a slow review for a previous call is ignored.
  const reviewToken = useRef(0);

  function selectCall(id: string) {
    reviewToken.current++;
    setCall(null);
    setError("");
    setReview(null);
    setReviewError("");
    setReviewing(false);
    setHighlight("");
    setSelected(id);
  }

  useEffect(() => {
    fetch("/api/calls")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { calls: string[] }) => {
        setIds(d.calls);
        if (d.calls.length) setSelected(d.calls[0]);
        else setError("No calls available.");
      })
      .catch((e) => setError(`Could not load calls: ${e.message}`));
  }, []);

  useEffect(() => {
    if (!selected) return;
    let stale = false;
    fetch(`/api/calls/${encodeURIComponent(selected)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Call) => !stale && setCall(d))
      .catch((e) => !stale && setError(`Could not load ${selected}: ${e.message}`));
    return () => {
      stale = true;
    };
  }, [selected]);

  async function runReview() {
    if (!selected) return;
    const token = ++reviewToken.current;
    setReviewing(true);
    setReview(null);
    setReviewError("");
    setHighlight("");
    try {
      const res = await fetch(`/api/calls/${encodeURIComponent(selected)}/review`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (token !== reviewToken.current) return;
      if (!res.ok) throw new Error(body?.error ?? `Review failed (HTTP ${res.status})`);
      setReview(body as ReviewResult);
    } catch (e) {
      if (token === reviewToken.current) setReviewError(e instanceof Error ? e.message : "Review failed");
    } finally {
      if (token === reviewToken.current) setReviewing(false);
    }
  }

  function focusTurn(turnId: string | null) {
    if (!turnId) return;
    setHighlight(turnId);
    document.querySelector(`[data-turn="${turnId}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  return (
    <main>
      <header className="top">
        <h1>Collections Summary Reviewer</h1>
        <label>
          Call{" "}
          <select value={selected} onChange={(e) => selectCall(e.target.value)} aria-label="Call">
            {ids.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <button onClick={runReview} disabled={!call || reviewing}>
          {reviewing ? "Reviewing…" : "Review"}
        </button>
        {call && <span className="muted">Call date: {call.date}</span>}
      </header>

      {error && <p role="alert" className="error">{error}</p>}

      <div className="grid">
        <section aria-labelledby="t-h">
          <h2 id="t-h">Transcript</h2>
          {!call && !error && <p className="muted">Loading…</p>}
          {call && (
            <ol className="turns">
              {call.turns.map((t, i) => {
                const cls = [t.speaker === "Transcript note" ? "note" : "", t.turnId && t.turnId === highlight ? "hl" : ""]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <li key={t.turnId || `raw-${i}`} data-turn={t.turnId} className={cls || undefined}>
                    {t.unparsed ? (
                      <span className="raw">{t.text}</span>
                    ) : (
                      <>
                        <span className="meta">
                          {t.turnId} · {t.timestamp}
                        </span>{" "}
                        <strong className="speaker">{t.speaker}</strong> {t.text}
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="s-h">
          <h2 id="s-h">Summary</h2>
          {call && <p className="summary">{call.summary}</p>}
        </section>

        <aside aria-label="Findings" aria-live="polite" className="findings">
          <h2>Review</h2>
          {reviewing && <p className="muted">Reviewing… this can take up to a minute.</p>}
          {reviewError && <p role="alert" className="error">{reviewError}</p>}
          {!review && !reviewing && !reviewError && <p className="muted">Press Review to check this summary.</p>}
          {review && (
            <>
              <p className={`status ${review.status}`}>{review.status === "passed" ? "Passed" : "Not passed"}</p>
              {review.findings.length === 0 && <p className="muted">No findings.</p>}
              <ul className="finding-list">
                {review.findings.map((f, i) => (
                  <li key={`${f.type}-${f.turn_id ?? "summary"}-${i}`} className={`finding ${f.certainty} ${f.verified ? "" : "unverified"}`}>
                    <div className="badges">
                      <span className="badge">{TYPE_LABEL[f.type] ?? f.type}</span>
                      <span className={`badge ${f.certainty}`}>{f.certainty === "definite" ? "Definite" : "Uncertain"}</span>
                      {!f.verified && <span className="badge unverified-badge">Unverified</span>}
                    </div>
                    <p className="evidence">
                      Evidence: {f.source === "transcript" ? "transcript" : "summary"}
                      {f.turn_id && (
                        <>
                          {" "}
                          <button className="link" onClick={() => focusTurn(f.turn_id)}>
                            {f.turn_id}
                          </button>
                        </>
                      )}
                    </p>
                    <blockquote>{f.quote}</blockquote>
                    <p>{f.explanation}</p>
                    {!f.verified && <p className="muted">The quote could not be found at the cited location.</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
