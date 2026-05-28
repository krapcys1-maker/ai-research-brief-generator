"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDoi, getDoiUrl } from "@/lib/sources/doi";

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
  insight?: {
    role: string;
    whyRead: string;
    strengths: string[];
    limitations: string[];
    queryAlignment?: {
      label: string;
      titleScore: number;
      abstractScore: number;
      combinedScore: number;
      matchedTerms: string[];
      missingTerms: string[];
    };
  };
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

function getQualityGateCopy(qualityGate: QualityGatePayload) {
  if (qualityGate.canSynthesize === false || qualityGate.coverage === "poor") {
    return {
      title: "Not enough evidence",
      summary:
        "The selected sources do not give enough support for a reliable brief yet."
    };
  }

  if (qualityGate.coverage === "good") {
    return {
      title: "Sources look good",
      summary: "The selected papers look strong enough for a grounded brief."
    };
  }

  return {
    title: "Limited evidence",
    summary:
      "The selected papers are usable, but the final brief should be checked carefully."
  };
}

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

function getPreflightCopy(preflight: PreflightPayload) {
  const { qualityGate } = preflight;

  if (qualityGate.canSynthesize === false || qualityGate.coverage === "poor") {
    return {
      title: "Not enough evidence yet",
      badge: "revise topic",
      summary:
        "The current source set is too weak for a reliable brief. Try a broader query or enable more sources before generating.",
      tone: "poor" as const
    };
  }

  if (qualityGate.coverage === "good") {
    return {
      title: "Looks ready",
      badge: "ready",
      summary:
        "The selected papers look strong enough to generate a source-grounded brief.",
      tone: "good" as const
    };
  }

  return {
    title: "Usable with caution",
    badge: "limited",
    summary:
      "The app found usable papers, but the brief may need extra source checking.",
    tone: "limited" as const
  };
}

function formatPreflightWarning(warning: string) {
  if (warning.includes("mock/demo records")) {
    return "Only demo/mock papers were selected even though live sources were requested.";
  }

  if (warning.includes("weak lexical relevance")) {
    return "Some selected papers may only loosely match the query.";
  }

  if (warning.includes("limited source coverage")) {
    return "The topic has limited source coverage in the selected sources.";
  }

  if (warning.includes("live source results were unavailable")) {
    return "Live sources were unavailable or not relevant enough for selection.";
  }

  if (warning.includes("429")) {
    return "One source temporarily rate-limited the request.";
  }

  if (warning.toLowerCase().includes("aborted")) {
    return "One source timed out before returning results.";
  }

  return warning;
}

