import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReportFiltersBar } from '@/components/report-filters';
import { D2Report, G1Report } from '@/components/reports-phase7';
import { A1Report, B4Report, G2Report } from '@/components/reports-commercial';
import { B2Report, B3Report, C1Report, C2Report, D3Report, E1Report, E2Report, E3Report } from '@/components/reports-operational';
import { PageHeader } from '@/components/page-header';
import { requireRole } from '@/lib/authorization';
import { queryA2 } from '@/queries/a2';
import { queryA3 } from '@/queries/a3';
import { queryB1 } from '@/queries/b1';
import { currentStage, queryD1 } from '@/queries/d1';
import { reportOptions } from '@/queries/data';
import { queryF1 } from '@/queries/f1';
import { parseReportFilters, type ReportFilters } from '@/queries/filters';
import { cents, lowConfidence, money } from '@/queries/money';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const titles = { a1: 'A1 · Executive overview', d1: 'D1 · Order book and status', a2: 'A2 · Revenue and orders',
  a3: 'A3 · Cash and payment milestones', b1: 'B1 · Agent league table',
  f1: 'F1 · Document throughput', d2: 'D2 · Delays and slip', g1: 'G1 · Margin leakage',
  b2: 'B2 · Agent scorecard and tiers', b3: 'B3 · Coverage and white space', c1: 'C1 · Pipeline and quotations',
  c2: 'C2 · Mix, options and discounting', d3: 'D3 · Forecast and capacity',
  e1: 'E1 · Warranty and FOC leakage', e2: 'E2 · Spare parts and installed base',
  e3: 'E3 · After-sales cases', b4: 'B4 · Commission and channel economics',
  g2: 'G2 · Claims and disputes' } as const;
function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className={card}><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>{note && <p className="mt-1 text-xs text-slate-600">{note}</p>}</div>;
}
function Confidence({ count }: { count: number }) {
  return lowConfidence(count) ? <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900" title="Fewer than five records">low N · {count}</span> : null;
}
function Empty() { return <p className="mt-4 text-sm text-slate-500">No matching records for these filters.</p>; }

async function D1({ filters }: { filters: ReportFilters }) {
  const data = await queryD1(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3">
    <Tile label="Open unshipped orders · count" value={String(data.openCount)} note="Daily work queue" />
    <Tile label={`Open order book · ${filters.currency}`} value={money(data.openValue, filters.currency)} note="Unshipped order value" />
    <Tile label="Stages · count" value={String(data.stages.length)} note="Sales and project stages in the selected cohort" />
  </div><section className={card}><h2 className="font-semibold">Orders by stage</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.stages.map((stage) =>
      <div key={stage.stage} className="rounded-lg border border-slate-200 p-3"><div className="text-sm font-medium">{stage.stage.replaceAll('_', ' ')}</div>
        <div className="mt-1 text-xl font-semibold">{stage.count} <span className="text-xs font-normal text-slate-500">orders/deals</span></div>
        <div className="text-xs text-slate-500">Order value · {money(stage.value, filters.currency)}</div></div>)}</div>
    {!data.stages.length && <Empty />}</section>
    <section className={card}><h2 className="font-semibold">Daily working queue · open orders</h2>
      <p className="mt-1 text-sm text-slate-500">Sorted by contractual delivery date. Open an order to review its next step.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Order</th><th>Agent</th><th>Model</th><th>Stage</th><th>Contract date</th><th>Order value</th><th>Next step</th></tr></thead>
        <tbody>{data.queue.map((row) => <tr key={row.deal.id} className="border-b border-slate-100">
          <td className="py-3"><Link className="font-medium text-brand underline" href={`/deals/${row.deal.id}`}>{row.order?.piNumber}</Link></td>
          <td>{row.partner.name}</td><td>{row.model?.code ?? '—'}</td><td>{currentStage(row).replaceAll('_', ' ')}</td>
          <td>{row.order?.contractualDeliveryDate ?? 'Set delivery date'}</td><td>{money(cents(row.order?.orderValue), filters.currency)}</td>
          <td><Link className="text-brand underline" href={`/deals/${row.deal.id}/production`}>Production</Link> · <Link className="text-brand underline" href={`/deals/${row.deal.id}/delivery`}>Delivery</Link></td>
        </tr>)}</tbody></table>{!data.queue.length && <Empty />}</div></section></div>;
}

