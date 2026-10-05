import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { getDealDocuments, getDocumentApprovals } from '@/features/documents/service';
import { getDeal, listQuoteRevisions } from '@/features/deals/queries';
import {
  completeApprovalAction, createOrderAction, issuePiAction, markPrintedAction,
  markWonAction, recordDepositAction, releaseDocumentAction, verifyPoAction,
} from '@/features/orders/actions';
import { getDealOrder } from '@/features/orders/service';
import { requireUser } from '@/lib/authorization';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700';

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireUser()]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [deal, order, revisions, docs] = await Promise.all([
    getDeal(id), getDealOrder(id), listQuoteRevisions(id), getDealDocuments(id),
  ]);
  if (!deal) notFound();
  const canEdit = ['admin', 'manager', 'sales'].includes(user.role);
  const canApprove = ['admin', 'manager'].includes(user.role);
  const issued = revisions.find((revision) => revision.status === 'issued');
  const pi = docs.find((document) => document.docType === 'pi');
  const approvals = pi ? await getDocumentApprovals(pi.id) : [];
  return <div className="space-y-6">
    <Link href={`/deals/${id}`} className="text-sm text-brand hover:underline">← {deal.dealNumber} quotation</Link>
    <PageHeader eyebrow="DEAL / 訂單" title={`PI 訂單 · ${deal.dealNumber}`} description="Record and verify the customer PO, then issue the Chinese order for printing and signature." />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    {!order && <section className={card}>
      <h2 className="font-semibold">Customer purchase order</h2>
      <p className="mt-1 text-sm text-muted">{issued ? `Final quotation r${issued.revision} · ${deal.currency} ${issued.netTotal}` : 'Issue a final quotation before recording an order.'}</p>
      {canEdit && issued && <form action={createOrderAction} className="mt-4 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="dealId" value={id} />
        <label className="text-sm font-medium">Customer PO reference<input name="poRef" required maxLength={200} className={control} /></label>
        <label className="text-sm font-medium">Deposit percent<input name="depositPercent" type="number" min="0" max="100" step="0.01" required className={control} /></label>
        <label className="text-sm font-medium md:col-span-2">Customer PO PDF<input name="customerPo" type="file" accept=".pdf,application/pdf" required className={control} /></label>
        <div className="md:col-span-2"><button className={button}>Record customer PO</button></div>
      </form>}
    </section>}
    {order && <section className={card}>
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{order.piNumber}</h2>
        <p className="mt-1 text-sm text-muted">Customer PO {order.customerPoRef} · {order.currency} {order.orderValue} · deposit {order.depositPercent ?? '—'}%</p></div>
        <a href={order.customerPoUrl} target="_blank" rel="noreferrer" className="text-sm text-brand underline">View attached PO</a></div>
      <p className="mt-3 text-sm">Verification: <strong>{order.poVerifiedAt ? `recorded ${order.poVerifiedAt.toISOString().slice(0, 10)}` : 'pending'}</strong> · Deal: <strong>{deal.salesStage.replaceAll('_', ' ')}</strong></p>
      <p className="mt-2 text-sm">Deposit received: {order.depositReceivedAt ? `${order.currency} ${order.depositReceivedAmount ?? 'amount unrecorded'} · ${order.depositReceivedAt.toISOString().slice(0, 10)}` : 'Pending'}</p>
      {order.poVerifiedAt && !order.depositReceivedAt && ['admin', 'manager', 'finance'].includes(user.role) && <form action={recordDepositAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="dealId" value={id} /><input type="hidden" name="orderId" value={order.id} />
        <label className="text-sm">Deposit received amount · {order.currency}<input name="amount" type="number" min="0.01" max={order.orderValue} step="0.01" required className={control} /></label>
        <button className={button}>Record deposit</button>
      </form>}
      {!order.poVerifiedAt && canApprove && <form action={verifyPoAction} className="mt-4 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4">
        <input type="hidden" name="dealId" value={id} /><input type="hidden" name="orderId" value={order.id} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="verifiedLineByLine" required />I checked each PO line against the final quotation.</label>
        <label className="block text-sm">Variance or resolution notes<textarea name="varianceNotes" rows={2} className={control} /></label>
        <button className={button}>Verify customer PO</button>
      </form>}
      {canApprove && deal.salesStage !== 'won' && <form action={markWonAction} className="mt-4">
        <input type="hidden" name="dealId" value={id} /><button className={button}>Mark deal won</button>
        {!order.poVerifiedAt && <p className="mt-2 text-xs text-amber-700">G3 will refuse this until the PO is verified.</p>}
      </form>}
      {canApprove && deal.salesStage === 'won' && !order.documentId && <form action={issuePiAction} className="mt-4">
        <input type="hidden" name="dealId" value={id} /><input type="hidden" name="orderId" value={order.id} />
        <button className={button}>Issue PI 訂單 PDF</button>
      </form>}
    </section>}
    {pi && <section className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Printed PI · {pi.docNumber}</h2>
        <p className="mt-1 text-sm text-muted">Status: {pi.status.replaceAll('_', ' ')}{pi.printedAt ? ` · printed ${pi.printedAt.toISOString().slice(0, 10)}` : ''}</p></div>
        <a href={pi.pdfUrl ?? '#'} target="_blank" rel="noreferrer" className="text-sm text-brand underline">Open PDF</a></div>
      {pi.status === 'issued' && canEdit && <form action={markPrintedAction} className="mt-4"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="documentId" value={pi.id} /><button className={button}>Record printed copy</button></form>}
      <div className="mt-4 space-y-2">{approvals.map((approval) => <div key={approval.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm">
        <span>{approval.approvalType.replaceAll('_', ' ')} · {approval.completedAt ? `signed by ${approval.completedBy}` : 'pending'}</span>
        {pi.status === 'printed' && canApprove && !approval.completedAt && <form action={completeApprovalAction}><input type="hidden" name="dealId" value={id} /><input type="hidden" name="documentId" value={pi.id} /><input type="hidden" name="approvalId" value={approval.id} /><button className="text-brand underline">Record signature</button></form>}
      </div>)}</div>
      {pi.status === 'printed' && canApprove && <form action={releaseDocumentAction} className="mt-4"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="documentId" value={pi.id} /><button className={button}>Release signed PI</button></form>}
    </section>}
  </div>;
}
