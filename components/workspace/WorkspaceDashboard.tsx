"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WorkspaceDashboard as WorkspaceDashboardPayload } from "@/lib/workspace/dashboard";

type DashboardResponse = {
  dashboard?: WorkspaceDashboardPayload;
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
        </div>
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
