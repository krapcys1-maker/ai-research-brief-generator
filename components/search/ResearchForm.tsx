"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SourceOption = "mock" | "arxiv" | "semantic_scholar" | "openalex";

type ResearchFormProps = {
  examples: string[];
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
  "Generating structured brief",
  "Validating citations",
  "Saving result"
];

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
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setErrorKind("error");
    setProgressStep(0);
    setLoading(true);

    try {
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query,
          maxPapers,
          sources,
          fromYear: fromYear ? Number(fromYear) : undefined,
          toYear: toYear ? Number(toYear) : undefined
        })
      });

      const payload = (await response.json()) as {
        briefId?: string;
        error?: string;
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
            disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
                  disabled={loading}
                  onChange={() => toggleSource(source.value)}
                />
                <span>{source.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <div className={`form-alert ${errorKind}`} role="alert">
            <strong>{errorKind === "warning" ? "Rate limit" : "Generation error"}</strong>
            <span>{error}</span>
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

        <button
          type="submit"
          disabled={loading}
          className="primary-action"
        >
          {loading ? "Generating..." : "Generate Brief"}
        </button>
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
              disabled={loading}
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
