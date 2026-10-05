import { asc, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { DeactivateUserForm, UserForm } from '@/components/user-form';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { requireUser } from '@/lib/authorization';

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== 'admin') notFound();
  const [t, rows] = await Promise.all([
    getTranslations(),
    getDb().select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive })
      .from(users).where(isNull(users.deletedAt)).orderBy(asc(users.name)),
  ]);
  return <div className="space-y-7">
    <PageHeader eyebrow="ACCESS / 權限" title={t('Settings')} description={t('User administration description')} />
    <Link href="/settings/audit" className="text-sm text-brand underline">View change history</Link>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">{t('Name')}</th><th className="px-5 py-3">{t('Email')}</th><th className="px-5 py-3">{t('Role')}</th><th className="px-5 py-3">{t('STATUS')}</th><th className="px-5 py-3">{t('Action')}</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 font-medium">{row.name}</td><td className="px-5 py-4">{row.email}</td><td className="px-5 py-4">{t(row.role)}</td><td className="px-5 py-4">{row.isActive ? t('Active') : t('Inactive')}</td><td className="px-5 py-4">{row.isActive && row.role !== 'admin' && <DeactivateUserForm id={row.id} />}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="max-w-4xl"><UserForm /></div>
  </div>;
}
