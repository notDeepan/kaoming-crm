import { getTranslations } from 'next-intl/server';
import { ChangePasswordForm } from '@/components/change-password-form';
import { PageHeader } from '@/components/page-header';
import { requireUser } from '@/lib/authorization';

export default async function AccountSecurityPage() {
  await requireUser();
  const t = await getTranslations();
  return <div className="space-y-6">
    <PageHeader eyebrow="ACCOUNT / 帳戶" title={t('Account security')} description={t('Change your sign-in password')} />
    <ChangePasswordForm />
  </div>;
}
