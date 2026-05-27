import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefRenderer } from "@/components/brief/BriefRenderer";
import { getBriefRecord } from "@/lib/storage/inMemoryBriefStore";

export const dynamic = "force-dynamic";

export default async function BriefPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = getBriefRecord(id);

  if (!record) {
    notFound();
  }

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
        Back to generator
      </Link>
      <BriefRenderer brief={record.brief} papers={record.papers} />
    </main>
  );
}
