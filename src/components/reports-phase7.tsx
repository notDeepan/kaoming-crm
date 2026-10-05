import Link from 'next/link';
import type { ReportFilters } from '@/queries/filters';
import { queryD2 } from '@/queries/d2';
import { queryG1 } from '@/queries/g1';
import { money } from '@/queries/money';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const short = (value: string | null) => value ?? '—';

export async function D2Report({ filters }: { filters: ReportFilters }) {
  const data = await queryD2(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4">
    <Tile label="Production slip ≥30 days · orders" value={String(data.over30)} />
    <Tile label="Production slip ≥60 days · orders" value={String(data.over60)} />
    <Tile label="Booking late or overdue · orders" value={String(data.bookingDelayed)} note={`${data.bookingCauseMissing} late or overdue bookings lack a cause code`} />
    <Tile label="Completing within 21 days, payment outstanding · orders" value={String(data.paymentRisk)} />
  </div><section className={card}><h2 className="font-semibold">Slip curve and booking window by order</h2>
    <p className="mt-1 text-sm text-slate-600">Each point is a filled monthly review. The curve shows cumulative slip reported at that review and its reported stage. A missing review is not interpreted as zero slip.</p>
    <div className="mt-4 space-y-4">{data.rows.map((row) => <div key={row.dealId} className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap justify-between gap-2"><Link href={`/deals/${row.dealId}/production`} className="font-semibold text-brand underline">{row.piNumber} · {row.partner}</Link>
        <span className="text-sm">Current reported slip: <strong>{row.curve.length ? `${row.latestSlipDays} days` : 'No review'}</strong> · Escalation {row.escalation.replaceAll('_', ' ')}</span></div>
      <p className="mt-2 text-sm text-slate-600">Contract {short(row.contractDate)} · Completion {short(row.completion)} · Booking due {short(row.bookingDue)} · Confirmed {short(row.confirmed)} · {row.bookingOverdue ? 'Booking overdue' : row.bookingDaysLate ? `${row.bookingDaysLate} days booking delay` : 'No confirmed booking delay'} · Cause {row.bookingCause?.replaceAll('_', ' ') ?? 'not recorded'}</p>
      {row.paymentRisk && <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">Final payment outstanding before booking window.</p>}
      <div className="mt-3 flex flex-wrap gap-2">{row.curve.map((point) => <div key={point.dueDate} className={`rounded border px-2 py-1 text-xs ${point.slipDays >= 60 ? 'border-red-300 bg-red-50' : point.slipDays >= 30 ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
        <strong>{point.dueDate}: {point.slipDays}d</strong><span className="block">{point.stage?.replaceAll('_', ' ') ?? 'Stage missing'} · {point.reason?.replaceAll('_', ' ') ?? 'cause missing'}</span><span className="block">Expected {short(point.expected)}</span></div>)}</div>
      {!row.curve.length && <p className="mt-3 text-sm text-slate-500">No filled monthly reviews.</p>}
    </div>)}{!data.rows.length && <p className="text-sm text-slate-500">No matching orders.</p>}</div></section></div>;
}

export async function G1Report({ filters }: { filters: ReportFilters }) {
  const data = await queryG1(filters);
  const steps = [
    ['Quoted list', data.list], ['Less quotation discount', -data.quoteDiscount],
    ['Less order adjustment', -data.orderAdjustment], ['Booked order value', data.booked],
    ['Less accrued commission', -data.commission], ['Less recorded leakage', -data.leakage],
    ['Plus recovered leakage', data.recovered], ['Estimated realized', data.realized],
  ] as const;
  return <div className="space-y-5"><section className={card}><h2 className="font-semibold">List to realized · {filters.currency}</h2>
    <p className="mt-1 text-sm text-slate-600">The waterfall includes shipped orders only; {data.openOrderCount} open orders worth {money(data.openOrderValue, filters.currency)} are excluded. Quote discounts and order adjustments are shown separately. Recorded leakage includes manual and claim linked costs for the selected period. Discount register entries are memo items excluded from costs to prevent double counting; their total is {money(data.discountRegister, filters.currency)}. Recovered entries are added back. Penalty exposures are projections and excluded. Realized is an estimate before unrecorded costs and tax.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{steps.map(([label, amount]) => <Tile key={label} label={label} value={money(amount, filters.currency)} />)}</div>
    <p className="mt-3 text-xs text-slate-600">{data.entryCount} leakage entries · {data.unpricedCommission} orders without stored commission accrual. Missing accruals are shown as zero and lower confidence in the estimate.</p>
  </section><section className={card}><h2 className="font-semibold">Order detail</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Order</th><th>Agent</th><th>List</th><th>Booked</th><th>Commission</th><th>Leakage</th><th>Recovered</th><th>Estimated realized</th></tr></thead>
    <tbody>{data.details.map((row) => <tr key={row.dealId} className="border-b border-slate-100"><td className="py-2"><Link href={`/deals/${row.dealId}`} className="text-brand underline">{row.piNumber}</Link></td><td>{row.partner}</td><td>{money(row.list, filters.currency)}</td><td>{money(row.booked, filters.currency)}</td><td>{money(row.commission, filters.currency)}</td><td>{money(row.leakage, filters.currency)}</td><td>{money(row.recovered, filters.currency)}</td><td className="font-semibold">{money(row.realized, filters.currency)}</td></tr>)}</tbody></table>
    {!data.details.length && <p className="text-sm text-slate-500">No matching orders.</p>}</div></section></div>;
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className={card}><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div><div className="mt-2 text-xl font-semibold text-ink">{value}</div>{note && <p className="mt-1 text-xs text-slate-600">{note}</p>}</div>;
}
