import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { getDealDocuments, getDocumentApprovals } from '@/features/documents/service';
import { getDeal } from '@/features/deals/queries';
import {
  acknowledgeSpecAction, approveManufacturingDocumentAction, createMiDraftAction,
  createSpecRevisionAction, distributeSpecAction, issueMiAction, issueSpecRevisionAction,
  markManufacturingPrintedAction, refreshSpecDraftAction, releaseManufacturingDocumentAction,
  uploadCustomImageAction,
} from '@/features/manufacturing/actions';
import { getDealWorkOrder, getSpecSheetDistributions, getWorkOrderSpecSheets } from '@/features/manufacturing/service';
import { getDealOrder } from '@/features/orders/service';
import { requireUser } from '@/lib/authorization';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700';

export default async function ManufacturingPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireUser()]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [deal, order, work, docs] = await Promise.all([
    getDeal(id), getDealOrder(id), getDealWorkOrder(id), getDealDocuments(id),
  ]);
  if (!deal) notFound();
  const sheets = work ? await getWorkOrderSpecSheets(work.workOrder.id) : [];
  const currentSheet = sheets[0];
  const distributions = currentSheet ? await getSpecSheetDistributions(currentSheet.id) : [];
  const manufacturingDocs = docs.filter((doc) => doc.docType === 'mi' || doc.docType === 'spec_sheet');
  const approvals = await Promise.all(manufacturingDocs.map((doc) => getDocumentApprovals(doc.id)));
  const canIssue = ['admin', 'manager'].includes(user.role);
  const canUpload = ['admin', 'manager', 'sales'].includes(user.role);
  return <div className="space-y-6">
    <Link href={`/deals/${id}`} className="text-sm text-brand hover:underline">← {deal.dealNumber} quotation</Link>
    <PageHeader eyebrow="DEAL / 製造" title="MI 製令單 and 製造規格表"
      description="The issued specification freezes Chinese configuration values by 版次. Paper copies remain traceable by department." />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    {!order && <section className={card}><p className="text-sm text-muted">Record and verify the customer PO in <Link href={`/deals/${id}/order`} className="text-brand underline">PI 訂單</Link> first.</p></section>}
    {order && !work && <section className={card}>
      <h2 className="font-semibold">Prepare MI draft</h2>
      <p className="mt-1 text-sm text-muted">Review the <Link href={`/deals/${id}/configuration`} className="text-brand underline">English and Chinese configuration</Link> before freezing 版次 1.</p>
      {canIssue && <form action={createMiDraftAction} className="mt-4 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="dealId" value={id} /><input type="hidden" name="orderId" value={order.id} />
        <label className="text-sm font-medium">製造批號 · batch number<input name="batchNumber" className={control} /></label>
        <label className="text-sm font-medium">開工日期 · planned start<input name="plannedStart" type="date" className={control} /></label>
        <label className="text-sm font-medium">完工日期 · planned finish<input name="plannedFinish" type="date" className={control} /></label>
        <label className="text-sm font-medium">預定單 hold stage<input name="provisionalHoldStage" className={control} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isProvisional" />Provisional order</label>
        <div className="md:col-span-2"><button className={button}>Create MI draft</button></div>
      </form>}
    </section>}
    {work && <section className={card}>
      <h2 className="font-semibold">{work.workOrder.miNumber} · 版次 {currentSheet?.revision ?? '—'}</h2>
      <p className="mt-1 text-sm text-muted">{work.workOrder.issuedAt ? `Issued ${work.workOrder.issuedAt.toISOString().slice(0, 10)}` : 'Draft · destination data and custom image binding are checked on issue'}</p>
      {canUpload && currentSheet && !currentSheet.issuedAt && <form action={uploadCustomImageAction} className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-slate-200 p-4">
        <input type="hidden" name="dealId" value={id} /><input type="hidden" name="sheetId" value={currentSheet.id} />
        <label className="text-sm font-medium">Custom change image for 版次 {currentSheet.revision}<input name="image" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" required className={control} /></label>
        <button className={button}>Attach to revision</button>
      </form>}
      {canIssue && currentSheet && !currentSheet.issuedAt && <form action={refreshSpecDraftAction} className="mt-4"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="workOrderId" value={work.workOrder.id} /><button className={button}>Refresh draft from configuration</button></form>}
      {canIssue && !work.workOrder.issuedAt && <form action={issueMiAction} className="mt-4 flex flex-wrap items-end gap-3"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="workOrderId" value={work.workOrder.id} /><label className="text-sm font-medium">Contractual delivery date<input name="contractualDeliveryDate" type="date" required defaultValue={order?.contractualDeliveryDate ?? work.workOrder.plannedFinish ?? ''} className={control} /></label><button className={button}>Issue MI and 製造規格表 PDFs</button></form>}
      {canIssue && work.workOrder.issuedAt && currentSheet?.issuedAt && <form action={createSpecRevisionAction} className="mt-4"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="workOrderId" value={work.workOrder.id} /><button className={button}>Create next specification 版次</button></form>}
      {canIssue && work.workOrder.issuedAt && currentSheet && !currentSheet.issuedAt && <form action={issueSpecRevisionAction} className="mt-4"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="workOrderId" value={work.workOrder.id} /><button className={button}>Issue specification revision PDF</button></form>}
    </section>}
    {manufacturingDocs.map((doc, index) => <section key={doc.id} className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{doc.docType === 'mi' ? '製令單' : '製造規格表'} · {doc.docNumber} / 版次 {doc.revision}</h2>
        <p className="mt-1 text-sm text-muted">Status: {doc.status.replaceAll('_', ' ')}</p></div>
        <a href={doc.pdfUrl ?? '#'} target="_blank" rel="noreferrer" className="text-brand underline">Open Chinese PDF</a></div>
      {doc.status === 'issued' && canUpload && <form action={markManufacturingPrintedAction} className="mt-4"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="documentId" value={doc.id} /><button className={button}>Record printed copy</button></form>}
      {approvals[index]?.map((approval) => <div key={approval.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm">
        <span>{approval.approvalType.replaceAll('_', ' ')} · {approval.completedAt ? `signed by ${approval.completedBy}` : 'pending'}</span>
        {doc.status === 'printed' && canIssue && !approval.completedAt && <form action={approveManufacturingDocumentAction}><input type="hidden" name="dealId" value={id} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="approvalId" value={approval.id} /><button className="text-brand underline">Record signature</button></form>}
      </div>)}
      {doc.status === 'printed' && canIssue && <form action={releaseManufacturingDocumentAction} className="mt-4"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="documentId" value={doc.id} /><button className={button}>Release signed copy</button></form>}
    </section>)}
    {currentSheet?.issuedAt && <section className={card}><h2 className="font-semibold">Paper circulation · 版次 {currentSheet.revision}</h2>
      <div className="mt-3 space-y-2">{distributions.map((row) => <div key={row.id} className="flex flex-wrap justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm">
        <span>{row.department} · distributed {row.distributedAt?.toISOString().slice(0, 10)} · {row.acknowledgedAt ? 'acknowledged' : 'awaiting acknowledgement'}</span>
        {canIssue && !row.acknowledgedAt && <form action={acknowledgeSpecAction}><input type="hidden" name="dealId" value={id} /><input type="hidden" name="distributionId" value={row.id} /><button className="text-brand underline">Acknowledge</button></form>}
      </div>)}</div>
      {canIssue && <form action={distributeSpecAction} className="mt-4 flex items-end gap-3"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="sheetId" value={currentSheet.id} />
        <label className="text-sm font-medium">Department<select name="department" className={control}><option>生管</option><option>採購</option><option>製造</option></select></label><button className={button}>Record distribution</button></form>}
    </section>}
  </div>;
}
