"use client";

import { useEffect, useState } from "react";

type BriefHistoryItem = {
  id: string;
  title: string;
  query: string;
  generatedAt: string;
  outputLanguage: string;
};

export function BriefHistoryPanel() {
  const [briefs, setBriefs] = useState<BriefHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const response = await fetch("/api/briefs");
        const payload = (await response.json()) as {
          briefs?: BriefHistoryItem[];
        };

        if (!response.ok) {
          throw new Error("Could not load brief history.");
        }

        if (!cancelled) {
          setBriefs(payload.briefs ?? []);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load brief history."
          );
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="surface brief-history">
      <div className="brief-history-header">
        <div>
          <h2>Recent briefs</h2>
          <p>Loaded from the active brief repository.</p>
        </div>
        <span className="badge">{briefs.length}</span>
      </div>

      {error ? <div className="source-health-error">{error}</div> : null}

      {briefs.length ? (
        <div className="brief-history-list">
          {briefs.slice(0, 6).map((brief) => (
            <a href={`/briefs/${brief.id}`} key={brief.id}>
              <span className="badge">{brief.outputLanguage}</span>
              <strong>{brief.title}</strong>
              <span>{brief.query}</span>
              <time dateTime={brief.generatedAt}>
                {new Date(brief.generatedAt).toLocaleString()}
              </time>
            </a>
          ))}
        </div>
      ) : (
        <p className="source-health-empty">
          No briefs yet. Generate one from mock or live sources to start the
          history.
        </p>
      )}
    </aside>
  );
}
