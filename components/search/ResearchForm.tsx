"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResearchFormProps = {
  examples: string[];
};

export function ResearchForm({ examples }: ResearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(examples[0] ?? "");
  const [maxPapers, setMaxPapers] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query,
          maxPapers,
          sources: ["mock"]
        })
      });

      const payload = (await response.json()) as {
        briefId?: string;
        error?: string;
      };

      if (!response.ok || !payload.briefId) {
        throw new Error(payload.error ?? "Brief generation failed.");
      }

      router.push(`/briefs/${payload.briefId}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Brief generation failed unexpectedly."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="research-grid">
      <form className="surface stack" onSubmit={onSubmit} style={{ padding: 24 }}>
        <label className="stack" style={{ gap: 8 }}>
          <span style={{ fontWeight: 750 }}>Research query</span>
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            minLength={3}
            maxLength={300}
            required
            rows={5}
            style={{
              width: "100%",
              resize: "vertical",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 14,
              lineHeight: 1.5
            }}
          />
        </label>

        <label className="stack" style={{ gap: 8, maxWidth: 240 }}>
          <span style={{ fontWeight: 750 }}>Max papers</span>
          <select
            value={maxPapers}
            onChange={(event) => setMaxPapers(Number(event.target.value))}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 12px",
              background: "#fff"
            }}
          >
            <option value={10}>10 papers</option>
            <option value={15}>15 papers</option>
            <option value={20}>20 papers</option>
            <option value={30}>30 papers</option>
          </select>
        </label>

        {error ? (
          <div
            role="alert"
            style={{
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "var(--error)",
              borderRadius: 8,
              padding: 12,
              lineHeight: 1.5
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "fit-content",
            border: 0,
            borderRadius: 8,
            background: loading ? "#78918d" : "var(--accent)",
            color: "#fff",
            padding: "12px 18px",
            fontWeight: 800,
            cursor: loading ? "wait" : "pointer"
          }}
        >
          {loading ? "Generating..." : "Generate Brief"}
        </button>
      </form>

      <aside className="surface" style={{ padding: 22 }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Example queries</h2>
        <div className="stack" style={{ gap: 10 }}>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuery(example)}
              style={{
                textAlign: "left",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fff",
                padding: 10,
                cursor: "pointer",
                lineHeight: 1.45
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
