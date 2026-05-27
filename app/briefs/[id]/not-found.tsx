import Link from "next/link";

export default function BriefNotFound() {
  return (
    <main className="container" style={{ padding: "56px 0" }}>
      <div className="surface" style={{ padding: 28 }}>
        <h1 style={{ marginTop: 0 }}>Brief not found</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          This MVP stores generated briefs in memory. If the server restarted,
          generate the brief again.
        </p>
        <Link href="/" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
          Go back
        </Link>
      </div>
    </main>
  );
}
