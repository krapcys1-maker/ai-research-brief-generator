"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { BriefAnswer, EvidenceLink, ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";
import { PaperCard } from "@/components/brief/PaperCard";
import { getEvidenceBoundary } from "@/lib/brief/evidenceBoundary";
import { getPaperMetadataWarnings } from "@/lib/pipeline/metadataQuality";
import { formatDoi, getDoiUrl } from "@/lib/sources/doi";
import {
  getPaperInsight,
  getSourceQualitySummary
} from "@/lib/pipeline/paperInsights";

function SourceRefs({
  ids,
  papersById,
  onSelect
}: {
  ids: string[];
  papersById: Map<string, NormalizedPaper>;
  onSelect: (id: string) => void;
}) {
  return (
    <span className="source-ref-list">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className="citation"
          title={id}
        >
          {formatCitationLabel(papersById.get(id), id)}
        </button>
      ))}
    </span>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface" style={{ padding: 22 }}>
      <h2 style={{ margin: "0 0 16px", fontSize: "1.25rem" }}>{title}</h2>
      {children}
    </section>
  );
}

function EvidenceList({
  evidence,
  papersById,
  onSelect
}: {
  evidence: EvidenceLink[];
  papersById: Map<string, NormalizedPaper>;
  onSelect: (id: string) => void;
}) {
  if (!evidence.length) {
    return null;
  }

  return (
    <div className="evidence-list" aria-label="Claim evidence">
      <strong>Evidence</strong>
      {evidence.map((item) => (
        <blockquote key={`${item.paperId}:${item.evidenceText}`}>
          <p>{item.evidenceText}</p>
          <footer>
            <button
              type="button"
              className="citation"
              onClick={() => onSelect(item.paperId)}
              title={item.paperId}
            >
              {formatCitationLabel(papersById.get(item.paperId), item.paperId)}
            </button>
            <span className="badge">{item.supportLevel}</span>
            <span className="badge">{item.evidenceLevel}</span>
            {item.sectionTitle ? <span className="badge">{item.sectionTitle}</span> : null}
          </footer>
        </blockquote>
      ))}
    </div>
  );
}