function SourcePreflightPanel({
  preflight,
  onUseSuggestion
}: {
  preflight: PreflightPayload;
  onUseSuggestion: (suggestion: string) => void;
}) {
  const copy = getPreflightCopy(preflight);
  const livePaperCount = preflight.qualityGate.livePaperCount;
  const mockPaperCount = preflight.qualityGate.mockPaperCount;

  return (
    <section className={`preflight-panel ${copy.tone}`} aria-live="polite">
      <div className="preflight-header">
        <div>
          <span className="metric-label">Source check</span>
          <h2>{copy.title}</h2>
          <p>{copy.summary}</p>
        </div>
        <span className="badge">{copy.badge}</span>
      </div>

      <div className="preflight-summary-grid">
        <div>
          <span>Candidate papers</span>
          <strong>{preflight.searchSummary.totalUsedInBrief}</strong>
          <p>selected for the brief</p>
        </div>
        <div>
          <span>Source mix</span>
          <strong>
            {livePaperCount} live / {mockPaperCount} mock
          </strong>
          <p>live sources are preferred when relevant</p>
        </div>
        <div>
          <span>Warnings</span>
          <strong>{preflight.searchSummary.warnings.length}</strong>
          <p>
            {preflight.searchSummary.warnings.length
              ? "source issues to review"
              : "no source issues"}
          </p>
        </div>
      </div>

      {preflight.qualityGate.reasons.length ? (
        <div className="preflight-block">
          <h3>Before generating</h3>
          <ul>
            {preflight.qualityGate.reasons.map((reason) => (
              <li key={reason}>{formatPreflightWarning(reason)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preflight.qualityGate.suggestions.length ? (
        <div className="preflight-block">
          <h3>
            {copy.tone === "good" ? "Optional refinement" : "Try a better query"}
          </h3>
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
        <h3>Read first</h3>
        {preflight.papers.length ? (
          <div className="preflight-paper-list">
            {preflight.papers.slice(0, 5).map((paper) => (
              <article key={paper.id}>
                <div className="token-list">
                  <span className="badge">{paper.source}</span>
                  {paper.insight?.role ? (
                    <span className="badge">{paper.insight.role}</span>
                  ) : null}
                </div>
                <h4>{paper.title}</h4>
                {paper.insight?.whyRead ? (
                  <p className="preflight-paper-reason">
                    {paper.insight.whyRead}
                  </p>
                ) : null}
                {paper.insight?.queryAlignment ? (
                  <div className="query-alignment">
                    <span className="metric-label">Query alignment</span>
                    <strong>
                      {paper.insight.queryAlignment.label} (
                      {paper.insight.queryAlignment.combinedScore.toFixed(2)})
                    </strong>
                    {paper.insight.queryAlignment.matchedTerms.length ? (
                      <p>
                        Matched:{" "}
                        {paper.insight.queryAlignment.matchedTerms
                          .slice(0, 8)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <p>
                  {paper.authors.slice(0, 3).join(", ")}
                  {paper.year ? ` (${paper.year})` : ""}
                </p>
                {paper.insight?.strengths.length ? (
                  <ul className="compact-list">
                    {paper.insight.strengths.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {paper.insight?.limitations.length ? (
                  <p className="preflight-paper-warning">
                    Check: {paper.insight.limitations.slice(0, 2).join("; ")}
                  </p>
                ) : null}
                {paper.doi ? (
                  <p>
                    DOI:{" "}
                    {getDoiUrl(paper.doi) ? (
                      <a
                        href={getDoiUrl(paper.doi) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {formatDoi(paper.doi)}
                      </a>
                    ) : (
                      formatDoi(paper.doi)
                    )}
                  </p>
                ) : null}
                <p>
                  Match strength: {formatScore(paper.relevanceScore)}
                  {paper.url ? (
                    <>
                      {" "}
                      -{" "}
                      <a href={paper.url} target="_blank" rel="noreferrer">
                        source
                      </a>
                    </>
                  ) : null}
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
          <h3>Source issues</h3>
          <ul>
            {preflight.searchSummary.warnings.slice(0, 5).map((warning) => (
              <li key={warning}>{formatPreflightWarning(warning)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="preflight-technical">
        <summary>Technical source details</summary>
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
      </details>
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
  const generationBlockedByPreflight =
    preflight?.qualityGate.canSynthesize === false ||
    preflight?.qualityGate.coverage === "poor";
  const generateDisabled = busy || generationBlockedByPreflight;

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

  function resetRequestReview() {
    setPreflight(null);
    setQualityGate(null);
    if (errorKind === "warning") {
      setError(null);
      setErrorKind("error");
    }
  }

  function toggleSource(source: SourceOption) {
    resetRequestReview();
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
            onChange={(event) => {
              resetRequestReview();
              setQuery(event.target.value);
            }}
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
              onChange={(event) => {
                resetRequestReview();
                setMaxPapers(Number(event.target.value));
              }}
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
              onChange={(event) => {
                resetRequestReview();
                setFromYear(event.target.value);
              }}
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
              onChange={(event) => {
                resetRequestReview();
                setToYear(event.target.value);
              }}
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
                ? getQualityGateCopy(qualityGate).title
                : errorKind === "warning"
                  ? "Rate limit"
                  : "Generation error"}
            </strong>
            <span>{qualityGate ? getQualityGateCopy(qualityGate).summary : error}</span>
            {qualityGate ? (
              <div className="quality-gate-alert">
                <div className="quality-gate-metrics">
                  <span>{qualityGate.selectedPaperCount} selected papers</span>
                  <span>{qualityGate.livePaperCount} live-source papers</span>
                  <span>{qualityGate.warningCount} source warnings</span>
                </div>
                {qualityGate.reasons.length ? (
                  <ul>
                    {qualityGate.reasons.map((reason) => (
                      <li key={reason}>{formatPreflightWarning(reason)}</li>
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
            disabled={generateDisabled}
            className={
              generationBlockedByPreflight
                ? "primary-action is-blocked"
                : "primary-action"
            }
            title={
              generationBlockedByPreflight
                ? "Check a broader query or enable stronger sources before generating."
                : undefined
            }
          >
            {loading ? "Generating..." : "Generate Brief"}
          </button>
          {generationBlockedByPreflight ? (
            <p className="form-action-note" role="status">
              Improve the source check before generating this brief.
            </p>
          ) : null}
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
