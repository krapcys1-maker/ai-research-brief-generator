import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { BriefRenderer } from "@/components/brief/BriefRenderer";
import {
  canAccessBrief,
  getBriefHistorySessionFromCookieStore,
  getBriefTrustedIdentityFromHeaders,
  getBriefUserAccessContext
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
  const headerStore = await headers();
  const { ownerId, workspaceId } = getBriefTrustedIdentityFromHeaders(headerStore);
  const access = ownerId
    ? getBriefUserAccessContext(ownerId, workspaceId)
    : getBriefHistorySessionFromCookieStore(cookieStore);

  if (!canAccessBrief(record, access)) {
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
