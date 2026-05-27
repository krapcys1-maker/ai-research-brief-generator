import type { NormalizedPaper } from "@/lib/sources/types";

export function PaperCard({ paper }: { paper: NormalizedPaper }) {
  return (
    <article id={paper.id} className="surface" style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span className="badge">{paper.id}</span>
        {paper.year ? <span className="badge">{paper.year}</span> : null}
        {paper.venue ? <span className="badge">{paper.venue}</span> : null}
      </div>
      <h3 style={{ margin: "0 0 8px", fontSize: "1rem", lineHeight: 1.35 }}>
        {paper.title}
      </h3>
      <p style={{ margin: "0 0 10px", color: "var(--muted)", lineHeight: 1.55 }}>
        {paper.authors.join(", ")}
      </p>
      {paper.abstract ? (
        <p style={{ margin: "0 0 12px", lineHeight: 1.55 }}>{paper.abstract}</p>
      ) : null}
      <dl
        style={{
          display: "grid",
          gap: 6,
          margin: 0,
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
            <dd style={{ display: "inline", margin: 0 }}>{paper.doi}</dd>
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
