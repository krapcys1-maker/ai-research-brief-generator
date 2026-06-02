"use client";

import { useState } from "react";
import type {
  AskDocumentsAnswer,
  UserDocument
} from "@/lib/documents/schemas";
import type { DocumentPrivacyPolicy } from "@/lib/documents/privacy";

type UploadPayload = {
  status: string;
  document?: UserDocument;
  chunkCount?: number;
  privacy?: DocumentPrivacyPolicy;
  error?: string;
};

type DocumentsPayload = {
  documents: UserDocument[];
  privacy?: DocumentPrivacyPolicy;
};

type AskPayload = {
  status: string;
  answer?: AskDocumentsAnswer;
  error?: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentWorkspace({
  initialDocuments = [],
  initialPrivacy
}: {
  initialDocuments?: UserDocument[];
  initialPrivacy: DocumentPrivacyPolicy;
}) {
  const [documents, setDocuments] = useState<UserDocument[]>(initialDocuments);
  const [privacy, setPrivacy] = useState(initialPrivacy);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskDocumentsAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);

  async function refreshDocuments() {
    const response = await fetch("/api/documents", { cache: "no-store" });
    const payload = (await response.json()) as DocumentsPayload;
    setDocuments(payload.documents ?? []);
    if (payload.privacy) {
      setPrivacy(payload.privacy);
    }
    setSelectedIds((current) =>
      current.filter((id) => payload.documents?.some((document) => document.id === id))
    );
  }

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setAnswer(null);
    setUploading(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as UploadPayload;

      if (!response.ok || payload.status === "error") {
        if (payload.privacy) {
          setPrivacy(payload.privacy);
        }
        throw new Error(payload.error ?? "Document upload failed.");
      }

      if (payload.status === "failed") {
        setError(
          payload.document?.errorMessage ??
            "Document was stored but text extraction failed."
        );
      }

      form.reset();
      await refreshDocuments();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(id: string) {
    setError(null);
    const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not delete document.");
      return;
    }

    setSelectedIds((current) => current.filter((item) => item !== id));
    await refreshDocuments();
  }

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setAnswer(null);
    setAsking(true);

    try {
      const response = await fetch("/api/documents/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          documentIds: selectedIds.length ? selectedIds : undefined
        })
      });
      const payload = (await response.json()) as AskPayload;

      if (!response.ok || payload.status !== "completed" || !payload.answer) {
        throw new Error(payload.error ?? "Document question failed.");
      }

      setAnswer(payload.answer);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Question failed.");
    } finally {
      setAsking(false);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  const parsedDocuments = documents.filter((document) => document.status === "parsed");

  return (
    <div className="documents-grid">
      <section className="surface document-panel">
        <h2>Upload documents</h2>
        <div className="privacy-note">
          <strong>Privacy boundary</strong>
          <p>{privacy.storageBoundary}</p>
          <p>{privacy.retrievalBoundary}</p>
          <p>{privacy.deletionPolicy}</p>
          <p>{privacy.retentionPolicy}</p>
          <p>{privacy.productionWarning}</p>
        </div>
        <form onSubmit={uploadFile} className="stack">
          <input
            className="form-control"
            name="file"
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            disabled={uploading || !privacy.uploadsEnabled}
            required
          />
          <button
            className="primary-action"
            type="submit"
            disabled={uploading || !privacy.uploadsEnabled}
          >
            {uploading ? "Uploading..." : "Upload and index"}
          </button>
          {!privacy.uploadsEnabled ? (
            <p className="preflight-paper-warning">
              Document uploads are disabled for this deployment.
            </p>
          ) : null}
        </form>
      </section>

      <section className="surface document-panel">
        <h2>Private documents</h2>
        {documents.length ? (
          <div className="document-list">
            {documents.map((document) => (
              <article key={document.id} className="document-card">
                <label>
                  <input
                    type="checkbox"
                    disabled={document.status !== "parsed"}
                    checked={selectedIds.includes(document.id)}
                    onChange={() => toggleSelection(document.id)}
                  />{" "}
                  <strong>{document.filename}</strong>
                </label>
                <div className="token-list">
                  <span className="badge">{document.status}</span>
                  <span className="badge">{formatSize(document.sizeBytes)}</span>
                  <span className="badge">{document.privacyScope}</span>
                  <span className="badge">private session</span>
                </div>
                {document.errorMessage ? (
                  <p className="preflight-paper-warning">{document.errorMessage}</p>
                ) : null}
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => void deleteDocument(document.id)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p>No private documents uploaded yet.</p>
        )}
      </section>

      <section className="surface document-panel document-ask-panel">
        <h2>Ask My Documents</h2>
        <p>
          Answers are grounded only in retrieved private chunks. Unsupported
          questions return an explicit insufficient-evidence answer.
        </p>
        <form onSubmit={ask} className="stack">
          <textarea
            className="form-control form-textarea"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What does my uploaded document say about the method?"
            rows={4}
            minLength={3}
            maxLength={500}
            required
          />
          <button
            className="primary-action"
            type="submit"
            disabled={asking || !parsedDocuments.length}
          >
            {asking ? "Checking documents..." : "Ask documents"}
          </button>
        </form>
      </section>

      {error ? (
        <section className="form-alert error" role="alert">
          <strong>Document workflow issue</strong>
          <span>{error}</span>
        </section>
      ) : null}

      {answer ? (
        <section className="surface document-panel document-answer">
          <div className="token-list">
            <span className="badge">Confidence: {answer.confidence}</span>
            <span className="badge">
              {answer.notAnswerableFromDocuments
                ? "insufficient_evidence"
                : "uploaded_document_supported"}
            </span>
          </div>
          <h2>Answer</h2>
          <p>{answer.answer}</p>
          {answer.evidenceSnippets.length ? (
            <div className="evidence-list">
              <strong>Cited snippets</strong>
              {answer.evidenceSnippets.map((snippet) => (
                <blockquote key={snippet.id}>
                  <p>{snippet.text}</p>
                  <footer>
                    <span className="badge">{snippet.evidenceLevel}</span>
                    <span className="citation">{snippet.documentId}</span>
                    <span className="citation">{snippet.chunkId}</span>
                  </footer>
                </blockquote>
              ))}
            </div>
          ) : null}
          {answer.limitations.length ? (
            <div>
              <h3 className="compact-heading">Limitations</h3>
              <ul className="compact-list">
                {answer.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