async function A2({ filters }: { filters: ReportFilters }) {
  const data = await queryA2(filters);
  const measureValues = { bookings: data.bookings, revenue: data.revenue, cash: data.cash,
    order_book: data.orderBook, count: BigInt(data.bookingsN) };
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4">
    <Tile label="Bookings · PO received" value={money(data.bookings, filters.currency)} note={`${data.bookingsN} orders${data.lowConfidence.bookings ? ' · low N' : ''}`} />
    <Tile label="Revenue · shipped" value={money(data.revenue, filters.currency)} note={`${data.revenueN} shipments${data.lowConfidence.revenue ? ' · low N' : ''}`} />
    <Tile label="Known cash amounts · payments" value={money(data.cash, filters.currency)} note={`${data.cashN} payment events · ${data.unvaluedPayments} missing amounts`} />
    <Tile label="Order book · unshipped" value={money(data.orderBook, filters.currency)} note="Open orders in selected cohort" />
  </div><section className={card}><h2 className="font-semibold">Monthly events · highlighted measure: {filters.measure.replaceAll('_', ' ')}</h2>
    <p className="mt-1 text-sm text-slate-500">Bookings use PO receipt, revenue uses shipment, and cash uses each dated payment amount. Filters choose the order cohort by {filters.basis} date.</p>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Month</th><th>Bookings · {filters.currency}</th><th>Revenue · {filters.currency}</th><th>Cash · {filters.currency}</th></tr></thead>
      <tbody>{data.months.map((row) => <tr key={row.month} className="border-b border-slate-100"><td className="py-2 font-medium">{row.month}</td>
        <td className={filters.measure === 'bookings' ? 'font-semibold text-brand' : ''}>{money(row.bookings, filters.currency)}</td>
        <td className={filters.measure === 'revenue' ? 'font-semibold text-brand' : ''}>{money(row.revenue, filters.currency)}</td>
        <td className={filters.measure === 'cash' ? 'font-semibold text-brand' : ''}>{money(row.cash, filters.currency)}</td></tr>)}</tbody></table>{!data.months.length && <Empty />}</div>
    <p className="mt-3 text-xs text-slate-500">Selected measure total: {filters.measure === 'count' ? `${measureValues.count} orders` : money(measureValues[filters.measure], filters.currency)}</p></section>
    <section className={card}><h2 className="font-semibold">By region</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Region</th><th>Orders · count</th><th>Bookings</th><th>Revenue</th></tr></thead><tbody>{data.regions.map((row) =>
      <tr key={row.region} className="border-b border-slate-100"><td className="py-2">{row.region.replaceAll('_', ' ')}</td><td>{row.orders}<Confidence count={row.orders} /></td><td>{money(row.bookings, filters.currency)}</td><td>{money(row.revenue, filters.currency)}</td></tr>)}</tbody></table></div></section></div>;
}

