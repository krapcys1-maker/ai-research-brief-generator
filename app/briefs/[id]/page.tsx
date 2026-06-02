import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BriefRenderer } from "@/components/brief/BriefRenderer";
import {
  canAccessBrief,
  getBriefHistorySessionFromCookieStore
} from "@/lib/briefs/access";
import { getBriefRepository } from "@/lib/storage/repository";

export const dynamic = "force-dynamic";

export default async function BriefPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const briefRepository = await getBriefRepository();
  const record = await briefRepository.getById(id);

  if (!record) {
    notFound();
  }

  const cookieStore = await cookies();
  if (!canAccessBrief(record, getBriefHistorySessionFromCookieStore(cookieStore))) {
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
