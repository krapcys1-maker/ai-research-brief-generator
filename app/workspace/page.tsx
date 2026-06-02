import Link from "next/link";
import { DeploymentPrivacyNotice } from "@/components/privacy/DeploymentPrivacyNotice";
import { WorkspaceDashboard } from "@/components/workspace/WorkspaceDashboard";

export const dynamic = "force-dynamic";

export default function WorkspacePage() {
  return (
    <main className="container" style={{ padding: "32px 0 72px" }}>
      <nav className="workspace-nav" aria-label="Workspace navigation">
        <Link className="citation" href="/">
          Briefs
        </Link>
        <Link className="citation" href="/documents">
          Documents
        </Link>
        <Link className="citation" href="/compare">
          Compare
        </Link>
      </nav>

      <section style={{ maxWidth: 820, marginBottom: 24 }}>
        <span className="badge">Research workspace</span>
        <h1
          style={{
            margin: "16px 0 10px",
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            lineHeight: 1.05,
            letterSpacing: 0
          }}
        >
          Workspace
        </h1>
      </section>

      <DeploymentPrivacyNotice />
      <WorkspaceDashboard />
    </main>
  );
}