async function A3({ filters }: { filters: ReportFilters }) {
  const data = await queryA3(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4">
    <Tile label="Known cash amounts · payments" value={money(data.recordedCash, filters.currency)} note={`${data.paymentEvents} events · ${data.unvaluedEvents} missing amounts`} />
    <Tile label="Deposits outstanding · orders" value={String(data.depositsOutstanding.length)} note="Required deposit with no receipt recorded" />
    <Tile label="Estimated final balance · order value less recorded deposit" value={money(data.estimatedBalanceDue, filters.currency)} note="Planning estimate, not an invoice or receipt" />
    <Tile label="Payment before booking · machines" value={String(data.bookingAtRisk.length)} note="Production complete, final payment outstanding" />
  </div><section className={card}><h2 className="font-semibold">Deposits not received</h2>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Order</th><th>Agent</th><th>PO date</th><th>Deposit terms</th><th>Order value</th><th>Production</th></tr></thead><tbody>{data.depositsOutstanding.map((row) =>
      <tr key={row.deal.id} className="border-b border-slate-100"><td className="py-2"><Link className="text-brand underline" href={`/deals/${row.deal.id}/order`}>{row.order?.piNumber}</Link></td>
        <td>{row.partner.name}</td><td>{row.order?.createdAt.toISOString().slice(0, 10)}</td><td>{row.order?.depositPercent}%</td>
        <td>{money(cents(row.order?.orderValue), filters.currency)}</td><td>{row.work?.issuedAt ? 'Started' : 'Not started'}</td></tr>)}</tbody></table>
    {!data.depositsOutstanding.length && <Empty />}</div></section>
    <section className={card}><h2 className="font-semibold">Final payment due before booking</h2>
      <div className="mt-4 space-y-2">{data.bookingAtRisk.map((row) => <div key={row.deal.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <Link className="font-medium text-brand underline" href={`/deals/${row.deal.id}/delivery`}>{row.order?.piNumber} · {row.partner.name}</Link>
        <span>Booking due {row.shipment?.bookingDueBy} · final payment outstanding</span></div>)}
        {!data.bookingAtRisk.length && <Empty />}</div></section></div>;
}

async function B1({ filters }: { filters: ReportFilters }) {
  const data = await queryB1(filters);
  return <div className="space-y-5"><div className={card}><h2 className="font-semibold">Agent ranking · net shipped revenue after commission</h2>
    <p className="mt-2 text-sm text-slate-600">Only shipped orders with resolvable commission terms enter the ranking. Stored order-confirmation accruals are used when available; {data.historicalFallbacks} older shipped order(s) use an as-of-order contract estimate. Region percentile is shown with a low confidence marker below five observations. Market size bands are not yet in the source data.</p>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Rank</th><th>Agent</th><th>Region / country</th><th>Orders</th><th>Gross shipped revenue</th><th>Commission</th><th>Net revenue</th><th>Region percentile</th></tr></thead>
      <tbody>{data.ranked.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="py-3">{row.rank}</td><td className="font-medium">{row.name}</td><td>{row.region.replaceAll('_', ' ')} / {row.country}</td>
        <td>{row.orders}{row.lowConfidence && <Confidence count={row.orders} />}</td><td>{money(row.gross, filters.currency)}</td><td>{money(row.commission, filters.currency)}</td>
        <td className="font-semibold">{money(row.net, filters.currency)}</td><td>{row.regionPercentile === null ? 'Insufficient peers' : `${row.regionPercentile}th`}</td></tr>)}</tbody></table>{!data.ranked.length && <Empty />}</div></div>
    {data.unranked.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-semibold">Excluded until commission terms are complete</h2>
      <ul className="mt-2 list-inside list-disc text-sm">{data.unranked.map((row) => <li key={row.id}>{row.name} · {row.missing} shipped order(s) missing computable commission</li>)}</ul></section>}</div>;
}

async function F1({ filters }: { filters: ReportFilters }) {
  const data = await queryF1(filters);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3">
    <Tile label="Awaiting required approval · documents" value={String(data.awaitingApproval)} />
    <Tile label="Printed, not released · documents" value={String(data.printedNotReleased)} />
    <Tile label="Median print to release · days" value={data.medianDays === null ? '—' : data.medianDays.toFixed(1)} note={`${data.sampleSize} released documents${data.lowConfidence ? ' · low N' : ''}`} />
  </div><div className="grid gap-5 lg:grid-cols-2"><section className={card}><h2 className="font-semibold">Print to release by document type</h2>
    <div className="mt-4 space-y-3">{data.types.map((item) => <div key={item.type} className="flex justify-between gap-2 border-b pb-2 text-sm">
      <span>{item.type.replaceAll('_', ' ')}<Confidence count={item.count} /></span><strong>{item.medianDays?.toFixed(1)} days · median</strong></div>)}
      {!data.types.length && <Empty />}</div></section><section className={card}><h2 className="font-semibold">Waiting now</h2>
    <div className="mt-4 space-y-3">{data.waiting.map((row) => <div key={row.document.id} className="flex justify-between gap-3 border-b pb-2 text-sm">
      <div><strong>{row.document.docType.replaceAll('_', ' ')}</strong><span className="block text-xs text-slate-500">{row.deal.dealNumber} · {row.partner.name}</span></div>
      <Link className="text-brand underline" href={`/deals/${row.deal.id}`}>{row.document.status.replaceAll('_', ' ')}</Link></div>)}
      {!data.waiting.length && <Empty />}</div></section></div></div>;
}

export default async function ReportPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole('admin', 'manager', 'sales', 'logistics', 'finance', 'service', 'viewer');
  const [{ id }, input, options] = await Promise.all([params, searchParams, reportOptions()]);
  if (!(id in titles)) notFound();
  if (['b1', 'b2', 'b3', 'b4', 'g1'].includes(id)
    && !['admin', 'manager', 'sales', 'finance'].includes(user.role)) notFound();
  const key = id as keyof typeof titles;
  const filters = parseReportFilters(input);
  const eventBasis = ['e1', 'e2', 'e3', 'b3', 'g2'].includes(key);
  const titleBasis = key === 'b2' ? 'latest closed quarter' : eventBasis ? 'event date' : `${filters.basis} date`;
  const description = key === 'b2'
    ? 'Latest immutable snapshot per agent · USD base amounts. Date filters do not change the latest snapshot.'
    : eventBasis
      ? `${filters.from} to ${filters.to} · ${filters.currency} for amounts · cases, requests and claims use their recorded event dates; coverage orders use PO dates.`
      : `${filters.from} to ${filters.to} · ${filters.currency} · filter period uses ${filters.basis} date; monetary events keep their own recognition dates.`;
  return <div className="space-y-6"><PageHeader eyebrow="REPORTS" title={`${titles[key]} · ${titleBasis}`}
    description={description} />
    <ReportFiltersBar filters={filters} options={options} role={user.role} />
    {key === 'a1' ? <A1Report filters={filters} /> : key === 'd1' ? <D1 filters={filters} /> : key === 'a2' ? <A2 filters={filters} /> :
      key === 'a3' ? <A3 filters={filters} /> : key === 'b1' ? <B1 filters={filters} /> :
      key === 'd2' ? <D2Report filters={filters} /> : key === 'g1' ? <G1Report filters={filters} /> :
      key === 'b2' ? <B2Report filters={filters} /> : key === 'b3' ? <B3Report filters={filters} /> : key === 'c1' ? <C1Report filters={filters} /> :
      key === 'c2' ? <C2Report filters={filters} /> : key === 'd3' ? <D3Report filters={filters} /> :
      key === 'e1' ? <E1Report filters={filters} /> : key === 'e2' ? <E2Report filters={filters} /> :
      key === 'e3' ? <E3Report filters={filters} /> : key === 'b4' ? <B4Report filters={filters} /> :
      key === 'g2' ? <G2Report filters={filters} /> : <F1 filters={filters} />}
  </div>;
}
