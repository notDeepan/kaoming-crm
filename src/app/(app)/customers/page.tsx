import { desc, eq, isNull } from 'drizzle-orm';
import { PageHeader } from '@/components/page-header';
import { getDb } from '@/db/client';
import { customers, partners } from '@/db/schema';
import { createCustomerAction } from '@/features/customers/actions';
import { requireUser } from '@/lib/authorization';

const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const [user, query, rows, partnerRows] = await Promise.all([
    requireUser(), searchParams,
    getDb().select({ id: customers.id, name: customers.name, countryCode: customers.countryCode,
      industry: customers.industry, source: customers.source, partnerName: partners.name,
    }).from(customers).innerJoin(partners, eq(partners.id, customers.partnerId))
      .where(isNull(customers.deletedAt)).orderBy(desc(customers.createdAt)),
    getDb().select({ id: partners.id, code: partners.code, name: partners.name }).from(partners)
      .where(isNull(partners.deletedAt)).orderBy(partners.name),
  ]);
  const canEdit = ['admin', 'manager', 'sales'].includes(user.role);
  return <div className="space-y-6">
    <PageHeader eyebrow="CHANNEL / 客戶" title="End customers" description="Customers belong to the partner who disclosed them. They can be linked to machine deals." />
    {query.error && <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    {canEdit && <form action={createCustomerAction} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
      <h2 className="text-lg font-semibold md:col-span-2">Add customer</h2>
      <label className="text-sm font-medium">Partner<select name="partnerId" required className={control}><option value="">Select partner</option>{partnerRows.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></label>
      <label className="text-sm font-medium">Customer name<input name="name" required className={control} /></label>
      <label className="text-sm font-medium">Country code<input name="countryCode" maxLength={2} placeholder="IN" className={control} /></label>
      <label className="text-sm font-medium">Industry<input name="industry" className={control} /></label>
      <label className="text-sm font-medium">Source<select name="source" className={control}><option value="agent_disclosed">Agent disclosed</option><option value="fat_visit">FAT visit</option><option value="warranty_registration">Warranty registration</option></select></label>
      <div className="flex items-end"><button className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white">Add customer</button></div>
    </form>}
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-muted"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Partner</th><th className="px-5 py-3">Country</th><th className="px-5 py-3">Industry</th><th className="px-5 py-3">Source</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 font-medium">{row.name}</td><td className="px-5 py-4">{row.partnerName}</td><td className="px-5 py-4">{row.countryCode ?? '—'}</td><td className="px-5 py-4">{row.industry ?? '—'}</td><td className="px-5 py-4 capitalize">{row.source?.replaceAll('_', ' ') ?? '—'}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-8 text-center text-sm text-muted">No end customers recorded yet.</p>}</div>
  </div>;
}
