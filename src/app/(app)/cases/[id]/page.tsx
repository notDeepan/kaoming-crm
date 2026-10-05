import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { messageDirections } from '@/db/enums';
import { addCaseMessageAction, markMessageSentAction, reviewTranslationAction,
  transitionCaseAction } from '@/features/cases/actions';
import { availableCaseTransitions, getCase } from '@/features/cases/service';
import { timeInState } from '@/features/cases/timing';
import { requireUser } from '@/lib/authorization';
import { openPartsRequestAction } from '@/features/parts/actions';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white';
export default async function CasePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireUser()]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const data = await getCase(id);
  if (!data) notFound();
  const editable = ['admin', 'manager', 'sales', 'service'].includes(user.role) && data.case.status !== 'closed';
  const transitions = availableCaseTransitions(data.case.status, data.states);
  return <div className="space-y-6"><Link href="/cases" className="text-sm text-brand underline">← Case queue</Link>
    <PageHeader eyebrow="AFTER-SALES / 售後" title={`${data.case.caseNumber} · ${data.case.subject}`}
      description={`${data.partnerName} · ${data.serialNumber ?? 'machine not identified'} · ${data.case.caseType.replaceAll('_', ' ')}`} />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    <section className={card}><h2 className="font-semibold">State · {data.case.status.replaceAll('_', ' ')}</h2>
      <p className="mt-2 text-sm text-slate-600">Priority {data.case.priority} · assigned {data.case.assignedDept ?? 'not assigned'} · resolution {data.case.resolution ?? 'pending'}</p>
      {editable && transitions.length > 0 && <form action={transitionCaseAction} className="mt-4 flex flex-wrap items-end gap-3"><input type="hidden" name="caseId" value={id} />
        <label className="text-sm">Next state<select name="target" className={control}>{transitions.map((status) =>
          <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="min-w-[280px] flex-1 text-sm">Resolution, required when resolving<input name="resolution" className={control} /></label>
        <button className={button}>Change state</button></form>}
      <div className="mt-5 flex flex-wrap gap-2 text-xs">{data.states.map((entry) =>
        <span key={entry.id} className="rounded-md bg-slate-100 px-2 py-1">{entry.toStatus.replaceAll('_', ' ')} · {entry.at.toISOString().slice(0, 16)}</span>)}</div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">{timeInState(data.states).map((entry) =>
        <span key={entry.status} className="rounded-md border border-slate-200 px-2 py-1">{entry.status.replaceAll('_', ' ')} · {entry.hours} hours</span>)}</div>
    </section>
    <section className={card}><h2 className="font-semibold">Bilingual thread · {data.messages.length} messages</h2>
      <p className="mt-1 text-sm text-slate-500">Original text is retained exactly. Enter the translation and review it before an outbound message is marked sent.</p>
      <div className="mt-4 space-y-4">{data.messages.map((message) => <article key={message.id} className="rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{message.direction.replaceAll('_', ' ')} · {message.sourceLanguage} · {message.createdAt.toISOString().slice(0, 16)}</span>
          <span>{message.sentAt ? 'Sent' : message.reviewedAt ? 'Reviewed' : 'Translation pending'}</span></div>
        <div className="mt-3 grid gap-4 md:grid-cols-2"><div><h3 className="text-xs font-semibold uppercase text-slate-500">Original / 原文</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm">{message.sourceText}</p></div>
          <div><h3 className="text-xs font-semibold uppercase text-slate-500">Translation / 譯文</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{message.translatedText ?? 'Awaiting review'}</p></div></div>
        {editable && !message.sentAt && <form action={reviewTranslationAction} className="mt-4 grid gap-3 border-t pt-4">
          <input type="hidden" name="caseId" value={id} /><input type="hidden" name="messageId" value={message.id} />
          <label className="text-sm">Reviewed translation<textarea name="translatedText" rows={3} defaultValue={message.translatedText ?? ''} required className={control} /></label>
          <label className="text-sm">Translation source<select name="source" defaultValue="human" className={control}>
            <option value="human">Human reviewed</option></select></label>
          <div><button className={button}>Save reviewed translation</button></div></form>}
        {editable && message.direction.startsWith('outbound_') && message.reviewedAt && !message.sentAt &&
          <form action={markMessageSentAction} className="mt-3"><input type="hidden" name="caseId" value={id} /><input type="hidden" name="messageId" value={message.id} />
            <button className="text-sm font-medium text-brand underline">Mark outbound correspondence sent</button></form>}
      </article>)}</div>
      {editable && <form action={addCaseMessageAction} className="mt-5 grid gap-3 border-t pt-5 md:grid-cols-2">
        <input type="hidden" name="caseId" value={id} />
        <label className="text-sm">Direction<select name="direction" className={control}>{messageDirections.map((value) =>
          <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="text-sm">Original language<select name="sourceLanguage" className={control}><option value="en">English</option><option value="zh-Hant">繁體中文</option></select></label>
        <label className="text-sm md:col-span-2">Original message · exact text<textarea name="sourceText" rows={4} required className={control} /></label>
        <div className="md:col-span-2"><button className={button}>Record message</button></div></form>}
    </section>
    {data.case.caseType === 'part_failure' && <section className={card}><h2 className="font-semibold">Linked parts request</h2>
      {data.case.linkedPartsRequestId ? <Link className="mt-2 inline-block text-sm text-brand underline" href={`/aftermarket/${data.case.linkedPartsRequestId}`}>Open parts request</Link> :
        editable ? <form action={openPartsRequestAction} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="partnerId" value={data.case.partnerId} />
          <input type="hidden" name="machineId" value={data.case.machineId ?? ''} />
          <input type="hidden" name="linkedCaseId" value={id} />
          <label className="text-sm">Part or symptom<textarea name="description" rows={2} required defaultValue={data.case.subject} className={control} /></label>
          <label className="text-sm">Quantity<input name="quantity" type="number" min="1" max="1000" defaultValue={1} required className={control} /></label>
          <div className="md:col-span-2"><button className={button}>Create linked parts request</button></div>
        </form> : <p className="mt-2 text-sm text-slate-500">No parts request linked.</p>}
    </section>}
  </div>;
}
