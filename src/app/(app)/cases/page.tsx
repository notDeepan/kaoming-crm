import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { casePriorities, caseTypes } from '@/db/enums';
import { openCaseAction } from '@/features/cases/actions';
import { caseOptions, listCases } from '@/features/cases/service';
import { requireUser } from '@/lib/authorization';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
export default async function CasesPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [user, query, rows, [agents, machines]] = await Promise.all([
    requireUser(), searchParams, listCases(), caseOptions(),
  ]);
  const canEdit = ['admin', 'manager', 'sales', 'service'].includes(user.role);
  return <div className="space-y-6"><PageHeader eyebrow="AFTER-SALES" title="Bilingual service cases"
    description="One issue per case. Keep the original and reviewed translation together, then record every state change." />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {canEdit && <section className={card}><h2 className="font-semibold">Open a case</h2>
      <form action={openCaseAction} className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm">Agent<select name="partnerId" required className={control}><option value="">Select agent</option>
          {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
        <label className="text-sm">Machine serial, if known<select name="machineId" className={control}><option value="">Unknown machine</option>
          {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.serialNumber}</option>)}</select></label>
        <label className="text-sm">Case type<select name="caseType" className={control}>{caseTypes.map((type) =>
          <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="text-sm">Priority<select name="priority" className={control}>{casePriorities.map((priority) =>
          <option key={priority} value={priority}>{priority.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="text-sm md:col-span-2">Subject<input name="subject" required maxLength={500} className={control} /></label>
        <div className="md:col-span-3"><button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Open case</button></div>
      </form></section>}
    <section className={card}><h2 className="font-semibold">Case queue · {rows.length} cases</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-2">Case</th><th>Subject</th><th>Agent / machine</th><th>Priority</th><th>Status</th><th>Opened</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.case.id} className="border-b border-slate-100"><td className="py-3"><Link href={`/cases/${row.case.id}`} className="font-medium text-brand underline">{row.case.caseNumber}</Link></td>
          <td>{row.case.subject}</td><td>{row.partnerName}<span className="block text-xs text-slate-500">{row.serialNumber ?? 'Machine unknown'}</span></td>
          <td>{row.case.priority.replaceAll('_', ' ')}</td><td>{row.case.status.replaceAll('_', ' ')}</td><td>{row.case.openedAt.toISOString().slice(0, 10)}</td></tr>)}</tbody></table>
        {!rows.length && <p className="mt-4 text-sm text-slate-500">No cases have been recorded.</p>}</div></section>
  </div>;
}