function getPaperSourceCounts(papers: NormalizedPaper[]) {
  const counts = papers.reduce<Record<string, number>>((acc, paper) => {
    acc[paper.source] = (acc[paper.source] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function getFirstAuthorLastName(paper: NormalizedPaper | undefined) {
  const firstAuthor = paper?.authors[0]?.trim();
  if (!firstAuthor) {
    return null;
  }

  const parts = firstAuthor.split(/\s+/);
  return parts.at(-1) ?? firstAuthor;
}

function formatCitationLabel(paper: NormalizedPaper | undefined, fallback: string) {
  const author = getFirstAuthorLastName(paper);
  if (author && paper?.year) {
    return `${author} ${paper.year}`;
  }

  if (author) {
    return author;
  }

  return fallback.replace(/^openalex:/, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getReadableCitationTokens(papersById: Map<string, NormalizedPaper>) {
  const tokenMap = new Map<string, string>();

  papersById.forEach((paper, id) => {
    const label = formatCitationLabel(paper, id);
    const tokens = [
      id,
      id.replace(/^openalex:/, ""),
      id.replace(/^arxiv:/, ""),
      paper.openAlexId,
      paper.arxivId,
      paper.semanticScholarId
    ].filter(Boolean) as string[];

    tokens.forEach((token) => tokenMap.set(token, label));
  });

  return [...tokenMap.entries()].sort((a, b) => b[0].length - a[0].length);
}

function formatNarrativeText(text: string, papersById: Map<string, NormalizedPaper>) {
  return getReadableCitationTokens(papersById).reduce((result, [token, label]) => {
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9:_-])(${escapeRegExp(token)})(?=$|[^A-Za-z0-9:_-])`,
      "g"
    );

    return result.replace(pattern, (_match, prefix: string) => `${prefix}${label}`);
  }, text);
}

function formatGeneratedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function getWarningGroups(warnings: string[]) {
  const groups = warnings.reduce<
    Record<string, { label: string; detail: string; count: number }>
  >((acc, warning) => {
    const sourceMatch = warning.match(/^([a-z_]+) (failed|returned no papers):?\s*(.*)$/i);
    const queryMatch = warning.match(/^query variant "(.+)" failed:\s*(.*)$/i);
    const label = sourceMatch?.[1] ?? (queryMatch ? "query variant" : "pipeline");
    const rawDetail = sourceMatch?.[3] || queryMatch?.[2] || warning;
    const detail = formatWarningDetail(rawDetail);
    const key = `${label}:${detail}`;

    acc[key] = acc[key] ?? { label, detail, count: 0 };
    acc[key].count += 1;

    return acc;
  }, {});

  return Object.values(groups).sort((a, b) => b.count - a.count);
}

function getFallbackWarning(warnings: string[]) {
  return warnings.find((warning) =>
    warning.startsWith("AI synthesis fallback used")
  );
}

function formatWarningDetail(detail: string) {
  const normalized = detail.trim();
  if (!normalized || normalized === ".") {
    return "No useful details returned by the source.";
  }

  if (normalized.includes("429")) {
    return "The source temporarily rate-limited the request.";
  }

  if (normalized.toLowerCase().includes("aborted")) {
    return "The source request timed out before returning results.";
  }

  return normalized;
}

function getBriefQuality(brief: ResearchBrief, papers: NormalizedPaper[]) {
  const mockCount = papers.filter((paper) => paper.source === "mock").length;
  const liveCount = papers.length - mockCount;
  const averageRelevance =
    papers.reduce((sum, paper) => sum + (paper.relevanceScore ?? 0), 0) /
    Math.max(1, papers.length);
  const hasQualityWarning = brief.searchSummary.warnings.some((warning) =>
    warning.startsWith("brief quality warning:")
  );

  if (!papers.length || hasQualityWarning || averageRelevance < 0.12) {
    return {
      label: "Needs review",
      description:
        "The selected papers may not cover the query well enough. Treat this as a starting point.",
      averageRelevance,
      mockCount,
      liveCount
    };
  }

  if (liveCount >= Math.max(3, papers.length * 0.6) && averageRelevance >= 0.45) {
    return {
      label: "Good",
      description:
        "The brief is mostly grounded in live source records with strong query relevance.",
      averageRelevance,
      mockCount,
      liveCount
    };
  }

  return {
    label: "Usable",
    description:
      "The brief has usable source coverage, but some claims should be checked against the bibliography.",
    averageRelevance,
    mockCount,
    liveCount
  };
}

function QualitySummary({
  brief,
  papers
}: {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
}) {
  const quality = getBriefQuality(brief, papers);
  const sourceCounts = getPaperSourceCounts(papers);
  const alignmentQuery = brief.searchSummary.queryVariants.join(" ");
  const sourceQuality = getSourceQualitySummary(papers, alignmentQuery);

  return (
    <section className="quality-panel" aria-label="Brief quality summary">
      <div>
        <span className="metric-label">Brief quality</span>
        <strong>{quality.label}</strong>
        <p>{quality.description}</p>
      </div>
      <div>
        <span className="metric-label">Source quality</span>
        <strong>{sourceQuality.label}</strong>
        <p>{sourceQuality.description}</p>
      </div>
      <div>
        <span className="metric-label">Source mix</span>
        <strong>
          {quality.liveCount} live / {quality.mockCount} mock
        </strong>
        <p>
          {sourceCounts.map(([source, count]) => `${source}: ${count}`).join(", ")}
        </p>
      </div>
      <div>
        <span className="metric-label">Coverage signals</span>
        <strong>
          {sourceQuality.metrics.papersWithAbstracts}/{sourceQuality.metrics.totalPapers} abstracts
        </strong>
        <p>
          {sourceQuality.metrics.papersWithDoi} DOI-backed,{" "}
          {sourceQuality.metrics.highRelevancePapers} strong match,{" "}
          {brief.searchSummary.warnings.length} warning(s)
        </p>
      </div>
      <div>
        <span className="metric-label">Query alignment</span>
        <strong>
          {sourceQuality.metrics.strongQueryAlignmentPapers} direct /{" "}
          {sourceQuality.metrics.weakQueryAlignmentPapers} weak
        </strong>
        <p>Direct matches are papers whose title/abstract terms closely match the query.</p>
      </div>
      {sourceQuality.strengths.length ? (
        <div>
          <span className="metric-label">Strengths</span>
          <ul className="compact-list">
            {sourceQuality.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {sourceQuality.cautions.length ? (
        <div>
          <span className="metric-label">Cautions</span>
          <ul className="compact-list">
            {sourceQuality.cautions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function BriefAtAGlance({
  brief,
  papers
}: {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
}) {
  const quality = getBriefQuality(brief, papers);
  const sourceCounts = getPaperSourceCounts(papers);
  const boundary = getEvidenceBoundary({
    outputLanguage: brief.outputLanguage,
    papers
  });
  const cautionCount =
    brief.researchGaps.length + brief.controversiesOrUncertainties.length;

  return (
    <section className="brief-glance surface" aria-label="Brief at a glance">
      <div className="brief-glance-main">
        <span className="metric-label">Bottom line</span>
        <p>{brief.tldr}</p>
      </div>
      <div className="brief-glance-grid">
        <div>
          <span className="metric-label">Confidence</span>
          <strong>{quality.label}</strong>
          <p>{quality.description}</p>
        </div>
        <div>
          <span className="metric-label">Evidence base</span>
          <strong>
            {boundary.metrics.papersWithAbstracts}/{boundary.metrics.totalPapers} with abstracts
          </strong>
          <p>
            {sourceCounts.map(([source, count]) => `${source}: ${count}`).join(", ")}
          </p>
        </div>
        <div>
          <span className="metric-label">Evidence boundary</span>
          <strong>
            {papers.some((paper) => paper.fullTextStatus === "parsed")
              ? "Full text available for some papers"
              : "Abstract-level only"}
          </strong>
          <p>
            {papers.some((paper) => paper.fullTextStatus === "parsed")
              ? "Ask This Brief can use parsed full-text chunks where available; the brief itself still shows claim-level source snippets."
              : "Not full-text PDF verification. Treat this as a metadata/abstract briefing."}
          </p>
        </div>
        <div>
          <span className="metric-label">Review focus</span>
          <strong>{cautionCount} open issues</strong>
          <p>
            {brief.searchSummary.warnings.length} source warning(s),{" "}
            {boundary.metrics.papersWithDoi} DOI-backed paper(s)
          </p>
        </div>
      </div>
    </section>
  );
}

function EvidenceBoundaryContent({
  brief,
  papers
}: {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
}) {
  const boundary = getEvidenceBoundary({
    outputLanguage: brief.outputLanguage,
    papers
  });

  return (
    <>
      <p style={{ margin: "0 0 12px", lineHeight: 1.65 }}>
        {boundary.summary}
      </p>
      <div className="evidence-boundary-grid">
        <div>
          <span className="metric-label">Selected papers</span>
          <strong>{boundary.metrics.totalPapers}</strong>
        </div>
        <div>
          <span className="metric-label">With abstracts</span>
          <strong>{boundary.metrics.papersWithAbstracts}</strong>
        </div>
        <div>
          <span className="metric-label">PDF links</span>
          <strong>{boundary.metrics.papersWithPdfLinks}</strong>
        </div>
        <div>
          <span className="metric-label">Full text parsed</span>
          <strong>
            {papers.filter((paper) => paper.fullTextStatus === "parsed").length}
          </strong>
        </div>
        <div>
          <span className="metric-label">With DOI</span>
          <strong>{boundary.metrics.papersWithDoi}</strong>
        </div>
      </div>
      <ul className="compact-list" style={{ marginTop: 14 }}>
        {boundary.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}

function PriorityTakeaways({
  brief,
  papersById,
  onSelect
}: {
  brief: ResearchBrief;
  papersById: Map<string, NormalizedPaper>;
  onSelect: (id: string) => void;
}) {
  const mainFindings = brief.keyFindings.slice(0, 3);
  const cautions = [
    ...brief.researchGaps.map((item) => ({
      title: item.gap,
      detail: item.whyItMatters,
      sourcePaperIds: item.sourcePaperIds
    })),
    ...brief.controversiesOrUncertainties.map((item) => ({
      title: item.issue,
      detail: item.explanation,
      sourcePaperIds: item.sourcePaperIds
    }))
  ].slice(0, 3);

  return (
    <Section title="Priority Takeaways">
      <div className="takeaway-grid">
        <div>
          <h3>Best-supported points</h3>
          <div className="takeaway-list">
            {mainFindings.map((item) => (
              <article key={item.finding}>
                <h4>{formatNarrativeText(item.finding, papersById)}</h4>
                <p>{formatNarrativeText(item.explanation, papersById)}</p>
                <div className="takeaway-meta">
                  <span className="badge">{item.confidence}</span>
                  <SourceRefs
                    ids={item.sourcePaperIds}
                    papersById={papersById}
                    onSelect={onSelect}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
        <div>
          <h3>Check before relying on it</h3>
          <div className="takeaway-list">
            {cautions.map((item) => (
              <article key={item.title}>
                <h4>{formatNarrativeText(item.title, papersById)}</h4>
                <p>{formatNarrativeText(item.detail, papersById)}</p>
                <SourceRefs
                  ids={item.sourcePaperIds}
                  papersById={papersById}
                  onSelect={onSelect}
                />
              </article>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function ReadingPath({
  papers,
  query,
  onSelect
}: {
  papers: NormalizedPaper[];
  query: string;
  onSelect: (id: string) => void;
}) {
  const topPapers = papers
    .slice()
    .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))
    .slice(0, 3);

  if (!topPapers.length) {
    return null;
  }

  return (
    <Section title="Start Reading Here">
      <p className="section-lede">
        Highest-ranked papers selected for this brief, with quick access to
        abstracts, DOI metadata, and bibliography links.
      </p>
      <div className="reading-path">
        {topPapers.map((paper, index) => (
          <article key={paper.id}>
            {(() => {
              const insight = getPaperInsight(paper, undefined, query);

              return (
                <>
            <div className="token-list">
              <span className="badge">#{index + 1}</span>
              <span className="badge">{insight.role}</span>
              {insight.queryAlignment ? (
                <span className="badge">{insight.queryAlignment.label}</span>
              ) : null}
            </div>
            <h3>{paper.title}</h3>
            <p className="reading-path-reason">{insight.whyRead}</p>
            {insight.queryAlignment ? (
              <div className="query-alignment">
                <span className="metric-label">Query alignment</span>
                <strong>{insight.queryAlignment.combinedScore.toFixed(2)}</strong>
                <p>
                  Title {insight.queryAlignment.titleScore.toFixed(2)}, abstract{" "}
                  {insight.queryAlignment.abstractScore.toFixed(2)}
                </p>
                {insight.queryAlignment.matchedTerms.length ? (
                  <p>
                    Matched:{" "}
                    {insight.queryAlignment.matchedTerms.slice(0, 8).join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
            <p>
              {formatCitationLabel(paper, paper.id)}
              {paper.venue ? `, ${paper.venue}` : ""}
            </p>
            <p>
              Relevance {typeof paper.relevanceScore === "number"
                ? paper.relevanceScore.toFixed(2)
                : "N/A"}
              {typeof paper.semanticScore === "number"
                ? ` - Semantic ${paper.semanticScore.toFixed(2)}`
                : ""}
              {paper.doi ? " - DOI available" : ""}
            </p>
            <button
              type="button"
              className="citation"
              onClick={() => onSelect(paper.id)}
            >
              Source details
            </button>
                </>
              );
            })()}
          </article>
        ))}
      </div>
    </Section>
  );
}

function SourceAndQualityDetails({
  brief,
  papers
}: {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
}) {
  return (
    <details className="surface diagnostics-details">
      <summary>Source and Quality Details</summary>
      <div className="stack">
        <QualitySummary brief={brief} papers={papers} />
        <div className="details-panel">
          <h3 className="compact-heading">Evidence boundary</h3>
          <EvidenceBoundaryContent brief={brief} papers={papers} />
        </div>
        <SearchDiagnostics brief={brief} papers={papers} />
      </div>
    </details>
  );
}

function AskBriefPanel({
  briefId,
  papersById,
  onSelect
}: {
  briefId: string;
  papersById: Map<string, NormalizedPaper>;
  onSelect: (id: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<BriefAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/briefs/${briefId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: trimmedQuestion })
      });
      const payload = (await response.json()) as {
        status?: string;
        error?: string;
        answer?: BriefAnswer;
      };

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error ?? "Could not answer this question.");
      }

      setAnswer(payload.answer);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not answer this question."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Section title="Ask This Brief">
      <form className="ask-brief-form" onSubmit={handleSubmit}>
        <label htmlFor="brief-question">Question</label>
        <textarea
          id="brief-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Dlaczego te artykuly zostaly wybrane?"
          disabled={isSubmitting}
          rows={3}
        />
        <button type="submit" disabled={isSubmitting || question.trim().length < 3}>
          {isSubmitting ? "Answering..." : "Ask"}
        </button>
      </form>

      {error ? <div className="ask-brief-error">{error}</div> : null}

      {answer ? (
        <article className="ask-brief-answer">
          <div className="token-list">
            <span className="badge">Language: {answer.outputLanguage}</span>
            <span className="badge">Confidence: {answer.confidence}</span>
            <span className="badge">
              Evidence:{" "}
              {answer.claims.some((claim) =>
                claim.evidence.some(
                  (evidence) => evidence.evidenceLevel === "full_text_supported"
                )
              )
                ? "full text"
                : "abstract/metadata"}
            </span>
            {answer.notAnswerableFromSources ? (
              <span className="badge">not answerable from selected sources</span>
            ) : null}
          </div>
          <p>{answer.answer}</p>

          {answer.claims.length ? (
            <div className="ask-brief-claims">
              {answer.claims.map((claim) => (
                <article key={claim.claim}>
                  <h3>{claim.claim}</h3>
                  <p>{claim.explanation}</p>
                  <SourceRefs
                    ids={claim.sourcePaperIds}
                    papersById={papersById}
                    onSelect={onSelect}
                  />
                  <EvidenceList
                    evidence={claim.evidence}
                    papersById={papersById}
                    onSelect={onSelect}
                  />
                </article>
              ))}
            </div>
          ) : null}

          {answer.suggestedFollowUpQuestions.length ? (
            <div className="ask-brief-followups">
              <h3>Follow-up questions</h3>
              <div className="token-list">
                {answer.suggestedFollowUpQuestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="citation"
                    onClick={() => setQuestion(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      ) : null}
    </Section>
  );
}


function WarningSummary({ warnings }: { warnings: string[] }) {
  if (!warnings.length) {
    return null;
  }

  const groups = getWarningGroups(warnings);
  const fallbackWarning = getFallbackWarning(warnings);

  return (
    <div className="warning-panel" role="status">
      {fallbackWarning ? (
        <div className="fallback-explainer">
          <div>
            <span className="metric-label">Fallback mode</span>
            <strong>Extractive evidence summary</strong>
          </div>
          <p>
            The AI synthesis provider did not return a fully validated narrative.
            This page uses a safer fallback built from selected paper titles,
            abstracts, and source metadata only.
          </p>
          <p>
            For a richer synthesized brief, retry generation, narrow the topic, or
            use stronger provider settings. Keep treating this output as
            abstract-level evidence, not full-text verification.
          </p>
        </div>
      ) : null}
      <div className="warning-panel-header">
        <strong>Source warnings</strong>
        <span>
          {warnings.length} warning{warnings.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="warning-group-list">
        {groups.map((group) => (
          <div className="warning-group" key={`${group.label}:${group.detail}`}>
            <span className="badge">{group.label}</span>
            <span>{group.detail}</span>
            {group.count > 1 ? <strong>x{group.count}</strong> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchDiagnostics({
  brief,
  papers
}: {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
}) {
  const sourceCounts = getPaperSourceCounts(papers);

  return (
    <div className="technical-diagnostics">
      <div className="metric-grid">
        <div className="metric">
          <span className="metric-label">Found</span>
          <strong>{brief.searchSummary.totalFound}</strong>
        </div>
        <div className="metric">
          <span className="metric-label">After dedupe</span>
          <strong>{brief.searchSummary.totalAfterDeduplication}</strong>
        </div>
        <div className="metric">
          <span className="metric-label">Used in brief</span>
          <strong>{brief.searchSummary.totalUsedInBrief}</strong>
        </div>
      </div>

      <div className="diagnostics-grid">
        <div>
          <h3 className="compact-heading">Requested sources</h3>
          <div className="token-list">
            {brief.searchSummary.requestedSources.map((source) => (
              <span className="badge" key={source}>
                {source}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="compact-heading">Successful sources</h3>
          <div className="token-list">
            {brief.searchSummary.sourcesUsed.map((source) => (
              <span className="badge" key={source}>
                {source}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="compact-heading">Selected paper sources</h3>
          <div className="token-list">
            {sourceCounts.map(([source, count]) => (
              <span className="badge" key={source}>
                {source}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 className="compact-heading">Query variants</h3>
        <ol className="compact-list">
          {brief.searchSummary.queryVariants.map((query) => (
            <li key={query}>{query}</li>
          ))}
        </ol>
      </div>

      {brief.searchSummary.warnings.length ? (
        <div style={{ marginTop: 18 }}>
          <h3 className="compact-heading">Warnings</h3>
          <div className="warning-group-list">
            {getWarningGroups(brief.searchSummary.warnings).map((group) => (
              <div className="warning-group" key={`${group.label}:${group.detail}`}>
                <span className="badge">{group.label}</span>
                <span>{group.detail}</span>
                {group.count > 1 ? <strong>x{group.count}</strong> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {brief.searchSummary.sourceDiagnostics.length ? (
        <div style={{ marginTop: 18 }}>
          <h3 className="compact-heading">Adapter diagnostics</h3>
          <div className="source-diagnostic-list">
            {brief.searchSummary.sourceDiagnostics.map((diagnostic, index) => (
              <article
                className="source-diagnostic"
                key={`${diagnostic.source}:${diagnostic.query}:${index}`}
              >
                <div className="token-list">
                  <span className="badge">{diagnostic.source}</span>
                  <span className="badge">{diagnostic.status}</span>
                  {diagnostic.cached ? <span className="badge">cached</span> : null}
                </div>
                <p>{diagnostic.query}</p>
                <dl>
                  <div>
                    <dt>Results</dt>
                    <dd>{diagnostic.resultCount}</dd>
                  </div>
                  {diagnostic.message ? (
                    <div>
                      <dt>Message</dt>
                      <dd>{diagnostic.message}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SourceDrawer({
  paper,
  query,
  onClose
}: {
  paper: NormalizedPaper | null;
  query: string;
  onClose: () => void;
}) {
  if (!paper) {
    return null;
  }

  const doiUrl = getDoiUrl(paper.doi);
  const insight = getPaperInsight(paper, undefined, query);
  const metadataWarnings = getPaperMetadataWarnings(paper);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Source details"
      style={{
        position: "fixed",
        inset: "auto 20px 20px auto",
        width: "min(440px, calc(100vw - 40px))",
        maxHeight: "calc(100vh - 40px)",
        overflow: "auto",
        zIndex: 30
      }}
    >
      <article className="surface" style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "start"
          }}
        >
          <span className="badge">{paper.id}</span>
          <span className="badge">{insight.role}</span>
          <span className="badge">
            {paper.fullTextStatus === "parsed"
              ? "Full text parsed"
              : paper.fullTextStatus === "failed"
                ? "Parse failed"
                : paper.fullTextStatus === "unavailable"
                  ? "Full text unavailable"
                  : paper.abstract
                    ? "Abstract only"
                    : "Metadata only"}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close source details"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "#fff",
              width: 34,
              height: 34,
              cursor: "pointer",
              fontWeight: 800
            }}
          >
            X
          </button>
        </div>
        <h2 style={{ margin: "14px 0 8px", fontSize: "1.15rem", lineHeight: 1.35 }}>
          {paper.title}
        </h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.55 }}>
          {paper.authors.join(", ")}
        </p>
        <dl className="stack" style={{ gap: 8, margin: "0 0 14px" }}>
          <div>
            <dt style={{ display: "inline", fontWeight: 800 }}>Year: </dt>
            <dd style={{ display: "inline", margin: 0 }}>{paper.year ?? "N/A"}</dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 800 }}>Venue: </dt>
            <dd style={{ display: "inline", margin: 0 }}>{paper.venue ?? "N/A"}</dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 800 }}>Citations: </dt>
            <dd style={{ display: "inline", margin: 0 }}>
              {paper.citationCount ?? "N/A"}
            </dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 800 }}>DOI: </dt>
            <dd style={{ display: "inline", margin: 0 }}>
              {doiUrl ? (
                <a href={doiUrl} target="_blank" rel="noreferrer">
                  {formatDoi(paper.doi)}
                </a>
              ) : (
                formatDoi(paper.doi)
              )}
            </dd>
          </div>
        </dl>
        <div className="paper-insight">
          <div>
            <span className="metric-label">Why this paper</span>
            <p>{insight.whyRead}</p>
          </div>
          {insight.queryAlignment ? (
            <div className="query-alignment">
              <span className="metric-label">Query alignment</span>
              <strong>
                {insight.queryAlignment.label} (
                {insight.queryAlignment.combinedScore.toFixed(2)})
              </strong>
              <p>
                Title {insight.queryAlignment.titleScore.toFixed(2)}, abstract{" "}
                {insight.queryAlignment.abstractScore.toFixed(2)}
              </p>
              {insight.queryAlignment.matchedTerms.length ? (
                <p>
                  Matched:{" "}
                  {insight.queryAlignment.matchedTerms.slice(0, 8).join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}
          {insight.limitations.length ? (
            <div>
              <span className="metric-label">Limitations</span>
              <ul className="compact-list">
                {insight.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {metadataWarnings.length ? (
            <div>
              <span className="metric-label">Metadata warnings</span>
              <ul className="compact-list warning-list">
                {metadataWarnings.map((item) => (
                  <li key={item}>{item.replace("metadata warning:", "").trim()}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {paper.abstract ? <p style={{ lineHeight: 1.6 }}>{paper.abstract}</p> : null}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="citation" href={`#${paper.id}`}>
            Bibliography
          </a>
          {paper.sourceUrls[0] ? (
            <a
              className="citation"
              href={paper.sourceUrls[0]}
              target="_blank"
              rel="noreferrer"
            >
              Source URL
            </a>
          ) : null}
        </div>
      </article>
    </div>
  );
}

export function BriefRenderer({
  brief,
  papers
}: {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
}) {
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const papersById = useMemo(
    () => new Map(papers.map((paper) => [paper.id, paper])),
    [papers]
  );
  const alignmentQuery = brief.searchSummary.queryVariants.join(" ");
  const selectedPaper = selectedPaperId
    ? papersById.get(selectedPaperId) ?? null
    : null;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <header className="surface" style={{ padding: 28 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge">Language: {brief.outputLanguage}</span>
          <span className="badge">
            Papers used: {brief.searchSummary.totalUsedInBrief}
          </span>
        </div>
        <WarningSummary warnings={brief.searchSummary.warnings} />
        <h1 style={{ margin: "16px 0 10px", fontSize: "2rem", lineHeight: 1.15 }}>
          {brief.title}
        </h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          Query: {brief.query}
        </p>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: "8px 0 0" }}>
          Generated: {formatGeneratedAt(brief.generatedAt)}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <a
            className="citation"
            href={`/api/export/${brief.id}?format=markdown`}
          >
            Export Markdown
          </a>
        </div>
      </header>

      <BriefAtAGlance brief={brief} papers={papers} />

      <ReadingPath
        papers={papers}
        query={alignmentQuery}
        onSelect={setSelectedPaperId}
      />

      <PriorityTakeaways
        brief={brief}
        papersById={papersById}
        onSelect={setSelectedPaperId}
      />

      <AskBriefPanel
        briefId={brief.id}
        papersById={papersById}
        onSelect={setSelectedPaperId}
      />

      <Section title="Executive Summary">
        <p style={{ lineHeight: 1.65 }}>
          {formatNarrativeText(brief.executiveSummary.paragraph, papersById)}
        </p>
        <SourceRefs
          ids={brief.executiveSummary.sourcePaperIds}
          papersById={papersById}
          onSelect={setSelectedPaperId}
        />
        <EvidenceList
          evidence={brief.executiveSummary.evidence}
          papersById={papersById}
          onSelect={setSelectedPaperId}
        />
      </Section>

      <Section title="Key Findings">
        <div className="stack">
          {brief.keyFindings.map((item) => (
            <article key={item.finding} style={{ lineHeight: 1.6 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                {formatNarrativeText(item.finding, papersById)}
              </h3>
              <p style={{ margin: "0 0 8px" }}>
                {formatNarrativeText(item.explanation, papersById)}
              </p>
              <p style={{ margin: "0 0 8px", color: "var(--muted)" }}>
                Confidence: {item.confidence}
              </p>
              {item.caveats.length ? (
                <p style={{ margin: "0 0 8px", color: "var(--warning)" }}>
                  Caveats: {formatNarrativeText(item.caveats.join("; "), papersById)}
                </p>
              ) : null}
              <SourceRefs
                ids={item.sourcePaperIds}
                papersById={papersById}
                onSelect={setSelectedPaperId}
              />
              <EvidenceList
                evidence={item.evidence}
                papersById={papersById}
                onSelect={setSelectedPaperId}
              />
            </article>
          ))}
        </div>
      </Section>

      <Section title="Major Themes">
        <div className="stack">
          {brief.majorThemes.map((item) => (
            <article key={item.theme} style={{ lineHeight: 1.6 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                {formatNarrativeText(item.theme, papersById)}
              </h3>
              <p style={{ margin: "0 0 8px" }}>
                {formatNarrativeText(item.description, papersById)}
              </p>
              <SourceRefs
                ids={item.sourcePaperIds}
                papersById={papersById}
                onSelect={setSelectedPaperId}
              />
              <EvidenceList
                evidence={item.evidence}
                papersById={papersById}
                onSelect={setSelectedPaperId}
              />
            </article>
          ))}
        </div>
      </Section>

      <Section title="Influential Papers">
        <div className="stack">
          {brief.influentialPapers.map((item) => (
            <article key={item.paperId} style={{ lineHeight: 1.6 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                <a href={`#${item.paperId}`} title={item.paperId}>
                  {formatCitationLabel(papersById.get(item.paperId), item.paperId)}
                </a>
              </h3>
              <p style={{ margin: 0 }}>
                {formatNarrativeText(item.reason, papersById)}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Research Gaps">
        <div className="stack">
          {brief.researchGaps.map((item) => (
            <article key={item.gap} style={{ lineHeight: 1.6 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                {formatNarrativeText(item.gap, papersById)}
              </h3>
              <p style={{ margin: "0 0 8px" }}>
                {formatNarrativeText(item.whyItMatters, papersById)}
              </p>
              <SourceRefs
                ids={item.sourcePaperIds}
                papersById={papersById}
                onSelect={setSelectedPaperId}
              />
              <EvidenceList
                evidence={item.evidence}
                papersById={papersById}
                onSelect={setSelectedPaperId}
              />
            </article>
          ))}
        </div>
      </Section>

      <Section title="Controversies / Uncertainties">
        <div className="stack">
          {brief.controversiesOrUncertainties.map((item) => (
            <article key={item.issue} style={{ lineHeight: 1.6 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                {formatNarrativeText(item.issue, papersById)}
              </h3>
              <p style={{ margin: "0 0 8px" }}>
                {formatNarrativeText(item.explanation, papersById)}
              </p>
              <SourceRefs
                ids={item.sourcePaperIds}
                papersById={papersById}
                onSelect={setSelectedPaperId}
              />
              <EvidenceList
                evidence={item.evidence}
                papersById={papersById}
                onSelect={setSelectedPaperId}
              />
            </article>
          ))}
        </div>
      </Section>

      <Section title="Suggested Next Questions">
        <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.7 }}>
          {brief.suggestedNextQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
      </Section>

      <SourceAndQualityDetails brief={brief} papers={papers} />

      <Section title="Bibliography">
        <div className="stack">
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} query={alignmentQuery} />
          ))}
        </div>
      </Section>
      <SourceDrawer
        paper={selectedPaper}
        query={alignmentQuery}
        onClose={() => setSelectedPaperId(null)}
      />
    </div>
  );
}
