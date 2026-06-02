"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  ClaimCheckReport,
  ClaimEvidenceSnippet,
  ExtractedClaim
} from "@/lib/claimCheck/schemas";

const classifications = [
  "all",
  "supported",
  "partially_supported",
  "contradicted",
  "insufficient_evidence",
  "too_broad",
  "not_scientific_claim",
  "already_known_or_done",
  "possible_dead_end"
] as const;

type Filter = (typeof classifications)[number];

type ExtractPayload = {
  status?: string;
  error?: string;
  sourceDocumentId?: string;
  claims?: ExtractedClaim[];
  document?: { id: string; filename: string; status: string };
};

type ComparePayload = {
  status?: string;
  error?: string;
  report?: ClaimCheckReport;
  savedReport?: SavedCompareReport;
};

type SavedCompareReport = {
  id: string;
  title: string;
  summary: string;
  sourceDocumentId: string | null;
  claimCount: number;
  visibility: string;
  createdAt: string;
  updatedAt: string;
};

type CompareReportHistoryPayload = {
  status?: string;
  error?: string;
  reports?: SavedCompareReport[];
  historyScope?: "user" | "session";
};

type StoredCompareReportPayload = {
  status?: string;
  error?: string;
  report?: ClaimCheckReport;
  savedReport?: SavedCompareReport;
};

