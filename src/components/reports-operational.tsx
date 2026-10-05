import Link from 'next/link';
import type { ReportFilters } from '@/queries/filters';
import { queryB2 } from '@/queries/b2';
import { queryB3 } from '@/queries/b3';
import { queryC1 } from '@/queries/c1';
import { queryC2 } from '@/queries/c2';
import { queryD3 } from '@/queries/d3';
import { queryE1 } from '@/queries/e1';
import { queryE2 } from '@/queries/e2';
import { queryE3 } from '@/queries/e3';
import { cents, money } from '@/queries/money';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const cell = 'py-2 pr-4';
function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className={card}><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div><div className="mt-2 text-xl font-semibold text-ink">{value}</div>{note && <p className="mt-1 text-xs text-slate-600">{note}</p>}</div>;
}
function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{children}</p>;
}
function Table({ headings, children }: { headings: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr>{headings.map((heading) => <th key={heading} className="pb-2 pr-4">{heading}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export async function B2Report({ filters }: { filters: ReportFilters }) {
  const data = await queryB2(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Tile label="Published scorecards · agents" value={String(data.published)} /><Tile label="Fewer than four quarters · agents" value={String(data.awaitingFourQuarters)} /><Tile label="Unrated · agents" value={String(data.unrated)} /></div>
    <Note>Quarterly snapshots are immutable. Tiers remain unrated until four consecutive observed quarters, at least five data points, market-size bands, and agreed scoring thresholds are available. No provisional score is published as a tier.</Note>
    <section className={card}><h2 className="mb-3 font-semibold">Latest quarterly snapshot</h2><Table headings={['Agent', 'Period', 'Observed quarters', 'Data points', 'Net shipped revenue after commission · USD', 'Cost to serve', 'Publication']}>{data.details.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className={cell}><Link href={`/partners/${row.id}`} className="text-brand underline">{row.name}</Link></td><td>{row.period ?? '—'}</td><td>{row.observedQuarters}</td><td>{row.dataPoints}</td><td>{row.netRevenue12m === null ? 'Unavailable' : money(cents(row.netRevenue12m), 'USD')}</td><td>{row.costToServePct === null ? 'Unavailable' : `${row.costToServePct}%`}</td><td title={row.blockedReason}>{row.published ? row.tier : `Unrated · ${row.blockedReason}`}</td></tr>)}</Table></section></div>;
}

export async function B3Report({ filters }: { filters: ReportFilters }) {
  const data = await queryB3(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Tile label="Known agent countries · count" value={String(data.countries.length)} /><Tile label="No orders in selected period · countries" value={String(data.inactiveCountries)} /><Tile label="No order in 24 months · agents" value={String(data.dormant)} /></div>
    <Note>Coverage is limited to countries with a recorded partner. A complete territory and market-size master is required to identify true geographic white space.</Note>
    <section className={card}><h2 className="mb-3 font-semibold">Known partner coverage</h2><Table headings={['Country', 'Agents', 'Active', 'Orders in period']}>{data.countries.map((row) => <tr key={row.country} className="border-b border-slate-100"><td className={cell}>{row.country}</td><td>{row.agents}</td><td>{row.active}</td><td>{row.recentOrders}</td></tr>)}</Table></section>
    <section className={card}><h2 className="mb-3 font-semibold">Agents</h2><Table headings={['Agent', 'Country / region', 'Status', 'Last order', 'Orders in period', '24-month dormancy']}>{data.details.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className={cell}><Link href={`/partners/${row.id}`} className="text-brand underline">{row.name}</Link></td><td>{row.country} / {row.region.replaceAll('_', ' ')}</td><td>{row.status.replaceAll('_', ' ')}</td><td>{row.lastOrder ?? 'None recorded'}</td><td>{row.ordersInPeriod}</td><td>{row.dormant ? 'Yes' : 'No'}</td></tr>)}</Table></section></div>;
}

export async function C1Report({ filters }: { filters: ReportFilters }) {
  const data = await queryC1(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4"><Tile label="Enquiries · count" value={String(data.enquiryCount)} /><Tile label="Quoted · deals" value={String(data.quoted)} /><Tile label="Revised quotation · deals" value={String(data.revised)} /><Tile label="Decided win rate · won / won+lost" value={data.winRate === null ? '—' : `${data.winRate}%`} note={`${data.won + data.lost} decisions${data.lowConfidence ? ' · low N' : ''}`} /></div>
    <section className={card}><h2 className="mb-3 font-semibold">Pipeline by sales stage</h2><Table headings={['Stage', 'Deals', `Latest quoted value · ${filters.currency}`]}>{data.stages.map((row) => <tr key={row.stage} className="border-b border-slate-100"><td className={cell}>{row.stage.replaceAll('_', ' ')}</td><td>{row.count}</td><td>{money(row.quoted, filters.currency)}</td></tr>)}</Table></section>
    <section className={card}><h2 className="mb-3 font-semibold">Latest quotation by deal</h2><Table headings={['Deal', 'Agent', 'Stage', 'Revision', 'Quotation status', 'Quoted value']}>{data.details.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className={cell}><Link href={`/deals/${row.id}`} className="text-brand underline">{row.number}</Link></td><td>{row.partner}</td><td>{row.stage.replaceAll('_', ' ')}</td><td>{row.quoteRevision ?? '—'}</td><td>{row.quoteStatus ?? '—'}</td><td>{money(row.quotedValue, filters.currency)}</td></tr>)}</Table></section></div>;
}

export async function C2Report({ filters }: { filters: ReportFilters }) {
  const data = await queryC2(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4"><Tile label="Quoted orders · count" value={String(data.orderCount)} /><Tile label="Quoted list · amount" value={money(data.totalList, filters.currency)} /><Tile label="Quotation discount · amount" value={money(data.totalDiscount, filters.currency)} /><Tile label="Included options · amount" value={money(data.optionRevenue, filters.currency)} note={`${data.optionLines} accessory and specification change lines`} /></div>
    <section className={card}><h2 className="mb-3 font-semibold">Model mix and discounting</h2><Table headings={['Model', 'Orders', 'Booked', 'Quoted list', 'Quote discount', 'Included options', 'Option lines']}>{data.models.map((row) => <tr key={row.model} className="border-b border-slate-100"><td className={cell}>{row.model}{row.lowConfidence ? ' · low N' : ''}</td><td>{row.orders}</td><td>{money(row.booked, filters.currency)}</td><td>{money(row.list, filters.currency)}</td><td>{money(row.discount, filters.currency)}</td><td>{money(row.options, filters.currency)}</td><td>{row.optionsCount}</td></tr>)}</Table></section></div>;
}

export async function D3Report({ filters }: { filters: ReportFilters }) {
  const data = await queryD3(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Tile label="Open work orders · count" value={String(data.open)} /><Tile label="Expected finish overdue · orders" value={String(data.overdue)} /><Tile label="No finish forecast · orders" value={String(data.noForecast)} /></div>
    <Note>Forecast load is based on open work order finish dates and filled progress reviews. Factory capacity baseline and resource hours are unavailable, so utilization is not calculated.</Note>
    <section className={card}><h2 className="mb-3 font-semibold">Expected finish load</h2><Table headings={['Month', 'Orders', 'Provisional']}>{data.months.map((row) => <tr key={row.month} className="border-b border-slate-100"><td className={cell}>{row.month}</td><td>{row.count}</td><td>{row.provisional}</td></tr>)}</Table></section>
    <section className={card}><h2 className="mb-3 font-semibold">Open work orders</h2><Table headings={['Order', 'Agent', 'Model', 'Expected finish', 'Contract date', 'Status']}>{data.details.map((row) => <tr key={row.dealId} className="border-b border-slate-100"><td className={cell}><Link href={`/deals/${row.dealId}/production`} className="text-brand underline">{row.piNumber}</Link></td><td>{row.partner}</td><td>{row.model}</td><td>{row.expected ?? 'Missing'}</td><td>{row.contractual ?? 'Missing'}</td><td>{row.overdue ? 'Overdue' : row.provisional ? 'Provisional' : 'Open'}</td></tr>)}</Table></section></div>;
}

export async function E1Report({ filters }: { filters: ReportFilters }) {
  const data = await queryE1(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4"><Tile label="Installed machines · count" value={String(data.installed)} /><Tile label="Parts warranty requests · count" value={String(data.requests)} note={`${data.undeterminable} undeterminable`} /><Tile label="Claims · count" value={String(data.claimCount)} /><Tile label={`Recorded FOC leakage · ${filters.currency}`} value={money(data.focAmount, filters.currency)} note={`${data.focCount} entries`} /></div>
    <section className={card}><h2 className="mb-3 font-semibold">Warranty determination</h2><p className="text-sm">In warranty: {data.inWarranty} · Out of warranty: {data.outOfWarranty} · Undeterminable: {data.undeterminable}</p></section>
    <section className={card}><h2 className="mb-3 font-semibold">By machine model</h2><Table headings={['Model', 'Installed', 'Parts requests', 'Claims']}>{data.models.map((row) => <tr key={row.model} className="border-b border-slate-100"><td className={cell}>{row.model}{row.lowConfidence ? ' · low N' : ''}</td><td>{row.installed}</td><td>{row.requests}</td><td>{row.claims}</td></tr>)}</Table></section></div>;
}

export async function E2Report({ filters }: { filters: ReportFilters }) {
  const data = await queryE2(filters);
  const hour = (value: number | null) => value === null ? '—' : `${value} h`;
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4"><Tile label="Parts requests · count" value={String(data.requests)} /><Tile label="Waiting identification · count" value={String(data.awaitingIdentification)} /><Tile label="Waiting price · count" value={String(data.awaitingPricing)} /><Tile label="Preparing quotation · count" value={String(data.preparingQuotation)} /></div>
    <div className="grid gap-4 md:grid-cols-3"><Tile label="Identification turnaround · mean" value={hour(data.averageIdentificationHours)} /><Tile label="Pricing turnaround · mean" value={hour(data.averagePricingHours)} /><Tile label="Quotation preparation · mean" value={hour(data.averageQuotationHours)} /></div>
    <section className={card}><h2 className="font-semibold">Part alternatives and warranty</h2><p className="mt-2 text-sm">Alternatives suggested: {data.alternativesSuggested} · rejected: {data.alternativesRejected} · warranty undeterminable: {data.undeterminable}</p></section>
    <section className={card}><h2 className="mb-3 font-semibold">Request turnaround</h2><Table headings={['Request', 'Status', 'Warranty', 'Identification', 'Pricing', 'Quotation', 'Alternative']}>{data.details.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className={cell}><Link href={`/aftermarket/${row.id}`} className="text-brand underline">{row.number}</Link></td><td>{row.status.replaceAll('_', ' ')}</td><td>{row.determination.replaceAll('_', ' ')}</td><td>{hour(row.identificationHours)}</td><td>{hour(row.pricingHours)}</td><td>{hour(row.quotationHours)}</td><td>{row.alternativeOutcome ?? '—'}</td></tr>)}</Table></section></div>;
}

export async function E3Report({ filters }: { filters: ReportFilters }) {
  const data = await queryE3(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4"><Tile label="Cases opened · count" value={String(data.cases)} /><Tile label="Open cases · count" value={String(data.open)} /><Tile label="Machine down · count" value={String(data.machineDown)} /><Tile label="Translations pending review · messages" value={String(data.translationPending)} note={`${data.translatedMessages} reviewed`} /></div>
    <div className="grid gap-5 md:grid-cols-2"><section className={card}><h2 className="mb-3 font-semibold">Time in each state · summed hours</h2>{data.stateHours.map((row) => <p key={row.status} className="flex justify-between border-b py-1 text-sm"><span>{row.status.replaceAll('_', ' ')}</span><strong>{row.hours} h</strong></p>)}</section><section className={card}><h2 className="mb-3 font-semibold">Cases by model</h2>{data.models.map((row) => <p key={row.model} className="flex justify-between border-b py-1 text-sm"><span>{row.model}</span><strong>{row.count}</strong></p>)}<p className="mt-3 text-xs text-slate-600">Linked site visits: {data.linkedVisits} · marked billed: {data.billedVisits}</p></section></div>
    <section className={card}><h2 className="mb-3 font-semibold">Case register</h2><Table headings={['Case', 'Subject', 'Priority', 'Status']}>{data.details.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className={cell}><Link href={`/cases/${row.id}`} className="text-brand underline">{row.number}</Link></td><td>{row.subject}</td><td>{row.priority.replaceAll('_', ' ')}</td><td>{row.status.replaceAll('_', ' ')}</td></tr>)}</Table></section></div>;
}
