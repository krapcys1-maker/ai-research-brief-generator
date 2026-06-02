"use client";

import { useCallback, useEffect, useState } from "react";

type SourceHealthResponse = {
  persistence: {
    mode: "memory" | "postgresql";
    hasDatabaseUrl: boolean;
    hasValidPostgresUrl: boolean;
    isProduction: boolean;
    allowsMemoryStorage: boolean;
    fatalError: string | null;
    warning: string | null;
  };
  cache: {
    active: number;
    expired: number;
    total: number;
    memory?: {
      active: number;
      expired: number;
      total: number;
    };
    persistent?: {
      active: number;
      expired: number;
      total: number;
    };
  };
  embeddingHealth: {
    provider: "local" | "openai_compatible" | "unsupported";
    configuredProvider: string;
    usesLocalFallback: boolean;
    ready: boolean;
    missing: string[];
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
  aiSynthesisHealth: {
    totalDiagnostics: number;
    success: number;
    retry: number;
    fallback: number;
    providerError: number;
    validationError: number;
    configurationError: number;
    fallbackRate: number;
    lastStatus:
      | "success"
      | "retry"
      | "fallback"
      | "provider_error"
      | "validation_error"
      | "configuration_error"
      | null;
    lastMessage: string | null;
    byProvider: {
      provider: string;
      success: number;
      retry: number;
      fallback: number;
      providerError: number;
      validationError: number;
      configurationError: number;
      lastStatus:
        | "success"
        | "retry"
        | "fallback"
        | "provider_error"
        | "validation_error"
        | "configuration_error";
      lastMessage: string | null;
    }[];
  };
  recentAiSynthesisDiagnostics: {
    query: string;
    provider: string;
    status:
      | "success"
      | "retry"
      | "fallback"
      | "provider_error"
      | "validation_error"
      | "configuration_error";
    attemptCount: number;
    paperCount: number;
    message?: string;
    createdAt: string;
  }[];
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/source-cache");
      const payload = (await response.json()) as SourceHealthResponse;

      if (!response.ok) {
        throw new Error("Could not load source health.");
      }

      setData(payload);
      setError(null);
      setLastUpdatedAt(new Date().toLocaleTimeString());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load source health."
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHealthIfActive() {
      try {
        const response = await fetch("/api/source-cache");
        const payload = (await response.json()) as SourceHealthResponse;

        if (!response.ok) {
          throw new Error("Could not load source health.");
        }

        if (!cancelled) {
          setData(payload);
          setError(null);
          setLastUpdatedAt(new Date().toLocaleTimeString());
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

    void loadHealthIfActive();
    const interval = window.setInterval(loadHealthIfActive, 15000);

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
        <div className="source-health-actions">
          {lastUpdatedAt ? (
            <span className="source-health-updated">{lastUpdatedAt}</span>
          ) : null}
          <span className="badge">
            {isRefreshing ? "refreshing" : data ? "live" : "loading"}
          </span>
          <button
            type="button"
            className="source-health-refresh"
            disabled={isRefreshing}
            onClick={() => {
              void loadHealth();
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="source-health-error">{error}</div>
      ) : null}

      <div className="source-health-metrics">
        <div>
          <span>Storage mode</span>
          <strong>{data?.persistence.mode ?? "memory"}</strong>
        </div>
        <div>
          <span>Primary cache</span>
          <strong>{data?.cache.active ?? 0}</strong>
        </div>
        <div>
          <span>Persistent cache</span>
          <strong>{data?.cache.persistent?.active ?? 0}</strong>
        </div>
        <div>
          <span>Memory cache</span>
          <strong>{data?.cache.memory?.active ?? 0}</strong>
        </div>
        <div>
          <span>Total primary</span>
          <strong>{data?.cache.total ?? 0}</strong>
        </div>
        <div>
          <span>Diagnostics</span>
          <strong>{data?.sourceHealth.totalDiagnostics ?? 0}</strong>
        </div>
        <div>
          <span>Embeddings</span>
          <strong>
            {data?.embeddingHealth.usesLocalFallback
              ? "local"
              : data?.embeddingHealth.ready
                ? "model"
                : "missing"}
          </strong>
        </div>
        <div>
          <span>AI fallback</span>
          <strong>{data?.aiSynthesisHealth.fallback ?? 0}</strong>
        </div>
        <div>
          <span>AI failures</span>
          <strong>
            {data
              ? data.aiSynthesisHealth.providerError +
                data.aiSynthesisHealth.validationError +
                data.aiSynthesisHealth.configurationError
              : 0}
          </strong>
        </div>
      </div>

      {data?.persistence.warning ? (
        <div className="source-health-error">{data.persistence.warning}</div>
      ) : null}

      {data?.embeddingHealth ? (
        <div
          className={
            data.embeddingHealth.usesLocalFallback || !data.embeddingHealth.ready
              ? "source-health-warning"
              : "source-health-good"
          }
        >
          <strong>Embedding provider: {data.embeddingHealth.configuredProvider}</strong>
          <p>
            {data.embeddingHealth.usesLocalFallback
              ? "Using local hash-ngram embeddings. Configure an OpenAI-compatible provider for production retrieval quality."
              : data.embeddingHealth.ready
                ? "Model-grade embedding configuration is present. Run npm run embedding:check after deploy to verify vector shape."
                : `Missing embedding configuration: ${data.embeddingHealth.missing.join(", ")}`}
          </p>
        </div>
      ) : null}

      <div className="ai-health-panel">
        <div className="ai-health-header">
          <div>
            <h3>AI synthesis health</h3>
            <p>Recent structured synthesis outcomes and fallback frequency.</p>
          </div>
          <span className="badge">
            {data
              ? `${Math.round(data.aiSynthesisHealth.fallbackRate * 100)}% fallback`
              : "loading"}
          </span>
        </div>
        <div className="ai-health-grid">
          <div>
            <span>success</span>
            <strong>{data?.aiSynthesisHealth.success ?? 0}</strong>
          </div>
          <div>
            <span>retry</span>
            <strong>{data?.aiSynthesisHealth.retry ?? 0}</strong>
          </div>
          <div>
            <span>fallback</span>
            <strong>{data?.aiSynthesisHealth.fallback ?? 0}</strong>
          </div>
          <div>
            <span>provider</span>
            <strong>{data?.aiSynthesisHealth.providerError ?? 0}</strong>
          </div>
          <div>
            <span>validation</span>
            <strong>{data?.aiSynthesisHealth.validationError ?? 0}</strong>
          </div>
          <div>
            <span>config</span>
            <strong>{data?.aiSynthesisHealth.configurationError ?? 0}</strong>
          </div>
        </div>
        {data?.aiSynthesisHealth.byProvider.length ? (
          <div className="ai-health-providers">
            {data.aiSynthesisHealth.byProvider.map((provider) => (
              <article key={provider.provider}>
                <div className="source-health-source">
                  <strong>{provider.provider}</strong>
                  <span className="badge">{provider.lastStatus}</span>
                </div>
                <dl>
                  <div>
                    <dt>success</dt>
                    <dd>{provider.success}</dd>
                  </div>
                  <div>
                    <dt>fallback</dt>
                    <dd>{provider.fallback}</dd>
                  </div>
                  <div>
                    <dt>errors</dt>
                    <dd>
                      {provider.providerError +
                        provider.validationError +
                        provider.configurationError}
                    </dd>
                  </div>
                </dl>
                {provider.lastMessage ? <p>{provider.lastMessage}</p> : null}
              </article>
            ))}
          </div>
        ) : null}
        {data && !data.aiSynthesisHealth.totalDiagnostics ? (
          <p className="source-health-empty">
            No AI synthesis diagnostics yet. Generate a brief to populate this panel.
          </p>
        ) : null}
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

      {data?.recentAiSynthesisDiagnostics.length ? (
        <div>
          <h3>Recent AI synthesis</h3>
          <div className="source-health-recent">
            {data.recentAiSynthesisDiagnostics.slice(0, 5).map((item, index) => (
              <div key={`${item.provider}:${item.createdAt}:${index}`}>
                <span className="badge">{item.provider}</span>
                <span>{item.status}</span>
                <strong>{item.attemptCount}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