export function CompareWorkspace() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [claims, setClaims] = useState<ExtractedClaim[]>([]);
  const [selectedClaimIds, setSelectedClaimIds] = useState<Set<string>>(new Set());
  const [sourceDocumentId, setSourceDocumentId] = useState<string | undefined>();
  const [report, setReport] = useState<ClaimCheckReport | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedEvidence, setSelectedEvidence] =
    useState<ClaimEvidenceSnippet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [history, setHistory] = useState<SavedCompareReport[]>([]);
  const [historyScope, setHistoryScope] = useState<"user" | "session">("session");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  const selectedClaims = useMemo(
    () => claims.filter((claim) => selectedClaimIds.has(claim.id)),
    [claims, selectedClaimIds]
  );
  const visibleItems = useMemo(() => {
    if (!report) {
      return [];
    }

    return filter === "all"
      ? report.items
      : report.items.filter((item) => item.classification === filter);
  }, [filter, report]);

  async function refreshHistory() {
    setIsLoadingHistory(true);

    try {
      const response = await fetch("/api/claim-check/reports");
      const payload = (await response.json()) as CompareReportHistoryPayload;

      if (!response.ok || !payload.reports) {
        throw new Error(payload.error ?? "Could not load saved reports.");
      }

      setHistory(payload.reports);
      setHistoryScope(payload.historyScope ?? "session");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load saved reports."
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialHistory() {
      try {
        const response = await fetch("/api/claim-check/reports");
        const payload = (await response.json()) as CompareReportHistoryPayload;

        if (!response.ok || !payload.reports) {
          throw new Error(payload.error ?? "Could not load saved reports.");
        }

        if (!cancelled) {
          setHistory(payload.reports);
          setHistoryScope(payload.historyScope ?? "session");
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load saved reports."
          );
        }
      }
    }

    void loadInitialHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleClaim(id: string) {
    setSelectedClaimIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  async function handleExtract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setReport(null);
    setIsExtracting(true);

    try {
      let response: Response;

      if (file) {
        const formData = new FormData();
        formData.set("file", file);
        response = await fetch("/api/claim-check/extract", {
          method: "POST",
          body: formData
        });
      } else {
        response = await fetch("/api/claim-check/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });
      }

      const payload = (await response.json()) as ExtractPayload;
      if (!response.ok || !payload.claims) {
        throw new Error(payload.error ?? "Could not extract claims.");
      }

      setClaims(payload.claims);
      setSourceDocumentId(payload.sourceDocumentId);
      setSelectedClaimIds(
        new Set(payload.claims.filter((claim) => claim.checkable).map((claim) => claim.id))
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not extract claims."
      );
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleCompare() {
    setError(null);
    setIsComparing(true);

    try {
      const response = await fetch("/api/claim-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claims: selectedClaims.map((claim) => claim.claimText),
          sourceDocumentId,
          queryContext: text.slice(0, 280)
        })
      });
      const payload = (await response.json()) as ComparePayload;

      if (!response.ok || !payload.report) {
        throw new Error(payload.error ?? "Could not compare claims.");
      }

      setReport(payload.report);
      setFilter("all");
      if (payload.savedReport) {
        setHistory((current) => [
          payload.savedReport as SavedCompareReport,
          ...current.filter((item) => item.id !== payload.savedReport?.id)
        ]);
      } else {
        await refreshHistory();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not compare claims."
      );
    } finally {
      setIsComparing(false);
    }
  }

  async function handleLoadSavedReport(id: string) {
    setError(null);
    setLoadingReportId(id);

    try {
      const response = await fetch(`/api/claim-check/reports/${id}`);
      const payload = (await response.json()) as StoredCompareReportPayload;

      if (!response.ok || !payload.report) {
        throw new Error(payload.error ?? "Could not load saved report.");
      }

      setReport(payload.report);
      setFilter("all");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not load saved report."
      );
    } finally {
      setLoadingReportId(null);
    }
  }

  return (
    <div className="compare-grid">
      <section className="surface compare-panel">
        <h2>Input</h2>
        <p>
          Paste text or upload PDF/TXT/MD. The system extracts candidate claims
          first; you choose what to verify.
        </p>
        <form className="compare-form" onSubmit={handleExtract}>
          <label htmlFor="claim-text">Paste text</label>
          <textarea
            id="claim-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            placeholder="RAG reduces hallucinations in clinical AI systems, but it does not eliminate them."
            disabled={isExtracting || isComparing}
          />
          <label htmlFor="claim-file">Or upload document</label>
          <input
            id="claim-file"
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={isExtracting || isComparing}
          />
          <button
            className="primary-action"
            type="submit"
            disabled={isExtracting || isComparing || (!file && text.trim().length < 20)}
          >
            {isExtracting ? "Extracting..." : "Extract claims"}
          </button>
        </form>
        {error ? <div className="form-alert error">{error}</div> : null}
      </section>

      <section className="surface compare-panel">
        <h2>Extracted claims</h2>
        <p>Select the claims you want to compare with retrieved literature.</p>
        {claims.length ? (
          <div className="claim-review-list">
            {claims.map((claim) => (
              <label key={claim.id} className="claim-review-card">
                <input
                  type="checkbox"
                  checked={selectedClaimIds.has(claim.id)}
                  onChange={() => toggleClaim(claim.id)}
                  disabled={isComparing}
                />
                <span>
                  <strong>{claim.claimText}</strong>
                  <small>{claim.reason}</small>
                  <span className="badge">
                    {claim.checkable ? "checkable" : "not checkable"}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">No extracted claims yet.</div>
        )}
        <button
          className="primary-action"
          type="button"
          onClick={handleCompare}
          disabled={isComparing || selectedClaims.length === 0}
        >
          {isComparing ? "Comparing..." : "Compare selected claims"}
        </button>
      </section>

      <section className="surface compare-panel">
        <div className="compare-report-header">
          <div>
            <h2>Saved reports</h2>
            <p>
              {historyScope === "user"
                ? "Workspace-owned Compare history."
                : "Private session Compare history."}
            </p>
          </div>
          <button
            className="citation"
            type="button"
            onClick={() => void refreshHistory()}
            disabled={isLoadingHistory}
          >
            {isLoadingHistory ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {history.length ? (
          <div className="similar-work-list">
            {history.map((item) => (
              <article key={item.id}>
                <div className="token-list">
                  <span className="badge">{item.claimCount} claim(s)</span>
                  <span className="badge">{item.visibility}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <p style={{ color: "var(--muted)" }}>
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                <button
                  type="button"
                  className="citation"
                  onClick={() => void handleLoadSavedReport(item.id)}
                  disabled={loadingReportId === item.id}
                >
                  {loadingReportId === item.id ? "Loading..." : "Open report"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">No saved Compare reports yet.</div>
        )}
      </section>

      {report ? (
        <section className="surface compare-report">
          <div className="compare-report-header">
            <div>
              <h2>{report.title}</h2>
              <p>{report.summary}</p>
            </div>
            <span className="badge">{report.items.length} claim(s)</span>
          </div>

          <div className="warning-panel">
            <strong>
              This is not a definitive scientific review. It compares your claims
              with retrieved sources and available evidence.
            </strong>
          </div>

          <div className="token-list">
            {classifications.map((item) => (
              <button
                key={item}
                type="button"
                className="citation"
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="claim-matrix">
            {visibleItems.map((item) => (
              <article key={item.claimText} className="claim-matrix-card">
                <div className="token-list">
                  <span className="badge">{item.classification}</span>
                  <span className="badge">{item.confidence}</span>
                  <span className="badge">{item.evidenceBoundary}</span>
                </div>
                <h3>{item.claimText}</h3>
                <p>{item.explanation}</p>
                {item.suggestedRevision ? (
                  <div className="details-panel">
                    <strong>Suggested safer wording</strong>
                    <p>{item.suggestedRevision}</p>
                  </div>
                ) : null}
                <div className="claim-columns">
                  <div>
                    <strong>What matches science</strong>
                    <ul className="compact-list">
                      {item.whatMatchesScience.length ? (
                        item.whatMatchesScience.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))
                      ) : (
                        <li>No strong match in retrieved evidence.</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <strong>Limits / mismatch</strong>
                    <ul className="compact-list">
                      {[
                        ...item.whatDoesNotMatchScience,
                        ...item.caveats
                      ].map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {item.evidenceSnippets.length ? (
                  <div className="evidence-list">
                    <strong>Evidence snippets</strong>
                    {item.evidenceSnippets.map((snippet) => (
                      <blockquote key={snippet.id}>
                        <p>{snippet.text}</p>
                        <footer>
                          <span className="badge">{snippet.sourceType}</span>
                          <span className="badge">{snippet.evidenceLevel}</span>
                          <span className="badge">{snippet.supportRelation}</span>
                          <button
                            type="button"
                            className="citation"
                            onClick={() => setSelectedEvidence(snippet)}
                          >
                            Details
                          </button>
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {report.similarWork.length ? (
            <section className="details-panel">
              <h2>Similar prior work</h2>
              <div className="similar-work-list">
                {report.similarWork.map((item) => (
                  <article key={item.paperId}>
                    <span className="badge">{item.noveltyImplication}</span>
                    <h3>{item.title}</h3>
                    <p>
                      {item.authors.slice(0, 4).join(", ")}
                      {item.year ? ` (${item.year})` : ""}
                    </p>
                    <p>{item.reasonRelevant}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="details-panel">
            <h2>Recommended next steps</h2>
            <ul className="compact-list">
              {report.recommendedNextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </section>
      ) : null}

      {selectedEvidence ? (
        <aside className="source-drawer" aria-label="Evidence details">
          <article className="surface">
            <button
              type="button"
              className="citation"
              onClick={() => setSelectedEvidence(null)}
            >
              Close
            </button>
            <h2>Evidence details</h2>
            <div className="token-list">
              <span className="badge">{selectedEvidence.sourceType}</span>
              <span className="badge">{selectedEvidence.evidenceLevel}</span>
              <span className="badge">{selectedEvidence.supportRelation}</span>
            </div>
            <p>{selectedEvidence.text}</p>
            <p style={{ color: "var(--muted)" }}>
              Source: {selectedEvidence.sourceId}
              {selectedEvidence.paperId ? ` / Paper: ${selectedEvidence.paperId}` : ""}
              {selectedEvidence.chunkId ? ` / Chunk: ${selectedEvidence.chunkId}` : ""}
            </p>
          </article>
        </aside>
      ) : null}
    </div>
  );
}
