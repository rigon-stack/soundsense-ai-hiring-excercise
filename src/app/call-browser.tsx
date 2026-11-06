"use client";

import { useEffect, useState } from "react";
import type { Call } from "@/lib/types";

export function CallBrowser() {
  const [ids, setIds] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState("");

  function selectCall(id: string) {
    setCall(null);
    setError("");
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
        {call && <span className="muted">Call date: {call.date}</span>}
      </header>

      {error && <p role="alert" className="error">{error}</p>}

      <div className="grid">
        <section aria-labelledby="t-h">
          <h2 id="t-h">Transcript</h2>
          {!call && !error && <p className="muted">Loading…</p>}
          {call && (
            <ol className="turns">
              {call.turns.map((t, i) => (
                <li key={t.turnId || `raw-${i}`} data-turn={t.turnId} className={t.speaker === "Transcript note" ? "note" : undefined}>
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
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="s-h">
          <h2 id="s-h">Summary</h2>
          {call && <p className="summary">{call.summary}</p>}
        </section>

        {/* Reserved for findings (a later phase). */}
        <aside aria-label="Findings" className="findings" />
      </div>
    </main>
  );
}
