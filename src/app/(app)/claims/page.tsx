import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { PageHeader } from '@/components/page-header';
import { getDb } from '@/db/client';
import { machineModels, machines, partners } from '@/db/schema';
import { createClaimAction } from '@/features/claims/actions';
import { listClaims } from '@/features/claims/service';
import { requireUser } from '@/lib/authorization';
import { taipeiDate } from '@/lib/business-date';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700';

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [user, query, rows] = await Promise.all([requireUser(), searchParams, listClaims()]);
  const registered = await getDb().select({ id: machines.id, serial: machines.serialNumber,
    model: machineModels.code, partner: partners.name }).from(machines)
    .innerJoin(machineModels, eq(machineModels.id, machines.machineModelId))
    .innerJoin(partners, eq(partners.id, machines.partnerId));
  const canEdit = ['admin', 'manager', 'sales', 'finance'].includes(user.role);
  return <div className="space-y-6"><PageHeader eyebrow="COMMERCIAL" title="Claims and disputes" description="One record per monetary claim, linked to the installed machine and its order. Positions and events remain traceable." />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    <section className={card}><h2 className="font-semibold">Claims register</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted"><tr><th className="pb-2">Claim</th><th className="pb-2">Agent / machine</th><th className="pb-2">Category</th><th className="pb-2">Claimed</th><th className="pb-2">Offered</th><th className="pb-2">Settled</th><th className="pb-2">Status</th></tr></thead><tbody>{rows.map(({ claim, partnerName, serialNumber, modelCode }) => <tr key={claim.id} className="border-b border-slate-100"><td className="py-3"><Link href={`/claims/${claim.id}`} className="font-medium text-brand underline">{claim.claimNumber}</Link><span className="block text-xs text-muted">{claim.receivedAt}</span></td><td>{partnerName}<span className="block text-xs text-muted">{modelCode} · {serialNumber}</span></td><td>{claim.category.replaceAll('_', ' ')}</td><td>{claim.claimedCurrency} {claim.claimedAmount}</td><td>{claim.offeredCurrency ?? '—'} {claim.offeredAmount ?? ''}</td><td>{claim.settledCurrency ?? '—'} {claim.settledAmount ?? ''}</td><td>{claim.status.replaceAll('_', ' ')}{claim.pendingCredit ? ' · credit pending' : ''}</td></tr>)}</tbody></table></div>{!rows.length && <p className="mt-4 text-sm text-muted">No claims recorded yet.</p>}</section>
    {canEdit && <section className={card}><h2 className="font-semibold">Register a claim</h2><p className="mt-1 text-sm text-muted">Select the shipped machine. The claim inherits its agent, customer and order.</p>
      {registered.length ? <form action={createClaimAction} className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm">Machine<select name="machineId" required className={control}>{registered.map((machine) => <option key={machine.id} value={machine.id}>{machine.serial} · {machine.model} · {machine.partner}</option>)}</select></label><label className="text-sm">Received date<input name="receivedAt" type="date" required defaultValue={taipeiDate()} className={control} /></label><label className="text-sm">Source email subject / reference<input name="sourceReference" className={control} /></label><label className="text-sm">Category<select name="category" className={control}>{['late_delivery', 'spec_mismatch', 'documentation_error', 'installation_labour', 'freight_difference', 'design_defect', 'performance_shortfall', 'other'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><label className="text-sm md:col-span-2">Problem description<textarea name="description" rows={3} required className={control} /></label><label className="text-sm">Claimed amount<input name="claimedAmount" inputMode="decimal" required className={control} /></label><label className="text-sm">Currency<input name="claimedCurrency" maxLength={3} defaultValue="EUR" required className={control} /></label><label className="text-sm">Responsibility<select name="responsibility" className={control}>{['disputed', 'kao_ming', 'agent', 'customer', 'supplier', 'forwarder'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><div className="md:col-span-2"><button className={button}>Register claim</button></div></form> : <p className="mt-4 text-sm text-amber-700">Ship a machine before registering a claim.</p>}
    </section>}
  </div>;
}
