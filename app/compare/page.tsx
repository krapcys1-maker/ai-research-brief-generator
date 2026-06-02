import Link from "next/link";
import { CompareWorkspace } from "@/components/claim-check/CompareWorkspace";
import { DeploymentPrivacyNotice } from "@/components/privacy/DeploymentPrivacyNotice";

export default function CompareWithSciencePage() {
  return (
    <main>
      <section className="container" style={{ padding: "42px 0 24px" }}>
        <Link className="citation" href="/">
          Back to generator
        </Link>
        <div style={{ maxWidth: 840, marginTop: 20 }}>
          <span className="badge">Source-grounded comparison</span>
          <h1 style={{ margin: "16px 0 10px", fontSize: "2.2rem" }}>
            Compare With Science
          </h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Upload or paste text, select claims, and compare them with retrieved
            scientific sources. This is not a definitive scientific review.
          </p>
        </div>
      </section>

      <section className="container" style={{ padding: "0 0 64px" }}>
        <DeploymentPrivacyNotice />
        <CompareWorkspace />
      </section>
    </main>
  );
}
