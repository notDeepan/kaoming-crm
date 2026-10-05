import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { getDeal } from '@/features/deals/queries';
import { getDealWorkOrder } from '@/features/manufacturing/service';
import { concludeFatAction, fillReviewAction, scheduleFatAction, verifyFatItemAction } from '@/features/production/actions';
import { getProductionState } from '@/features/production/service';
import { requireUser } from '@/lib/authorization';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700';

export default async function ProductionPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireUser()]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [deal, work] = await Promise.all([getDeal(id), getDealWorkOrder(id)]);
  if (!deal) notFound();
  const state = work ? await getProductionState(work.workOrder.id) : null;
  const canProgress = ['admin', 'manager', 'sales'].includes(user.role);
  const canFat = ['admin', 'manager', 'service'].includes(user.role);
  const latestFat = state?.fats.at(-1);
  const nextReview = state?.reviews.find((review) => !review.filledAt && !review.closedAt);
  return <div className="space-y-6">
    <Link href={`/deals/${id}`} className="text-sm text-brand hover:underline">← {deal.dealNumber}</Link>
    <PageHeader eyebrow="DEAL / PRODUCTION" title="Production progress and FAT" description="Monthly expected dates show how the delivery promise moves. FAT checks the frozen manufacturing specification." />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    {!state?.work.issuedAt ? <section className={card}>Issue the MI with a contractual delivery date to start monthly reviews.</section> : <>
      <section className={card}><h2 className="font-semibold">Monthly counter · {state.work.miNumber}</h2>
        <p className="mt-1 text-sm text-muted">Contractual delivery {state.order.contractualDeliveryDate} · {state.reviews.length} scheduled reviews</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[830px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted"><tr><th className="pb-2">Review</th><th className="pb-2">Due</th><th className="pb-2">Stage at slip</th><th className="pb-2">Expected date</th><th className="pb-2">Moved</th><th className="pb-2">Slip</th><th className="pb-2">Exception</th></tr></thead><tbody>{state.reviews.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="py-2">M+{row.sequence}</td><td>{row.dueDate}</td><td>{row.reportedStage ?? '—'}</td><td>{row.expectedCompletion ?? '—'}</td><td>{row.deltaDays == null ? '—' : `${row.deltaDays > 0 ? '+' : ''}${row.deltaDays} days`}</td><td>{row.cumulativeSlipDays == null ? '—' : `${row.cumulativeSlipDays} days`}</td><td><span className={row.exceptionLevel === 'none' ? 'text-slate-500' : 'font-semibold text-red-700'}>{row.closedAt && !row.filledAt ? 'FAT passed' : row.exceptionLevel === 'none' ? row.filledAt ? 'On track' : 'Open' : row.filledAt ? row.exceptionLevel : `Overdue · ${row.exceptionLevel}`}</span></td></tr>)}</tbody></table></div>
      </section>
      {canProgress && nextReview && <section className={card}><h2 className="font-semibold">Record M+{nextReview.sequence} review</h2>
        <form action={fillReviewAction} className="mt-4 grid gap-4 md:grid-cols-3"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="reviewId" value={nextReview.id} />
          <label className="text-sm">Stage reported<select name="reportedStage" className={control}>{['casting', 'machining', 'assembly', 'wiring', 'run-in'].map((stage) => <option key={stage}>{stage}</option>)}</select></label>
          <label className="text-sm">Expected completion<input name="expectedCompletion" type="date" required defaultValue={state.order.contractualDeliveryDate ?? ''} className={control} /></label>
          <label className="text-sm">Delay reason<select name="delayReason" className={control}><option value="">No later movement</option>{['supplier', 'capacity', 'design_change', 'customer_change', 'provisional_hold', 'quality_rework', 'logistics', 'other'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="text-sm">Attributed to<select name="attribution" className={control}><option value="">No later movement</option>{['kao_ming', 'supplier', 'customer', 'agent', 'forwarder', 'external'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
          <div className="md:col-span-3"><button className={button}>Save expected date</button></div></form>
      </section>}
      <section className={card}><h2 className="font-semibold">FAT inspections</h2>
        <p className="mt-1 text-sm text-muted">Each inspection snapshots the latest issued 製造規格表. Passing FAT closes future open reviews.</p>
        {state.fats.map((fat) => <p key={fat.id} className="mt-2 text-sm">{fat.scheduledFor} · {fat.outcome ?? 'scheduled'}{fat.conductedAt ? ` · conducted ${fat.conductedAt}` : ''}</p>)}
        {canProgress && (!latestFat || !!latestFat.outcome) && <form action={scheduleFatAction} className="mt-4 flex flex-wrap items-end gap-3"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="workOrderId" value={state.work.id} /><label className="text-sm">FAT date<input name="scheduledFor" type="date" required className={control} /></label><button className={button}>Schedule FAT</button></form>}
      </section>
      {latestFat && !latestFat.outcome && <section className={card}><h2 className="font-semibold">FAT checklist · {latestFat.scheduledFor}</h2>
        <div className="mt-4 space-y-3">{state.checklists.map(({ item, nameZh }) => <form key={item.id} action={verifyFatItemAction} className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 p-3"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="itemId" value={item.id} /><div className="min-w-48 flex-1 text-sm"><strong>{nameZh}</strong><p className="text-muted">Expected: {item.expectedValue}</p></div><label className="text-sm">Result<select name="verified" defaultValue={item.verified == null ? '' : String(item.verified)} disabled={!canFat} className={control}><option value="">Unverified</option><option value="true">Verified</option><option value="false">Failed</option></select></label><label className="text-sm">Notes<input name="notes" defaultValue={item.notes ?? ''} disabled={!canFat} className={control} /></label>{canFat && <button className={button}>Save</button>}</form>)}</div>
        {canFat && <form action={concludeFatAction} className="mt-6 grid gap-3 md:grid-cols-2"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="fatId" value={latestFat.id} /><label className="text-sm">Conducted on<input name="conductedAt" type="date" required className={control} /></label><label className="text-sm">Outcome<select name="outcome" className={control}><option value="passed">Passed</option><option value="conditional">Conditional</option><option value="failed">Failed</option></select></label><label className="text-sm">Attendees<input name="attendees" className={control} /></label><label className="text-sm">Punch list (one per line)<textarea name="punchList" className={control} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="customerContactCaptured" />Customer contact captured</label><div className="md:col-span-2"><button className={button}>Conclude FAT</button></div></form>}
      </section>}
    </>}
  </div>;
}
