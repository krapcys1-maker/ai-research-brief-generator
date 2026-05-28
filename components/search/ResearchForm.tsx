"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SourceOption = "mock" | "arxiv" | "semantic_scholar" | "openalex";

type ResearchFormProps = {
  examples: string[];
};

type QualityGatePayload = {
  coverage: "good" | "limited" | "poor";
  canSynthesize?: boolean;
  selectedPaperCount: number;
  livePaperCount: number;
  mockPaperCount: number;
  averageRelevance: number;
  warningCount: number;
  reasons: string[];
  suggestions: string[];
};

type PreflightPaper = {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  source: string;
  doi: string | null;
  url: string | null;
  relevanceScore: number | null;
  finalScore: number | null;
};

type PreflightPayload = {
  status: string;
  outputLanguage: string;
  queryVariants: string[];
  qualityGate: QualityGatePayload;
  searchSummary: {
    totalFound: number;
    totalAfterDeduplication: number;
    totalUsedInBrief: number;
    warnings: string[];
  };
  papers: PreflightPaper[];
};

const sourceOptions: { value: SourceOption; label: string }[] = [
  { value: "mock", label: "Mock" },
  { value: "arxiv", label: "arXiv" },
  { value: "semantic_scholar", label: "Semantic Scholar" },
  { value: "openalex", label: "OpenAlex" }
];

const progressSteps = [
  "Expanding query",
  "Searching academic sources",
  "Normalizing and deduplicating papers",
  "Ranking selected sources",
  "Checking research quality",
  "Generating structured brief",
  "Validating citations",
  "Saving result"
];

function formatScore(value: number | null) {
  return typeof value === "number" ? value.toFixed(2) : "N/A";
}

