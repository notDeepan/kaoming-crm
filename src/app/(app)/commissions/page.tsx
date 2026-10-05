import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { claimCommissionAction, settleCommissionAction } from '@/features/commercial/actions';
import { listCommissions, listPenaltyExposures } from '@/features/commercial/service';
import { requireRole } from '@/lib/authorization';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
export default async function CommissionsPage({ searchParams }: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireRole('admin', 'manager', 'finance');
  const [query, rows, exposures] = await Promise.all([
    searchParams, listCommissions(), listPenaltyExposures(),
  ]);
  return <div className="space-y-6"><PageHeader eyebrow="COMMERCIAL" title="Commission and penalty exposure"
    description="Commission is locked at order confirmation, becomes due at machine acceptance, then can be claimed and settled. Penalty exposure is refreshed by the nightly job." />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    <section className={card}><h2 className="font-semibold">Commission accruals · {rows.length} orders</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Order / agent</th><th>Model</th><th>Accrued</th><th>Due at acceptance</th><th>Claimed / variance</th><th>State / action</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.commission.id} className="border-b border-slate-100"><td className="py-3"><Link href={`/deals/${row.dealId}/order`} className="font-medium text-brand underline">{row.piNumber}</Link><span className="block text-xs text-slate-500">{row.partnerName}</span></td>
          <td>{row.commission.model}</td><td>{row.currency} {row.commission.accruedAmount}</td>
          <td>{row.acceptedAt ?? 'Acceptance pending'}</td><td>{row.commission.claimedAmount === null ? 'Not claimed' : `${row.currency} ${row.commission.claimedAmount} · variance ${row.commission.variance}`}</td>
          <td>{row.commission.settledAt ? `Settled ${row.commission.settledAt.toISOString().slice(0, 10)}` :
            row.commission.claimedAmount === null ? <form action={claimCommissionAction} className="flex gap-2"><input type="hidden" name="commissionId" value={row.commission.id} />
              <input name="amount" type="number" step="0.01" min="0" defaultValue={row.commission.accruedAmount} required aria-label={`Claimed amount for ${row.piNumber}`} className="w-28 rounded border px-2 py-1" />
              <button className="text-brand underline">Record claim</button></form> :
              <form action={settleCommissionAction}><input type="hidden" name="commissionId" value={row.commission.id} /><button className="text-brand underline">Settle · G7</button></form>}</td></tr>)}</tbody></table>
        {!rows.length && <p className="mt-4 text-sm text-slate-500">No commission accruals yet. New confirmed orders will appear here.</p>}</div></section>
    <section className={card}><h2 className="font-semibold">Forward penalty exposure · {exposures.length} orders</h2>
      <p className="mt-1 text-sm text-slate-500">Provisional D1 default is 0.5% per week, capped at 5%, when the contract has no entered rate.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Order</th><th>Weeks late</th><th>Rate / week</th><th>Exposure</th><th>Cap</th><th>Calculated</th></tr></thead>
        <tbody>{exposures.map((row) => <tr key={row.exposure.id} className="border-b border-slate-100"><td className="py-2"><Link className="text-brand underline" href={`/deals/${row.dealId}/production`}>{row.piNumber}</Link></td><td>{row.exposure.weeksLate}</td><td>{row.exposure.ratePerWeek}</td><td>{row.currency} {row.exposure.accruedExposure}</td><td>{row.currency} {row.exposure.capAmount}</td><td>{row.exposure.calculatedAt.toISOString().slice(0, 10)}</td></tr>)}</tbody></table>
        {!exposures.length && <p className="mt-4 text-sm text-slate-500">No nightly exposure calculation has run for an open MI.</p>}</div></section>
  </div>;
}
