'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { changePassword } from '@/features/users/actions';
import { initialPasswordActionState } from '@/features/users/validation';

const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink';

export function ChangePasswordForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(changePassword, initialPasswordActionState);
  return <form action={action} className="max-w-xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <div>
      <label htmlFor="current-password" className="text-sm font-medium">{t('Current password')}</label>
      <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required className={control} />
    </div>
    <div>
      <label htmlFor="new-password" className="text-sm font-medium">{t('New password')}</label>
      <input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required className={control} />
    </div>
    <div>
      <label htmlFor="confirm-new-password" className="text-sm font-medium">{t('Confirm new password')}</label>
      <input id="confirm-new-password" name="confirmNewPassword" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required className={control} />
    </div>
    {state.message && <p role="status" className={`rounded-md p-3 text-sm ${state.ok ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>{t(state.message)}</p>}
    <button type="submit" disabled={pending} className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{t('Save new password')}</button>
  </form>;
}