function SourcePreflightPanel({
  preflight,
  onUseSuggestion
}: {
  preflight: PreflightPayload;
  onUseSuggestion: (suggestion: string) => void;
}) {
  return (
    <section className="preflight-panel" aria-live="polite">
      <div className="preflight-header">
        <div>
          <h2>Source preflight</h2>
          <p>
            Coverage: <strong>{preflight.qualityGate.coverage}</strong>
          </p>
        </div>
        <span className="badge">
          {preflight.qualityGate.canSynthesize === false
            ? "review needed"
            : "ready"}
        </span>
      </div>

      <div className="preflight-metrics">
        <div>
          <span>Found</span>
          <strong>{preflight.searchSummary.totalFound}</strong>
        </div>
        <div>
          <span>After dedupe</span>
          <strong>{preflight.searchSummary.totalAfterDeduplication}</strong>
        </div>
        <div>
          <span>Selected</span>
          <strong>{preflight.searchSummary.totalUsedInBrief}</strong>
        </div>
        <div>
          <span>Avg relevance</span>
          <strong>{preflight.qualityGate.averageRelevance.toFixed(2)}</strong>
        </div>
      </div>

      {preflight.qualityGate.reasons.length ? (
        <div className="preflight-block">
          <h3>Quality notes</h3>
          <ul>
            {preflight.qualityGate.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preflight.qualityGate.suggestions.length ? (
        <div className="preflight-block">
          <h3>Suggested next queries</h3>
          <div className="preflight-suggestion-list">
            {preflight.qualityGate.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onUseSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="preflight-block">
        <h3>Top papers</h3>
        {preflight.papers.length ? (
          <div className="preflight-paper-list">
            {preflight.papers.slice(0, 5).map((paper) => (
              <article key={paper.id}>
                <span className="badge">{paper.source}</span>
                <h4>{paper.title}</h4>
                <p>
                  {paper.authors.slice(0, 3).join(", ")}
                  {paper.year ? ` (${paper.year})` : ""}
                </p>
                <p>
                  Relevance {formatScore(paper.relevanceScore)} - Final{" "}
                  {formatScore(paper.finalScore)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p>No papers passed the current quality threshold.</p>
        )}
      </div>

      {preflight.searchSummary.warnings.length ? (
        <div className="preflight-block">
          <h3>Warnings</h3>
          <ul>
            {preflight.searchSummary.warnings.slice(0, 5).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function ResearchForm({ examples }: ResearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(examples[0] ?? "");
  const [maxPapers, setMaxPapers] = useState(10);
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [sources, setSources] = useState<SourceOption[]>([
    "mock",
    "arxiv",
    "openalex"
  ]);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"error" | "warning">("error");
  const [qualityGate, setQualityGate] = useState<QualityGatePayload | null>(null);
  const [preflight, setPreflight] = useState<PreflightPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSources, setCheckingSources] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const busy = loading || checkingSources;

  useEffect(() => {
    if (!loading) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgressStep((current) =>
        Math.min(current + 1, progressSteps.length - 1)
      );
    }, 3500);

    return () => window.clearInterval(interval);
  }, [loading]);

  function toggleSource(source: SourceOption) {
    setSources((current) => {
      if (current.includes(source)) {
        const next = current.filter((item) => item !== source);
        return next.length ? next : current;
      }

      return [...current, source];
    });
  }

  function getRequestPayload() {
    return {
      query,
      maxPapers,
      sources,
      fromYear: fromYear ? Number(fromYear) : undefined,
      toYear: toYear ? Number(toYear) : undefined
    };
  }

  function applySuggestion(suggestion: string) {
    setQuery(suggestion.replace(/^Try this broader query:\s*/i, ""));
    setPreflight(null);
    setError(null);
    setQualityGate(null);
  }

  async function checkSources() {
    setError(null);
    setQualityGate(null);
    setPreflight(null);
    setErrorKind("error");
    setCheckingSources(true);

    try {
      const response = await fetch("/api/briefs/preflight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(getRequestPayload())
      });
      const payload = (await response.json()) as PreflightPayload & {
        error?: string;
      };

      if (!response.ok || payload.status !== "completed") {
        throw new Error(payload.error ?? "Source preflight failed.");
      }

      setPreflight(payload);
      if (payload.qualityGate.coverage === "poor") {
        setErrorKind("warning");
        setQualityGate(payload.qualityGate);
        setError(
          payload.qualityGate.reasons[0] ??
            "The selected sources are too weak for a reliable brief."
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Source preflight failed unexpectedly."
      );
    } finally {
      setCheckingSources(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setQualityGate(null);
    setPreflight(null);
    setErrorKind("error");
    setProgressStep(0);
    setLoading(true);

    try {
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(getRequestPayload())
      });

      const payload = (await response.json()) as {
        briefId?: string;
        error?: string;
        status?: string;
        qualityGate?: QualityGatePayload;
      };

      if (!response.ok || !payload.briefId) {
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          setErrorKind("warning");
          throw new Error(
            retryAfter
              ? `Too many generation requests. Try again in about ${retryAfter} seconds.`
              : "Too many generation requests. Try again shortly."
          );
        }

        if (response.status === 422 && payload.qualityGate) {
          setErrorKind("warning");
          setQualityGate(payload.qualityGate);
          throw new Error(payload.error ?? "The selected sources are too weak for a reliable brief.");
        }

        throw new Error(payload.error ?? "Brief generation failed.");
      }

      router.push(`/briefs/${payload.briefId}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Brief generation failed unexpectedly."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="research-grid">
      <form className="surface research-form" onSubmit={onSubmit}>
        <label className="form-field">
          <span className="form-label">Research query</span>
          <textarea
            className="form-control form-textarea"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={busy}
            minLength={3}
            maxLength={300}
            required
            rows={5}
          />
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span className="form-label">Max papers</span>
            <select
              className="form-control"
              value={maxPapers}
              onChange={(event) => setMaxPapers(Number(event.target.value))}
              disabled={busy}
            >
              <option value={10}>10 papers</option>
              <option value={15}>15 papers</option>
              <option value={20}>20 papers</option>
              <option value={30}>30 papers</option>
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">From year</span>
            <input
              className="form-control"
              value={fromYear}
              onChange={(event) => setFromYear(event.target.value)}
              disabled={busy}
              inputMode="numeric"
              placeholder="2020"
              min={1900}
              max={2100}
              type="number"
            />
          </label>

          <label className="form-field">
            <span className="form-label">To year</span>
            <input
              className="form-control"
              value={toYear}
              onChange={(event) => setToYear(event.target.value)}
              disabled={busy}
              inputMode="numeric"
              placeholder="2026"
              min={1900}
              max={2100}
              type="number"
            />
          </label>
        </div>

        <fieldset className="source-fieldset">
          <legend>Sources</legend>
          <div className="source-option-grid">
            {sourceOptions.map((source) => (
              <label
                key={source.value}
                className={
                  sources.includes(source.value)
                    ? "source-option is-selected"
                    : "source-option"
                }
              >
                <input
                  type="checkbox"
                  checked={sources.includes(source.value)}
                  disabled={busy}
                  onChange={() => toggleSource(source.value)}
                />
                <span>{source.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <div className={`form-alert ${errorKind}`} role="alert">
            <strong>
              {qualityGate
                ? "Research quality gate"
                : errorKind === "warning"
                  ? "Rate limit"
                  : "Generation error"}
            </strong>
            <span>{error}</span>
            {qualityGate ? (
              <div className="quality-gate-alert">
                <div className="quality-gate-metrics">
                  <span>Coverage: {qualityGate.coverage}</span>
                  <span>Papers: {qualityGate.selectedPaperCount}</span>
                  <span>Live: {qualityGate.livePaperCount}</span>
                  <span>Avg relevance: {qualityGate.averageRelevance.toFixed(2)}</span>
                </div>
                {qualityGate.reasons.length ? (
                  <ul>
                    {qualityGate.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
                {qualityGate.suggestions.length ? (
                  <div className="quality-gate-suggestions">
                    <strong>Try next</strong>
                    <div>
                      {qualityGate.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => applySuggestion(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="progress-panel" aria-live="polite">
            <div className="progress-header">
              <span>Pipeline progress</span>
              <strong>
                Step {progressStep + 1} of {progressSteps.length}
              </strong>
            </div>
            <ol className="progress-steps">
              {progressSteps.map((step, index) => (
                <li
                  key={step}
                  className={
                    index < progressStep
                      ? "is-complete"
                      : index === progressStep
                        ? "is-active"
                        : ""
                  }
                >
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {preflight ? (
          <SourcePreflightPanel
            preflight={preflight}
            onUseSuggestion={applySuggestion}
          />
        ) : null}

        <div className="form-actions">
          <button
            type="button"
            disabled={busy}
            className="secondary-action"
            onClick={checkSources}
          >
            {checkingSources ? "Checking..." : "Check Sources"}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="primary-action"
          >
            {loading ? "Generating..." : "Generate Brief"}
          </button>
        </div>
      </form>

      <aside className="surface example-panel">
        <div>
          <h2>Example queries</h2>
          <p>Use one as a starting point or paste your own topic.</p>
        </div>
        <div className="example-list">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuery(example)}
              disabled={busy}
              className="example-button"
            >
              {example}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
