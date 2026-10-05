import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { PageHeader } from '@/components/page-header';
import { getDb } from '@/db/client';
import { auditLog, users } from '@/db/schema';
import { requireRole } from '@/lib/authorization';

export default async function AuditPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole('admin');
  const { page: rawPage } = await searchParams;
  const parsed = Number(rawPage);
  const page = Number.isInteger(parsed) && parsed > 0 && parsed <= 100_000 ? parsed : 1;
  const rows = await getDb().select({ entry: auditLog, actor: users.name })
    .from(auditLog).leftJoin(users, eq(users.id, auditLog.actorId))
    .orderBy(desc(auditLog.at), desc(auditLog.id)).limit(100).offset((page - 1) * 100);
  return <div className="space-y-6"><Link href="/settings" className="text-sm text-brand underline">← Settings</Link>
    <PageHeader eyebrow="ACCESS / AUDIT" title="Change history" description="Database captured changes to business records. File contents and password hashes are excluded. Earlier records predate the audit migration." />
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">At</th><th>Table</th><th>Record</th><th>Action</th><th>Actor</th><th>Details</th></tr></thead><tbody>{rows.map(({ entry, actor }) => <tr key={entry.id} className="border-b border-slate-100 align-top"><td className="py-2 pr-3 whitespace-nowrap">{entry.at.toISOString()}</td><td className="pr-3">{entry.entityTable}</td><td className="pr-3 font-mono text-xs">{entry.entityId}</td><td className="pr-3">{entry.action}</td><td className="pr-3">{actor ?? entry.actorId ?? 'System / unknown'}</td><td><details><summary className="cursor-pointer text-brand">Before / after</summary><pre className="mt-2 max-h-80 max-w-xl overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}</pre></details></td></tr>)}</tbody></table></div>
      {!rows.length && <p className="mt-3 text-sm text-slate-500">No audit entries on this page.</p>}
      <nav className="mt-4 flex gap-4 text-sm">{page > 1 && <Link href={`/settings/audit?page=${page - 1}`} className="text-brand underline">Previous</Link>}{rows.length === 100 && <Link href={`/settings/audit?page=${page + 1}`} className="text-brand underline">Next</Link>}</nav>
    </section></div>;
}
