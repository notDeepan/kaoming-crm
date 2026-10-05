import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isNull } from 'drizzle-orm';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { getDb } from '@/db/client';
import { specCategories } from '@/db/schema';
import { generateConfigurationAction, saveSpecValueAction } from '@/features/configuration/actions';
import { listDealConfiguration } from '@/features/configuration/service';
import { getDeal, listQuoteRevisions } from '@/features/deals/queries';
import { requireUser } from '@/lib/authorization';

const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700';

export default async function ConfigurationPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireUser()]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [deal, values, categories, revisions] = await Promise.all([
    getDeal(id), listDealConfiguration(id),
    getDb().select({ id: specCategories.id, code: specCategories.code,
      nameEn: specCategories.nameEn, nameZh: specCategories.nameZh })
      .from(specCategories).where(isNull(specCategories.deletedAt)).orderBy(specCategories.sortOrder),
    listQuoteRevisions(id),
  ]);
  if (!deal) notFound();
  const canEdit = ['admin', 'manager', 'sales'].includes(user.role);
  const issued = revisions.find((revision) => revision.status === 'issued');
  const missing = categories.filter((category) => !values.some((value) => value.categoryId === category.id));
  return <div className="space-y-6">
    <Link href={`/deals/${id}`} className="text-sm text-brand hover:underline">← {deal.dealNumber} quotation</Link>
    <PageHeader eyebrow="DEAL / 規格" title="Configuration" description="English values go to the agent; Chinese values go to the factory. The latest issued quotation and the agent compliance profile are the source." />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="font-semibold">Resolved specification</h2>
          <p className="mt-1 text-sm text-muted">{issued ? `Source: issued quotation r${issued.revision}` : 'Issue a final quotation before generating configuration.'}</p></div>
        {canEdit && <form action={generateConfigurationAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="dealId" value={id} />
          <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="replaceManual" />Replace reviewed manual edits</label>
          <button className={button} disabled={!issued}>Generate from quotation</button>
        </form>}
      </div>
      {values.length === 0 ? <p className="mt-6 text-sm text-muted">No configuration values have been resolved yet.</p> :
        <div className="mt-5 space-y-3">{values.map((value) => <form action={saveSpecValueAction} key={value.id}
          className="grid gap-3 rounded-lg border border-slate-200 p-4 lg:grid-cols-[160px_1fr_1fr_auto] lg:items-end">
          <input type="hidden" name="dealId" value={id} /><input type="hidden" name="categoryId" value={value.categoryId} />
          <div><strong className="block text-sm">{value.nameZh}</strong><span className="text-xs text-muted">{value.nameEn}<br />{value.source.replaceAll('_', ' ')}{value.isUpgraded ? ' · upgraded' : ''}</span></div>
          <label className="text-xs font-medium">Value — English<textarea name="valueEn" defaultValue={value.valueEn} readOnly={!canEdit} rows={2} className={control} /></label>
          <label className="text-xs font-medium">值 — 中文<textarea name="valueZh" defaultValue={value.valueZh} readOnly={!canEdit} rows={2} className={control} /></label>
          {canEdit && <button className={button}>Save</button>}
        </form>)}</div>}
    </section>
    {canEdit && missing.length > 0 && <form action={saveSpecValueAction} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
      <h2 className="font-semibold md:col-span-2">Add a missing specification</h2>
      <input type="hidden" name="dealId" value={id} />
      <label className="text-sm font-medium md:col-span-2">Category<select name="categoryId" required className={control}>{missing.map((category) => <option key={category.id} value={category.id}>{category.nameZh} · {category.nameEn}</option>)}</select></label>
      <label className="text-sm font-medium">Value — English<textarea name="valueEn" required rows={2} className={control} /></label>
      <label className="text-sm font-medium">值 — 中文<textarea name="valueZh" required rows={2} className={control} /></label>
      <div className="md:col-span-2"><button className={button}>Add specification</button></div>
    </form>}
  </div>;
}
