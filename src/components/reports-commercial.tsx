import Link from 'next/link';
import type { ReportFilters } from '@/queries/filters';
import { queryA1 } from '@/queries/a1';
import { queryB4 } from '@/queries/b4';
import { queryG2 } from '@/queries/g2';
import { money } from '@/queries/money';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className={card}><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div><div className="mt-2 text-xl font-semibold text-ink">{value}</div>{note && <p className="mt-1 text-xs text-slate-600">{note}</p>}</div>;
}

function ClaimGroup({ title, rows, currency }: { title: string;
  rows: Awaited<ReturnType<typeof queryG2>>['byCategory']; currency: ReportFilters['currency'] }) {
  return <section className={card}><h2 className="font-semibold">{title}</h2><div className="mt-3 space-y-2">{rows.map((row) => <p key={row.label} className="flex justify-between gap-3 border-b pb-1 text-sm"><span>{row.label.replaceAll('_', ' ')}{row.lowConfidence ? ' · low N' : ''} · {row.count}</span><strong>{money(row.amount, currency)}</strong></p>)}</div></section>;
}

export async function A1Report({ filters }: { filters: ReportFilters }) {
  const data = await queryA1(filters);
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-3">
    <Tile label="Bookings · PO received" value={money(data.bookings, filters.currency)} />
    <Tile label="Revenue · shipped" value={money(data.revenue, filters.currency)} />
    <Tile label="Known cash · payments" value={money(data.cash, filters.currency)} note={`${data.unvaluedPayments} receipt(s) without amounts`} />
    <Tile label="Order book · unshipped" value={money(data.orderBook, filters.currency)} />
    <Tile label="Production slip ≥30 days · orders" value={String(data.delayedOrders)} />
    <Tile label="After-sales cases open · count" value={String(data.openCases)} />
  </div><p className="text-sm text-slate-600">Bookings, revenue and cash are recognized at different events. Open case count follows case event dates; see the detailed reports for cohorts and confidence.</p></div>;
}

export async function B4Report({ filters }: { filters: ReportFilters }) {
  const data = await queryB4(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4">
    <Tile label="Commission accrued · order confirmation" value={money(data.accrued, filters.currency)} />
    <Tile label="Commission claimed · amount" value={money(data.claimed, filters.currency)} />
    <Tile label="Commission settled · amount" value={money(data.settled, filters.currency)} />
    <Tile label="Orders without accrual · count" value={String(data.missing)} note="Historical records need contract review" />
  </div><section className={card}><h2 className="font-semibold">Channel economics by agent</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Agent</th><th>Orders</th><th>Gross bookings</th><th>Accrued</th><th>Claimed</th><th>Settled</th><th>Net after commission</th></tr></thead><tbody>{data.details.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="py-2"><Link href={`/partners/${row.id}`} className="text-brand underline">{row.name}</Link>{row.lowConfidence ? ' · low N' : ''}</td><td>{row.orders}</td><td>{money(row.gross, filters.currency)}</td><td>{money(row.accrued, filters.currency)}</td><td>{money(row.claimed, filters.currency)}</td><td>{money(row.settled, filters.currency)}</td><td>{money(row.net, filters.currency)}</td></tr>)}</tbody></table></div></section></div>;
}

export async function G2Report({ filters }: { filters: ReportFilters }) {
  const data = await queryG2(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4"><Tile label="Open claims · count and claimed exposure" value={money(data.openExposure, filters.currency)} note={`${data.openCount} claims`} /><Tile label="Claimed · amount" value={money(data.claimed, filters.currency)} /><Tile label="Offered · same currency" value={money(data.offered, filters.currency)} note={`${data.unconvertedOffers} cross-currency offers excluded`} /><Tile label="Settled · same currency" value={money(data.settled, filters.currency)} /></div>
    <div className="grid gap-4 md:grid-cols-3"><Tile label="Pending credit notes · count" value={String(data.pendingCredits)} /><Tile label="Late delivery claims with recorded slip · claimed" value={money(data.tracedDelay, filters.currency)} /><Tile label="Receipt to closure · mean days" value={data.meanSettlementDays === null ? '—' : String(data.meanSettlementDays)} /></div>
    <div className="grid gap-4 md:grid-cols-2"><ClaimGroup title="By claim category" rows={data.byCategory} currency={filters.currency} /><ClaimGroup title="By responsibility" rows={data.byResponsibility} currency={filters.currency} /><ClaimGroup title="By agent" rows={data.byAgent} currency={filters.currency} /><ClaimGroup title="By machine model" rows={data.byModel} currency={filters.currency} /></div>
    <section className={card}><h2 className="font-semibold">Claims register</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Claim</th><th>Agent / model</th><th>Category</th><th>Responsibility</th><th>Claimed</th><th>Offered</th><th>Settled</th><th>Status</th></tr></thead><tbody>{data.details.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="py-2"><Link href={`/claims/${row.id}`} className="text-brand underline">{row.number}</Link></td><td>{row.partner} / {row.model}</td><td>{row.category.replaceAll('_', ' ')}</td><td>{row.responsibility.replaceAll('_', ' ')}</td><td>{money(row.claimed, filters.currency)}</td><td>{row.offered === null ? '—' : money(row.offered, filters.currency)}</td><td>{row.settled === null ? '—' : money(row.settled, filters.currency)}</td><td>{row.status.replaceAll('_', ' ')}{row.pendingCredit ? ' · credit pending' : ''}</td></tr>)}</tbody></table></div></section></div>;
}
