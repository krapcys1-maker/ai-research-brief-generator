"use client";

import { useEffect, useState } from "react";

type SourceHealthResponse = {
  cache: {
    active: number;
    expired: number;
    total: number;
  };
  sourceHealth: {
    totalDiagnostics: number;
    bySource: {
      source: string;
      success: number;
      empty: number;
      failed: number;
      cached: number;
      lastStatus: "success" | "empty" | "failed";
      lastMessage: string | null;
    }[];
  };
  recentDiagnostics: {
    source: string;
    query: string;
    status: "success" | "empty" | "failed";
    resultCount: number;
    cached: boolean;
    message?: string;
  }[];
};

export function SourceHealthPanel() {
  const [data, setData] = useState<SourceHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const response = await fetch("/api/source-cache");
        const payload = (await response.json()) as SourceHealthResponse;

        if (!response.ok) {
          throw new Error("Could not load source health.");
        }

        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load source health."
          );
        }
      }
    }

    void loadHealth();
    const interval = window.setInterval(loadHealth, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <aside className="surface source-health" aria-live="polite">
      <div className="source-health-header">
        <div>
          <h2>Source health</h2>
          <p>Cache and recent adapter diagnostics for this dev process.</p>
        </div>
        <span className="badge">{data ? "live" : "loading"}</span>
      </div>

      {error ? (
        <div className="source-health-error">{error}</div>
      ) : null}

      <div className="source-health-metrics">
        <div>
          <span>Active cache</span>
          <strong>{data?.cache.active ?? 0}</strong>
        </div>
        <div>
          <span>Total cache</span>
          <strong>{data?.cache.total ?? 0}</strong>
        </div>
        <div>
          <span>Diagnostics</span>
          <strong>{data?.sourceHealth.totalDiagnostics ?? 0}</strong>
        </div>
      </div>

      <div className="source-health-grid">
        {(data?.sourceHealth.bySource ?? []).map((source) => (
          <article key={source.source}>
            <div className="source-health-source">
              <strong>{source.source}</strong>
              <span className="badge">{source.lastStatus}</span>
            </div>
            <dl>
              <div>
                <dt>success</dt>
                <dd>{source.success}</dd>
              </div>
              <div>
                <dt>empty</dt>
                <dd>{source.empty}</dd>
              </div>
              <div>
                <dt>failed</dt>
                <dd>{source.failed}</dd>
              </div>
              <div>
                <dt>cached</dt>
                <dd>{source.cached}</dd>
              </div>
            </dl>
            {source.lastMessage ? <p>{source.lastMessage}</p> : null}
          </article>
        ))}
      </div>

      {data && !data.sourceHealth.bySource.length ? (
        <p className="source-health-empty">
          No source diagnostics yet. Generate a brief to populate this panel.
        </p>
      ) : null}

      {data?.recentDiagnostics.length ? (
        <div>
          <h3>Recent diagnostics</h3>
          <div className="source-health-recent">
            {data.recentDiagnostics.slice(0, 5).map((item, index) => (
              <div key={`${item.source}:${item.query}:${index}`}>
                <span className="badge">{item.source}</span>
                <span>{item.status}</span>
                <strong>{item.resultCount}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
