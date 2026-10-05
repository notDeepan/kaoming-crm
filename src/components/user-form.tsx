'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { userRoles } from '@/db/enums';
import { createUser, deactivateUser } from '@/features/users/actions';
import { initialUserActionState } from '@/features/users/validation';

const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink';

export function UserForm() {
  const t = useTranslations();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(createUser, initialUserActionState);
  useEffect(() => { if (state.ok) formRef.current?.reset(); }, [state.ok]);
  return (
    <form ref={formRef} action={action} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">{t('Add user')}</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <div><label htmlFor="user-name" className="text-sm font-medium">{t('Name')}</label><input id="user-name" name="name" required className={control} /></div>
        <div><label htmlFor="user-email" className="text-sm font-medium">{t('Email')}</label><input id="user-email" name="email" type="email" autoComplete="off" required className={control} /></div>
        <div><label htmlFor="user-password" className="text-sm font-medium">{t('Initial password')}</label><input id="user-password" name="password" type="password" minLength={12} autoComplete="new-password" required className={control} /></div>
        <div><label htmlFor="user-role" className="text-sm font-medium">{t('Role')}</label><select id="user-role" name="role" defaultValue="sales" className={control}>{userRoles.map((role) => <option key={role} value={role}>{t(role)}</option>)}</select></div>
        <div><label htmlFor="user-department" className="text-sm font-medium">{t('Department')}</label><input id="user-department" name="department" className={control} /></div>
        <div><label htmlFor="user-locale" className="text-sm font-medium">{t('Language')}</label><select id="user-locale" name="locale" defaultValue="en" className={control}><option value="en">English</option><option value="zh-Hant">繁體中文</option></select></div>
      </div>
      {state.message && <p role="status" className={`rounded-md p-3 text-sm ${state.ok ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>{t(state.message)}</p>}
      <button type="submit" disabled={pending} className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{t('Add user')}</button>
    </form>
  );
}

export function DeactivateUserForm({ id }: { id: string }) {
  const t = useTranslations();
  return <form action={deactivateUser} onSubmit={(event) => { if (!window.confirm(t('Deactivate this user?'))) event.preventDefault(); }}>
    <input type="hidden" name="id" value={id} />
    <button type="submit" className="text-xs font-medium text-red-700 hover:underline">{t('Deactivate')}</button>
  </form>;
}
