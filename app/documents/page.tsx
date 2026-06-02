import Link from "next/link";
import { headers } from "next/headers";
import { DocumentWorkspace } from "@/components/documents/DocumentWorkspace";
import { getDocumentPrivacyPolicy } from "@/lib/documents/privacy";
import { getDocumentAccessContext } from "@/lib/documents/access";
import { getDocumentRepository } from "@/lib/documents/repository";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const requestHeaders = await headers();
  const access = getDocumentAccessContext(
    new Request("http://localhost/documents", { headers: requestHeaders })
  );
  const initialDocuments =
    access.ownerId || access.sessionId
      ? await (await getDocumentRepository()).listDocuments(access.source)
      : [];

  return (
    <main className="container" style={{ padding: "32px 0 72px" }}>
      <Link
        href="/"
        style={{
          display: "inline-flex",
          marginBottom: 18,
          color: "var(--accent-strong)",
          fontWeight: 700,
          textDecoration: "none"
        }}
      >
        Back to research briefs
      </Link>
      <section style={{ maxWidth: 820, marginBottom: 24 }}>
        <span className="badge">Private document Q&A</span>
        <h1
          style={{
            margin: "16px 0 10px",
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            lineHeight: 1.05,
            letterSpacing: 0
          }}
        >
          Ask My Documents
        </h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          Upload PDF, TXT, or MD files and ask questions grounded only in your
          private document chunks. If the uploaded documents do not support an
          answer, the app must say so.
        </p>
      </section>
      <DocumentWorkspace
        initialDocuments={initialDocuments}
        initialPrivacy={getDocumentPrivacyPolicy(access)}
      />
    </main>
  );
}
