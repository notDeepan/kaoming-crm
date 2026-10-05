import Link from 'next/link';
import { eq, isNull } from 'drizzle-orm';
import { PageHeader } from '@/components/page-header';
import { getDb } from '@/db/client';
import { deals, machines, orders, partners, shipments } from '@/db/schema';
import { requireUser } from '@/lib/authorization';
import { taipeiDate } from '@/lib/business-date';

export default async function ShipmentQueue() {
  await requireUser();
  const db = getDb();
  const rows = await db.select({ dealId: deals.id, dealNumber: deals.dealNumber, piNumber: orders.piNumber,
    partner: partners.name, shipment: shipments, serialNumber: machines.serialNumber,
  }).from(shipments).innerJoin(orders, eq(orders.id, shipments.orderId))
    .innerJoin(deals, eq(deals.id, orders.dealId)).innerJoin(partners, eq(partners.id, deals.partnerId))
    .leftJoin(machines, eq(machines.orderId, orders.id)).where(isNull(shipments.deletedAt));
  return <div className="space-y-6"><PageHeader eyebrow="DELIVERY" title="Shipment queue" description="Final payment, dispatch and arrival stay separate so missing handoffs are visible." />
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted"><tr><th className="pb-3">Order</th><th className="pb-3">Agent</th><th className="pb-3">Booking due</th><th className="pb-3">Work queue</th><th className="pb-3">Payment</th><th className="pb-3">Shipped</th><th className="pb-3">Arrived</th><th className="pb-3">Machine</th></tr></thead><tbody>{rows.map((row) => {
      const s = row.shipment;
      const task = !s.completionNotifiedAt ? 'Awaiting completion notice' : !s.finalPaymentReceivedAt ? 'Collect final payment' : !s.bookingRequestedAt ? 'Request booking' : !s.bookingConfirmedAt ? 'Awaiting space' : !s.shippingNoticeSentAt ? 'Send shipping notice' : !s.exportDocumentsPreparedAt ? 'Prepare export documents' : !s.shippingOrderPrintedAt ? 'Print 出貨單' : !s.shippedAt ? 'Ship machine' : !s.arrivedAt ? 'Confirm arrival' : 'Arrived';
      const atRisk = !!s.bookingDueBy && s.bookingDueBy <= taipeiDate() && !s.bookingRequestedAt;
      return <tr key={s.id} className="border-b border-slate-100"><td className="py-3"><Link href={`/deals/${row.dealId}/delivery`} className="font-medium text-brand underline">{row.piNumber}</Link><span className="block text-xs text-muted">{row.dealNumber}</span></td><td>{row.partner}</td><td className={atRisk ? 'font-semibold text-red-700' : ''}>{s.bookingDueBy ?? '—'}{atRisk ? ' · at risk' : ''}</td><td className="font-medium">{task}</td><td>{s.finalPaymentReceivedAt?.toISOString().slice(0, 10) ?? 'Pending'}</td><td>{s.shippedAt?.toISOString().slice(0, 10) ?? 'Pending'}</td><td>{s.arrivedAt?.toISOString().slice(0, 10) ?? 'Pending'}</td><td>{row.serialNumber ?? 'Pending'}</td></tr>;
    })}</tbody></table>{!rows.length && <p className="mt-4 text-sm text-muted">No shipment records yet.</p>}</div>
  </div>;
}
