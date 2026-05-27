import type { ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";
import { PaperCard } from "@/components/brief/PaperCard";

function SourceRefs({ ids }: { ids: string[] }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {ids.map((id) => (
        <a key={id} href={`#${id}`} className="citation">
          {id}
        </a>
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

export function BriefRenderer({
  brief,
  papers
}: {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
}) {
  return (
    <div className="stack" style={{ gap: 20 }}>
      <header className="surface" style={{ padding: 28 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge">Language: {brief.outputLanguage}</span>
          <span className="badge">
            Papers used: {brief.searchSummary.totalUsedInBrief}
          </span>
        </div>
        <h1 style={{ margin: "16px 0 10px", fontSize: "2rem", lineHeight: 1.15 }}>
          {brief.title}
        </h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          Query: {brief.query}
        </p>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: "8px 0 0" }}>
          Generated: {new Date(brief.generatedAt).toLocaleString()}
        </p>
      </header>

      <Section title="TL;DR">
        <p style={{ margin: 0, lineHeight: 1.65 }}>{brief.tldr}</p>
      </Section>

      <Section title="Executive Summary">
        <p style={{ lineHeight: 1.65 }}>{brief.executiveSummary.paragraph}</p>
        <SourceRefs ids={brief.executiveSummary.sourcePaperIds} />
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
              <SourceRefs ids={item.sourcePaperIds} />
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
              <SourceRefs ids={item.sourcePaperIds} />
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
              <SourceRefs ids={item.sourcePaperIds} />
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
              <SourceRefs ids={item.sourcePaperIds} />
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
    </div>
  );
}
