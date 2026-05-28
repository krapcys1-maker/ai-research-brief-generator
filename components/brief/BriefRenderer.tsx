"use client";

import { useMemo, useState } from "react";
import type { ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";
import { PaperCard } from "@/components/brief/PaperCard";

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

  return (
    <section className="quality-panel" aria-label="Brief quality summary">
      <div>
        <span className="metric-label">Brief quality</span>
        <strong>{quality.label}</strong>
        <p>{quality.description}</p>
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
        <span className="metric-label">Average relevance</span>
        <strong>{quality.averageRelevance.toFixed(2)}</strong>
        <p>{brief.searchSummary.warnings.length} source warning(s)</p>
      </div>
    </section>
  );
}

function ReadingPath({
  papers,
  onSelect
}: {
  papers: NormalizedPaper[];
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
      <div className="reading-path">
        {topPapers.map((paper, index) => (
          <article key={paper.id}>
            <span className="badge">#{index + 1}</span>
            <h3>{paper.title}</h3>
            <p>
              {formatCitationLabel(paper, paper.id)}
              {paper.venue ? `, ${paper.venue}` : ""}
            </p>
            <button
              type="button"
              className="citation"
              onClick={() => onSelect(paper.id)}
            >
              Source details
            </button>
          </article>
        ))}
      </div>
    </Section>
  );
}


function WarningSummary({ warnings }: { warnings: string[] }) {
  if (!warnings.length) {
    return null;
  }

  const groups = getWarningGroups(warnings);

  return (
    <div className="warning-panel" role="status">
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
    <details className="surface diagnostics-details">
      <summary>Technical Source Diagnostics</summary>
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
    </details>
  );
}

function SourceDrawer({
  paper,
  onClose
}: {
  paper: NormalizedPaper | null;
  onClose: () => void;
}) {
  if (!paper) {
    return null;
  }

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
            <dd style={{ display: "inline", margin: 0 }}>{paper.doi ?? "N/A"}</dd>
          </div>
        </dl>
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
          Generated: {new Date(brief.generatedAt).toLocaleString()}
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

      <QualitySummary brief={brief} papers={papers} />

      <Section title="TL;DR">
        <p style={{ margin: 0, lineHeight: 1.65 }}>{brief.tldr}</p>
      </Section>

      <ReadingPath papers={papers} onSelect={setSelectedPaperId} />

      <SearchDiagnostics brief={brief} papers={papers} />

      <Section title="Executive Summary">
        <p style={{ lineHeight: 1.65 }}>
          {formatNarrativeText(brief.executiveSummary.paragraph, papersById)}
        </p>
        <SourceRefs
          ids={brief.executiveSummary.sourcePaperIds}
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

      <Section title="Bibliography">
        <div className="stack">
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </div>
      </Section>
      <SourceDrawer paper={selectedPaper} onClose={() => setSelectedPaperId(null)} />
    </div>
  );
}
