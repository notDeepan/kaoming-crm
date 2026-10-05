import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { openPartsRequestAction } from '@/features/parts/actions';
import { listPartsRequests, partsOptions } from '@/features/parts/service';
import { requireUser } from '@/lib/authorization';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
export default async function AftermarketPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [user, query, rows, [agents, machines]] = await Promise.all([
    requireUser(), searchParams, listPartsRequests(), partsOptions(),
  ]);
  const editable = ['admin', 'manager', 'sales', 'logistics', 'service'].includes(user.role);
  const undeterminable = rows.filter((row) => row.request.warrantyDetermination === 'undeterminable');
  return <div className="space-y-6"><PageHeader eyebrow="AFTERMARKET" title="Spare parts requests"
    description="Track identification, stock, pricing and quotation as separate handoffs. Missing acceptance dates stay visible." />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    <div className="grid gap-4 sm:grid-cols-3"><div className={card}><div className="text-xs uppercase text-slate-500">Requests · count</div><strong className="mt-1 block text-2xl">{rows.length}</strong></div>
      <div className={card}><div className="text-xs uppercase text-slate-500">Warranty undeterminable · count</div><strong className="mt-1 block text-2xl text-amber-700">{undeterminable.length}</strong><p className="text-xs text-slate-500">Missing machine or acceptance date</p></div>
      <div className={card}><div className="text-xs uppercase text-slate-500">Awaiting identification or pricing · count</div><strong className="mt-1 block text-2xl">{rows.filter((row) => ['awaiting_identification', 'awaiting_pricing'].includes(row.request.status)).length}</strong></div></div>
    {editable && <section className={card}><h2 className="font-semibold">New parts enquiry</h2>
      <form action={openPartsRequestAction} className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm">Agent<select name="partnerId" required className={control}><option value="">Select agent</option>
          {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
        <label className="text-sm">Machine serial, if known<select name="machineId" className={control}><option value="">Unknown machine</option>
          {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.serialNumber}</option>)}</select></label>
        <label className="text-sm">Quantity<input name="quantity" type="number" min="1" max="1000" defaultValue={1} required className={control} /></label>
        <label className="text-sm md:col-span-3">Customer description or symptom<textarea name="description" rows={3} required className={control} /></label>
        <div className="md:col-span-3"><button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Open request</button></div>
      </form></section>}
    <section className={card}><h2 className="font-semibold">Request queue</h2><div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[730px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Request</th><th>Agent / machine</th><th>Requested part</th><th>Warranty</th><th>Status</th><th>Received</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.request.id} className="border-b border-slate-100"><td className="py-3"><Link href={`/aftermarket/${row.request.id}`} className="font-medium text-brand underline">{row.request.requestNumber}</Link></td>
          <td>{row.partnerName}<span className="block text-xs text-slate-500">{row.serialNumber ?? 'Machine unknown'}</span></td>
          <td>{row.request.requestedDescription}</td>
          <td className={row.request.warrantyDetermination === 'undeterminable' ? 'font-medium text-amber-700' : ''}>{row.request.warrantyDetermination.replaceAll('_', ' ')}</td>
          <td>{row.request.status.replaceAll('_', ' ')}</td><td>{row.request.requestedAt.toISOString().slice(0, 10)}</td></tr>)}</tbody></table>
      {!rows.length && <p className="mt-4 text-sm text-slate-500">No spare parts enquiries yet.</p>}</div></section>
  </div>;
}
