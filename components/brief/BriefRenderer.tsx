"use client";

import { useMemo, useState } from "react";
import type { ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";
import { PaperCard } from "@/components/brief/PaperCard";

function SourceRefs({
  ids,
  onSelect
}: {
  ids: string[];
  onSelect: (id: string) => void;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className="citation"
          style={{ cursor: "pointer" }}
        >
          {id}
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

function getWarningGroups(warnings: string[]) {
  const groups = warnings.reduce<
    Record<string, { label: string; detail: string; count: number }>
  >((acc, warning) => {
    const sourceMatch = warning.match(/^([a-z_]+) (failed|returned no papers):?\s*(.*)$/i);
    const queryMatch = warning.match(/^query variant "(.+)" failed:\s*(.*)$/i);
    const label = sourceMatch?.[1] ?? (queryMatch ? "query variant" : "pipeline");
    const detail = sourceMatch?.[3] || queryMatch?.[2] || warning;
    const key = `${label}:${detail}`;

    acc[key] = acc[key] ?? { label, detail, count: 0 };
    acc[key].count += 1;

    return acc;
  }, {});

  return Object.values(groups).sort((a, b) => b.count - a.count);
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
    <Section title="Source Diagnostics">
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
    </Section>
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

      <Section title="TL;DR">
        <p style={{ margin: 0, lineHeight: 1.65 }}>{brief.tldr}</p>
      </Section>

      <SearchDiagnostics brief={brief} papers={papers} />

      <Section title="Executive Summary">
        <p style={{ lineHeight: 1.65 }}>{brief.executiveSummary.paragraph}</p>
        <SourceRefs
          ids={brief.executiveSummary.sourcePaperIds}
          onSelect={setSelectedPaperId}
        />
      </Section>

      <Section title="Key Findings">
        <div className="stack">
          {brief.keyFindings.map((item) => (
            <article key={item.finding} style={{ lineHeight: 1.6 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                {item.finding}
              </h3>
              <p style={{ margin: "0 0 8px" }}>{item.explanation}</p>
              <p style={{ margin: "0 0 8px", color: "var(--muted)" }}>
                Confidence: {item.confidence}
              </p>
              {item.caveats.length ? (
                <p style={{ margin: "0 0 8px", color: "var(--warning)" }}>
                  Caveats: {item.caveats.join("; ")}
                </p>
              ) : null}
              <SourceRefs ids={item.sourcePaperIds} onSelect={setSelectedPaperId} />
            </article>
          ))}
        </div>
      </Section>

      <Section title="Major Themes">
        <div className="stack">
          {brief.majorThemes.map((item) => (
            <article key={item.theme} style={{ lineHeight: 1.6 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                {item.theme}
              </h3>
              <p style={{ margin: "0 0 8px" }}>{item.description}</p>
              <SourceRefs ids={item.sourcePaperIds} onSelect={setSelectedPaperId} />
            </article>
          ))}
        </div>
      </Section>

      <Section title="Influential Papers">
        <div className="stack">
          {brief.influentialPapers.map((item) => (
            <article key={item.paperId} style={{ lineHeight: 1.6 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                <a href={`#${item.paperId}`}>{item.paperId}</a>
              </h3>
              <p style={{ margin: 0 }}>{item.reason}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Research Gaps">
        <div className="stack">
          {brief.researchGaps.map((item) => (
            <article key={item.gap} style={{ lineHeight: 1.6 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                {item.gap}
              </h3>
              <p style={{ margin: "0 0 8px" }}>{item.whyItMatters}</p>
              <SourceRefs ids={item.sourcePaperIds} onSelect={setSelectedPaperId} />
            </article>
          ))}
        </div>
      </Section>

      <Section title="Controversies / Uncertainties">
        <div className="stack">
          {brief.controversiesOrUncertainties.map((item) => (
            <article key={item.issue} style={{ lineHeight: 1.6 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                {item.issue}
              </h3>
              <p style={{ margin: "0 0 8px" }}>{item.explanation}</p>
              <SourceRefs ids={item.sourcePaperIds} onSelect={setSelectedPaperId} />
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
