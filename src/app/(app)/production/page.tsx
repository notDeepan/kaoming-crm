import Link from 'next/link';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { PageHeader } from '@/components/page-header';
import { getDb } from '@/db/client';
import { deals, orders, partners, progressReviews, workOrders } from '@/db/schema';
import { overdueEscalation } from '@/features/production/service';
import { requireUser } from '@/lib/authorization';

export default async function ProductionQueue() {
  await requireUser();
  const db = getDb();
  const work = await db.select({ dealId: deals.id, dealNumber: deals.dealNumber, partner: partners.name,
    miNumber: workOrders.miNumber, workOrderId: workOrders.id, contractualDate: orders.contractualDeliveryDate,
  }).from(workOrders).innerJoin(orders, eq(orders.id, workOrders.orderId))
    .innerJoin(deals, eq(deals.id, orders.dealId)).innerJoin(partners, eq(partners.id, deals.partnerId))
    .where(and(isNull(workOrders.deletedAt), isNull(deals.deletedAt)));
  const reviews = work.length ? await db.select().from(progressReviews)
    .where(inArray(progressReviews.workOrderId, work.map((item) => item.workOrderId)))
    .orderBy(asc(progressReviews.sequence)) : [];
  return <div className="space-y-6"><PageHeader eyebrow="PRODUCTION" title="Monthly production counter" description="Open reviews, overdue exceptions and the latest expected delivery for each issued MI." />
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><table className="w-full min-w-[750px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted"><tr><th className="pb-3">MI</th><th className="pb-3">Agent</th><th className="pb-3">Contractual</th><th className="pb-3">Latest expected</th><th className="pb-3">Open</th><th className="pb-3">Overdue</th><th className="pb-3">Escalation</th></tr></thead><tbody>{work.map((item) => {
      const rows = reviews.filter((review) => review.workOrderId === item.workOrderId);
      const filled = rows.filter((review) => review.filledAt).at(-1);
      const open = rows.filter((review) => !review.filledAt && !review.closedAt);
      const overdue = open.filter((review) => overdueEscalation(review.dueDate) !== 'none');
      const escalation = filled?.escalationLevel === 'gm' || overdue.some((review) => overdueEscalation(review.dueDate) === 'gm') ? 'gm'
        : filled?.escalationLevel === 'dept_manager' || overdue.length ? 'dept_manager' : 'none';
      return <tr key={item.workOrderId} className="border-b border-slate-100"><td className="py-3"><Link href={`/deals/${item.dealId}/production`} className="font-medium text-brand underline">{item.miNumber}</Link><span className="block text-xs text-muted">{item.dealNumber}</span></td><td>{item.partner}</td><td>{item.contractualDate ?? 'Missing'}</td><td>{filled?.expectedCompletion ?? 'No review yet'}</td><td>{open.length}</td><td className={overdue.length ? 'font-semibold text-red-700' : ''}>{overdue.length}</td><td className={escalation === 'none' ? 'text-slate-500' : 'font-semibold text-red-700'}>{escalation}</td></tr>;
    })}</tbody></table>{!work.length && <p className="mt-4 text-sm text-muted">No MI has been prepared yet.</p>}</div>
  </div>;
}
