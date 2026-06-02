import { BriefHistoryPanel } from "@/components/search/BriefHistoryPanel";
import { DeploymentPrivacyNotice } from "@/components/privacy/DeploymentPrivacyNotice";
import { ResearchForm } from "@/components/search/ResearchForm";
import { SourceHealthPanel } from "@/components/search/SourceHealthPanel";

const examples = [
  "retrieval augmented generation in medical diagnosis",
  "wykrywanie halucynacji w modelach językowych",
  "AI agents in software engineering",
  "graph neural networks for drug discovery"
];

export default function HomePage() {
  return (
    <main>
      <section className="container" style={{ padding: "56px 0 24px" }}>
        <div style={{ maxWidth: 780 }}>
          <span className="badge">Source-grounded pipeline</span>
          <h1
            style={{
              margin: "18px 0 12px",
              fontSize: "clamp(2rem, 6vw, 4rem)",
              lineHeight: 1.05,
              letterSpacing: 0
            }}
          >
            AI Research Brief Generator
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1.08rem", lineHeight: 1.7 }}>
            Generate a structured research brief from mock data or live academic
            sources, with every claim validated against selected paper IDs before
            the result is shown.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <a className="citation" href="/documents">
              Ask My Documents
            </a>
            <a className="citation" href="/compare">
              Compare With Science
            </a>
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: "12px 0 64px" }}>
        <DeploymentPrivacyNotice />
        <ResearchForm examples={examples} />
      </section>

      <section className="container" style={{ padding: "0 0 64px" }}>
        <div className="home-diagnostics-grid">
          <BriefHistoryPanel />
          <SourceHealthPanel />
        </div>
      </section>
    </main>
  );
}
