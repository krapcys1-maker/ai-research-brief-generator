import type { NormalizedPaper } from "@/lib/sources/types";
import { formatDoi, getDoiUrl } from "@/lib/sources/doi";
import { getPaperInsight } from "@/lib/pipeline/paperInsights";

function formatScore(score: number | undefined) {
  return typeof score === "number" ? score.toFixed(2) : "N/A";
}

function ScoreBar({
  label,
  value
}: {
  label: string;
  value: number | undefined;
}) {
  const width = typeof value === "number" ? `${Math.round(value * 100)}%` : "0%";

  return (
    <div className="score-row">
      <div className="score-row-label">
        <span>{label}</span>
        <strong>{formatScore(value)}</strong>
      </div>
      <div className="score-track" aria-hidden="true">
        <div className="score-fill" style={{ width }} />
      </div>
    </div>
  );
}

export function PaperCard({ paper }: { paper: NormalizedPaper }) {
  const doiUrl = getDoiUrl(paper.doi);
  const insight = getPaperInsight(paper);
  const scoreRows = [
    ["Relevance", paper.relevanceScore],
    ["Citations", paper.citationScore],
    ["Recency", paper.recencyScore],
    ["Completeness", paper.completenessScore],
    ["Source", paper.sourceQualityScore],
    ["Identifiers", paper.identifierScore]
  ] as const;

  return (
    <article id={paper.id} className="surface" style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span className="badge">{paper.id}</span>
        <span className="badge">Source: {paper.source}</span>
        <span className="badge">Final score: {formatScore(paper.finalScore)}</span>
        {paper.year ? <span className="badge">{paper.year}</span> : null}
        {paper.venue ? <span className="badge">{paper.venue}</span> : null}
      </div>
      <h3 style={{ margin: "0 0 8px", fontSize: "1rem", lineHeight: 1.35 }}>
        {paper.title}
      </h3>
      <div className="paper-insight">
        <div>
          <span className="metric-label">Why read this</span>
          <p>{insight.whyRead}</p>
        </div>
        {insight.limitations.length ? (
          <div>
            <span className="metric-label">Check before relying on it</span>
            <ul className="compact-list">
              {insight.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <p style={{ margin: "0 0 10px", color: "var(--muted)", lineHeight: 1.55 }}>
        {paper.authors.join(", ")}
      </p>
      {paper.abstract ? (
        <p style={{ margin: "0 0 12px", lineHeight: 1.55 }}>{paper.abstract}</p>
      ) : null}

      <div className="score-grid" aria-label="Paper score breakdown">
        {scoreRows.map(([label, value]) => (
          <ScoreBar key={label} label={label} value={value} />
        ))}
      </div>

      <dl
        style={{
          display: "grid",
          gap: 6,
          margin: "14px 0 0",
          color: "var(--muted)",
          fontSize: "0.92rem"
        }}
      >
        <div>
          <dt style={{ display: "inline", fontWeight: 750 }}>Citations: </dt>
          <dd style={{ display: "inline", margin: 0 }}>
            {paper.citationCount ?? "unknown"}
          </dd>
        </div>
        {paper.doi ? (
          <div>
            <dt style={{ display: "inline", fontWeight: 750 }}>DOI: </dt>
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
        ) : null}
        {paper.sourceUrls[0] ? (
          <div>
            <dt style={{ display: "inline", fontWeight: 750 }}>URL: </dt>
            <dd style={{ display: "inline", margin: 0 }}>
              <a href={paper.sourceUrls[0]} target="_blank" rel="noreferrer">
                {paper.sourceUrls[0]}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
