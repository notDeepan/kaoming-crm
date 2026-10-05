import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { attributions, leakageCategories, recoveryStatuses } from '@/db/enums';
import { leakageDealOptions, listLeakage } from '@/features/commercial/leakage';
import { recordLeakageAction } from '@/features/commercial/leakage-actions';
import { requireRole } from '@/lib/authorization';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
export default async function LeakagePage({ searchParams }: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireRole('admin', 'manager', 'finance', 'sales');
  const [query, entries, deals] = await Promise.all([searchParams, listLeakage(), leakageDealOptions()]);
  return <div className="space-y-6"><PageHeader eyebrow="COMMERCIAL" title="Margin leakage register"
    description="Record each concession or loss once against the deal, with when it arose and who bears it. Claim settlements create their own linked entry automatically." />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    <section className={card}><h2 className="font-semibold">Record a loss or concession</h2>
      <form action={recordLeakageAction} className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm">Deal<select name="dealId" required className={control}><option value="">Select deal</option>{deals.map((deal) =>
          <option key={deal.id} value={deal.id}>{deal.number}</option>)}</select></label>
        <label className="text-sm">Category<select name="category" className={control}>{leakageCategories.map((category) =>
          <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="text-sm">Incurred on<input type="date" name="incurredOn" required className={control} /></label>
        <label className="text-sm">Amount<input type="number" name="amount" step="0.01" min="0.01" required className={control} /></label>
        <label className="text-sm">Currency<input name="currency" defaultValue="USD" maxLength={3} required className={control} /></label>
        <label className="text-sm">Attribution<select name="attribution" className={control}>{attributions.map((attribution) =>
          <option key={attribution} value={attribution}>{attribution.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="text-sm">Recovery status<select name="recoveryStatus" className={control}>{recoveryStatuses.map((status) =>
          <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="text-sm md:col-span-2">Notes<textarea name="notes" rows={2} className={control} /></label>
        <div className="md:col-span-3"><button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Record leakage</button></div>
      </form></section>
    <section className={card}><h2 className="font-semibold">Entries · {entries.length}</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Incurred</th><th>Deal</th><th>Category</th><th>Amount</th><th>Attribution</th><th>Recovery</th><th>Source</th></tr></thead>
        <tbody>{entries.map((row) => <tr key={row.entry.id} className="border-b border-slate-100"><td className="py-3">{row.entry.incurredOn}</td>
          <td><Link href={`/deals/${row.entry.dealId}`} className="text-brand underline">{row.dealNumber}</Link></td>
          <td>{row.entry.category.replaceAll('_', ' ')}</td><td>{row.entry.currency} {row.entry.amount}</td>
          <td>{row.entry.attribution.replaceAll('_', ' ')}</td><td>{row.entry.recoveryStatus.replaceAll('_', ' ')}</td>
          <td>{row.entry.sourceClaimId ? 'Claim settlement' : 'Manual'}</td></tr>)}</tbody></table>
        {!entries.length && <p className="mt-4 text-sm text-slate-500">No leakage entries recorded.</p>}</div></section>
  </div>;
}
