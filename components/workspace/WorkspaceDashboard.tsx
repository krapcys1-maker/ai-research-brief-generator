"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { WorkspaceDashboard as WorkspaceDashboardPayload } from "@/lib/workspace/dashboard";

type DashboardResponse = {
  dashboard?: WorkspaceDashboardPayload;
  status?: string;
  error?: string;
};

type ProjectResponse = {
  project?: WorkspaceDashboardPayload["recentResearchProjects"][number];
  status?: string;
  error?: string;
};

type BriefCollectionResponse = {
  collection?: WorkspaceDashboardPayload["recentBriefCollections"][number];
  status?: string;
  error?: string;
};

type DocumentCollectionResponse = {
  collection?: WorkspaceDashboardPayload["recentDocumentCollections"][number];
  status?: string;
  error?: string;
};

type PaperNoteResponse = {
  note?: WorkspaceDashboardPayload["recentPaperNotes"][number];
  status?: string;
  error?: string;
};

type ShareLinkResponse = {
  link?: WorkspaceDashboardPayload["recentShareLinks"][number];
  status?: string;
  error?: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function WorkspaceDashboard() {
  const [dashboard, setDashboard] = useState<WorkspaceDashboardPayload | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [documentCollectionError, setDocumentCollectionError] = useState<
    string | null
  >(null);
  const [paperNoteError, setPaperNoteError] = useState<string | null>(null);
  const [shareLinkError, setShareLinkError] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [isSavingDocumentCollection, setIsSavingDocumentCollection] =
    useState(false);
  const [isSavingPaperNote, setIsSavingPaperNote] = useState(false);
  const [isSavingShareLink, setIsSavingShareLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchDashboard() {
    const response = await fetch("/api/workspace/dashboard", {
      cache: "no-store"
    });
    const payload = (await response.json()) as DashboardResponse;

    if (!response.ok || !payload.dashboard) {
      throw new Error(payload.error ?? "Could not load workspace dashboard.");
    }

    return payload.dashboard;
  }

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const nextDashboard = await fetchDashboard();

      setDashboard(nextDashboard);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load workspace dashboard."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProject(true);
    setProjectError(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const response = await fetch("/api/workspace/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: formData.get("title"),
          query: formData.get("query"),
          description: formData.get("description") || null,
          sources: formData.getAll("sources")
        })
      });
      const payload = (await response.json()) as ProjectResponse;

      if (!response.ok || !payload.project) {
        throw new Error(payload.error ?? "Could not save research project.");
      }

      form.reset();
      setDashboard(await fetchDashboard());
    } catch (caught) {
      setProjectError(
        caught instanceof Error ? caught.message : "Could not save research project."
      );
    } finally {
      setIsSavingProject(false);
    }
  }

  async function saveBriefCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingCollection(true);
    setCollectionError(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const response = await fetch("/api/workspace/brief-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description") || null,
          briefIds: formData.getAll("briefIds")
        })
      });
      const payload = (await response.json()) as BriefCollectionResponse;

      if (!response.ok || !payload.collection) {
        throw new Error(payload.error ?? "Could not save brief collection.");
      }

      form.reset();
      setDashboard(await fetchDashboard());
    } catch (caught) {
      setCollectionError(
        caught instanceof Error
          ? caught.message
          : "Could not save brief collection."
      );
    } finally {
      setIsSavingCollection(false);
    }
  }

  async function saveDocumentCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingDocumentCollection(true);
    setDocumentCollectionError(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const response = await fetch("/api/workspace/document-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description") || null,
          documentIds: formData.getAll("documentIds")
        })
      });
      const payload = (await response.json()) as DocumentCollectionResponse;

      if (!response.ok || !payload.collection) {
        throw new Error(payload.error ?? "Could not save document collection.");
      }

      form.reset();
      setDashboard(await fetchDashboard());
    } catch (caught) {
      setDocumentCollectionError(
        caught instanceof Error
          ? caught.message
          : "Could not save document collection."
      );
    } finally {
      setIsSavingDocumentCollection(false);
    }
  }

  async function savePaperNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPaperNote(true);
    setPaperNoteError(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const response = await fetch("/api/workspace/paper-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paperId: formData.get("paperId"),
          note: formData.get("note")
        })
      });
      const payload = (await response.json()) as PaperNoteResponse;

      if (!response.ok || !payload.note) {
        throw new Error(payload.error ?? "Could not save paper note.");
      }

      form.reset();
      setDashboard(await fetchDashboard());
    } catch (caught) {
      setPaperNoteError(
        caught instanceof Error ? caught.message : "Could not save paper note."
      );
    } finally {
      setIsSavingPaperNote(false);
    }
  }

  async function saveShareLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingShareLink(true);
    setShareLinkError(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const response = await fetch("/api/workspace/share-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resourceType: "brief",
          resourceId: formData.get("resourceId"),
          visibility: formData.get("visibility")
        })
      });
      const payload = (await response.json()) as ShareLinkResponse;

      if (!response.ok || !payload.link) {
        throw new Error(payload.error ?? "Could not create share link.");
      }

      form.reset();
      setDashboard(await fetchDashboard());
    } catch (caught) {
      setShareLinkError(
        caught instanceof Error ? caught.message : "Could not create share link."
      );
    } finally {
      setIsSavingShareLink(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialDashboard() {
      try {
        const nextDashboard = await fetchDashboard();

        if (!cancelled) {
          setDashboard(nextDashboard);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load workspace dashboard."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="workspace-dashboard">
      <section className="surface workspace-overview">
        <div className="workspace-overview-header">
          <div>
            <h2>Workspace dashboard</h2>
            <div className="token-list">
              <span className="badge">{dashboard?.scope ?? "loading"}</span>
              <span className="badge">
                briefs: {dashboard?.briefScope ?? "loading"}
              </span>
              <span className="badge">
                docs: {dashboard?.documentScope ?? "loading"}
              </span>
              {dashboard?.workspaceId ? (
                <span className="badge">{dashboard.workspaceId}</span>
              ) : null}
            </div>
          </div>
          <button
            className="citation"
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error ? <div className="form-alert error">{error}</div> : null}

        <div className="metric-grid">
          <div className="metric">
            <span className="metric-label">Briefs</span>
            <strong>{dashboard?.totals.briefs ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="metric-label">Documents</span>
            <strong>{dashboard?.totals.documents ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="metric-label">Parsed docs</span>
            <strong>{dashboard?.totals.parsedDocuments ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="metric-label">Compare reports</span>
            <strong>{dashboard?.totals.compareReports ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="metric-label">Projects</span>
            <strong>{dashboard?.totals.researchProjects ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="metric-label">Brief collections</span>
            <strong>{dashboard?.totals.briefCollections ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="metric-label">Doc collections</span>
            <strong>{dashboard?.totals.documentCollections ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="metric-label">Paper notes</span>
            <strong>{dashboard?.totals.paperNotes ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="metric-label">Share links</span>
            <strong>{dashboard?.totals.shareLinks ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="metric-label">Exports</span>
            <strong>{dashboard?.totals.exportHistory ?? 0}</strong>
          </div>
        </div>
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Saved projects</h2>
          <span className="badge">
            {dashboard?.totals.researchProjects ?? 0}
          </span>
        </div>
        <form className="workspace-project-form" onSubmit={saveProject}>
          <input
            className="form-control"
            name="title"
            placeholder="Project title"
            minLength={3}
            maxLength={140}
            required
          />
          <textarea
            className="form-control form-textarea"
            name="query"
            placeholder="Research topic or standing query"
            rows={3}
            minLength={3}
            maxLength={500}
            required
          />
          <input
            className="form-control"
            name="description"
            placeholder="Optional context"
            maxLength={1000}
          />
          <div className="workspace-source-grid" aria-label="Project sources">
            {["arxiv", "semantic_scholar", "openalex", "mock"].map((source) => (
              <label key={source}>
                <input type="checkbox" name="sources" value={source} /> {source}
              </label>
            ))}
          </div>
          <button
            className="primary-action"
            type="submit"
            disabled={isSavingProject}
          >
            {isSavingProject ? "Saving..." : "Save project"}
          </button>
        </form>
        {projectError ? (
          <div className="form-alert error">{projectError}</div>
        ) : null}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Recent projects</h2>
          <Link className="citation" href="/">
            Start brief
          </Link>
        </div>
        {dashboard?.recentResearchProjects.length ? (
          <div className="workspace-list">
            {dashboard.recentResearchProjects.map((project) => (
              <Link href="/" key={project.id}>
                <span className="badge">{project.visibility}</span>
                <strong>{project.title}</strong>
                <span>{project.query}</span>
                {project.sources.length ? (
                  <span>{project.sources.join(", ")}</span>
                ) : null}
                <time dateTime={project.createdAt}>
                  {formatDate(project.createdAt)}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">No saved projects in this scope.</div>
        )}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Recent briefs</h2>
          <Link className="citation" href="/">
            New brief
          </Link>
        </div>
        {dashboard?.recentBriefs.length ? (
          <div className="workspace-list">
            {dashboard.recentBriefs.map((brief) => (
              <Link href={`/briefs/${brief.id}`} key={brief.id}>
                <span className="badge">{brief.outputLanguage}</span>
                <strong>{brief.title}</strong>
                <span>{brief.query}</span>
                <time dateTime={brief.generatedAt}>
                  {formatDate(brief.generatedAt)}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">No briefs in this scope.</div>
        )}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Save brief collection</h2>
          <span className="badge">{dashboard?.totals.briefCollections ?? 0}</span>
        </div>
        <form
          className="workspace-project-form"
          onSubmit={saveBriefCollection}
        >
          <input
            className="form-control"
            name="title"
            placeholder="Collection title"
            minLength={3}
            maxLength={140}
            required
          />
          <input
            className="form-control"
            name="description"
            placeholder="Optional note"
            maxLength={1000}
          />
          {dashboard?.recentBriefs.length ? (
            <div className="workspace-checkbox-list" aria-label="Collection briefs">
              {dashboard.recentBriefs.map((brief) => (
                <label key={brief.id}>
                  <input type="checkbox" name="briefIds" value={brief.id} />{" "}
                  <span>{brief.title}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="source-health-empty">
              Generate a brief before creating a collection.
            </div>
          )}
          <button
            className="primary-action"
            type="submit"
            disabled={isSavingCollection || !dashboard?.recentBriefs.length}
          >
            {isSavingCollection ? "Saving..." : "Save collection"}
          </button>
        </form>
        {collectionError ? (
          <div className="form-alert error">{collectionError}</div>
        ) : null}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Brief collections</h2>
          <span className="badge">
            {dashboard?.totals.briefCollections ?? 0}
          </span>
        </div>
        {dashboard?.recentBriefCollections.length ? (
          <div className="workspace-list">
            {dashboard.recentBriefCollections.map((collection) => (
              <Link href="/workspace" key={collection.id}>
                <span className="badge">{collection.briefCount} brief(s)</span>
                <strong>{collection.title}</strong>
                {collection.description ? <span>{collection.description}</span> : null}
                <time dateTime={collection.createdAt}>
                  {formatDate(collection.createdAt)}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">
            No brief collections in this scope.
          </div>
        )}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Paper note</h2>
          <span className="badge">{dashboard?.totals.paperNotes ?? 0}</span>
        </div>
        <form className="workspace-project-form" onSubmit={savePaperNote}>
          {dashboard?.recentPapers.length ? (
            <select className="form-control" name="paperId" required>
              <option value="">Select paper</option>
              {dashboard.recentPapers.map((paper) => (
                <option value={paper.id} key={paper.id}>
                  {paper.title}
                </option>
              ))}
            </select>
          ) : (
            <div className="source-health-empty">
              Generate a brief before adding paper notes.
            </div>
          )}
          <textarea
            className="form-control form-textarea"
            name="note"
            placeholder="Add a note or comment"
            rows={4}
            minLength={3}
            maxLength={2000}
            required
          />
          <button
            className="primary-action"
            type="submit"
            disabled={isSavingPaperNote || !dashboard?.recentPapers.length}
          >
            {isSavingPaperNote ? "Saving..." : "Save note"}
          </button>
        </form>
        {paperNoteError ? (
          <div className="form-alert error">{paperNoteError}</div>
        ) : null}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Share brief</h2>
          <span className="badge">{dashboard?.totals.shareLinks ?? 0}</span>
        </div>
        <form className="workspace-project-form" onSubmit={saveShareLink}>
          {dashboard?.recentBriefs.length ? (
            <select className="form-control" name="resourceId" required>
              <option value="">Select brief</option>
              {dashboard.recentBriefs.map((brief) => (
                <option value={brief.id} key={brief.id}>
                  {brief.title}
                </option>
              ))}
            </select>
          ) : (
            <div className="source-health-empty">
              Generate a brief before creating a share link.
            </div>
          )}
          <select className="form-control" name="visibility" required>
            <option value="private">Private link</option>
            <option value="workspace">Workspace link</option>
            <option value="public">Public link</option>
          </select>
          <button
            className="primary-action"
            type="submit"
            disabled={isSavingShareLink || !dashboard?.recentBriefs.length}
          >
            {isSavingShareLink ? "Creating..." : "Create share link"}
          </button>
        </form>
        {shareLinkError ? (
          <div className="form-alert error">{shareLinkError}</div>
        ) : null}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Share links</h2>
          <span className="badge">{dashboard?.totals.shareLinks ?? 0}</span>
        </div>
        {dashboard?.recentShareLinks.length ? (
          <div className="workspace-list">
            {dashboard.recentShareLinks.map((link) => (
              <Link href="/workspace" key={link.id}>
                <span className="badge">{link.visibility}</span>
                <strong>{link.title}</strong>
                <span>{`/share/${link.token}`}</span>
                <time dateTime={link.createdAt}>
                  {formatDate(link.createdAt)}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">
            No share links in this scope.
          </div>
        )}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Export history</h2>
          <span className="badge">{dashboard?.totals.exportHistory ?? 0}</span>
        </div>
        {dashboard?.recentExportHistory.length ? (
          <div className="workspace-list">
            {dashboard.recentExportHistory.map((item) => (
              <Link href={`/briefs/${item.resourceId}`} key={item.id}>
                <span className="badge">{item.format}</span>
                <strong>{item.title}</strong>
                <span>{item.filename}</span>
                <time dateTime={item.exportedAt}>
                  {formatDate(item.exportedAt)}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">
            No exports in this scope.
          </div>
        )}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Paper notes</h2>
          <span className="badge">{dashboard?.totals.paperNotes ?? 0}</span>
        </div>
        {dashboard?.recentPaperNotes.length ? (
          <div className="workspace-list">
            {dashboard.recentPaperNotes.map((note) => (
              <Link href="/workspace" key={note.id}>
                <span className="badge">{note.visibility}</span>
                <strong>{note.paperId}</strong>
                <span>{note.note}</span>
                <time dateTime={note.createdAt}>
                  {formatDate(note.createdAt)}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">
            No paper notes in this scope.
          </div>
        )}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Recent documents</h2>
          <Link className="citation" href="/documents">
            Documents
          </Link>
        </div>
        {dashboard?.recentDocuments.length ? (
          <div className="workspace-list">
            {dashboard.recentDocuments.map((document) => (
              <Link href="/documents" key={document.id}>
                <span className="badge">{document.status}</span>
                <strong>{document.filename}</strong>
                <span>{formatSize(document.sizeBytes)}</span>
                <time dateTime={document.createdAt}>
                  {formatDate(document.createdAt)}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">No documents in this scope.</div>
        )}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Save document collection</h2>
          <span className="badge">
            {dashboard?.totals.documentCollections ?? 0}
          </span>
        </div>
        <form
          className="workspace-project-form"
          onSubmit={saveDocumentCollection}
        >
          <input
            className="form-control"
            name="title"
            placeholder="Collection title"
            minLength={3}
            maxLength={140}
            required
          />
          <input
            className="form-control"
            name="description"
            placeholder="Optional note"
            maxLength={1000}
          />
          {dashboard?.recentDocuments.length ? (
            <div className="workspace-checkbox-list" aria-label="Collection documents">
              {dashboard.recentDocuments.map((document) => (
                <label key={document.id}>
                  <input type="checkbox" name="documentIds" value={document.id} />{" "}
                  <span>{document.filename}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="source-health-empty">
              Upload a document before creating a collection.
            </div>
          )}
          <button
            className="primary-action"
            type="submit"
            disabled={isSavingDocumentCollection || !dashboard?.recentDocuments.length}
          >
            {isSavingDocumentCollection ? "Saving..." : "Save collection"}
          </button>
        </form>
        {documentCollectionError ? (
          <div className="form-alert error">{documentCollectionError}</div>
        ) : null}
      </section>

      <section className="surface workspace-panel">
        <div className="workspace-panel-header">
          <h2>Document collections</h2>
          <span className="badge">
            {dashboard?.totals.documentCollections ?? 0}
          </span>
        </div>
        {dashboard?.recentDocumentCollections.length ? (
          <div className="workspace-list">
            {dashboard.recentDocumentCollections.map((collection) => (
              <Link href="/documents" key={collection.id}>
                <span className="badge">{collection.documentCount} document(s)</span>
                <strong>{collection.title}</strong>
                {collection.description ? <span>{collection.description}</span> : null}
                <time dateTime={collection.createdAt}>
                  {formatDate(collection.createdAt)}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">
            No document collections in this scope.
          </div>
        )}
      </section>

      <section className="surface workspace-panel workspace-wide-panel">
        <div className="workspace-panel-header">
          <h2>Saved Compare reports</h2>
          <Link className="citation" href="/compare">
            Compare
          </Link>
        </div>
        {dashboard?.recentCompareReports.length ? (
          <div className="workspace-list workspace-report-list">
            {dashboard.recentCompareReports.map((report) => (
              <Link href="/compare" key={report.id}>
                <span className="badge">{report.claimCount} claim(s)</span>
                <strong>{report.title}</strong>
                <span>{report.summary}</span>
                <time dateTime={report.createdAt}>
                  {formatDate(report.createdAt)}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="source-health-empty">
            No saved Compare reports in this scope.
          </div>
        )}
      </section>
    </div>
  );
}
