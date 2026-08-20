import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getContact } from "@/server/contacts";
import { TitleBlock } from "@/components/TitleBlock";
import { StatusPill, Button } from "@/components/ui";
import { DeleteContactButton } from "./DeleteContactButton";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const t = await getTranslations();

  const contact = await getContact(id);
  if (!contact) notFound();

  const parentHref =
    contact.parentType === "agent" && contact.agent
      ? `/agents/${contact.agent.id}`
      : contact.customer
        ? `/customers/${contact.customer.id}`
        : "#";
  const parentName =
    contact.parentType === "agent" ? contact.agent?.companyNameEn : contact.customer?.companyNameEn;
  const parentCode =
    contact.parentType === "agent" ? contact.agent?.agentCode : contact.customer?.customerCode;

  return (
    <div className="mx-auto max-w-4xl px-5 py-5">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/contacts" className="text-xs text-grey-mute hover:text-ink mono">
          ← {t("nav.contacts")}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {can(user.role, "u", "contact") && (
            <Link href={`/contacts/${contact.id}/edit`}>
              <Button variant="secondary" size="sm">{t("common.edit")}</Button>
            </Link>
          )}
          {can(user.role, "d", "contact") && (
            <DeleteContactButton id={contact.id} name={contact.fullName} />
          )}
        </div>
      </div>

      <TitleBlock
        eyebrow={t("contact.one")}
        title={
          <span className="flex items-center gap-2">
            {contact.fullName}
            {contact.isPrimary && <StatusPill tone="active">{t("contact.isPrimary")}</StatusPill>}
          </span>
        }
        subtitle={contact.nameLocal ?? undefined}
        fields={[
          { label: t("contact.jobTitle"), value: contact.jobTitle ?? "—" },
          { label: t("contact.roleInDeal"), value: contact.roleInDeal ? t(`enums.roleInDeal.${contact.roleInDeal}`) : "—" },
          { label: t("contact.parentType"), value: t(`enums.contactParent.${contact.parentType}`) },
          {
            label: t("contact.parent"),
            value: (
              <Link href={parentHref} className="text-kmc-ink hover:underline">
                {parentCode}
              </Link>
            ),
          },
        ]}
      />

      <section className="mt-4 rounded-sm border border-grey-line bg-surface p-4">
        <h2 className="label mb-3">{t("contact.one")}</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {([
            [t("contact.email"), contact.email ? <a href={`mailto:${contact.email}`} className="text-kmc-ink hover:underline">{contact.email}</a> : "—"],
            [t("contact.phone"), contact.phone ?? "—"],
            [t("contact.mobile"), contact.mobile ?? "—"],
            [t("contact.messagingHandle"), contact.messagingHandle ?? "—"],
            [t("contact.preferredLanguage"), contact.preferredLanguage ? t(`enums.language.${contact.preferredLanguage}`) : "—"],
            [t("contact.parent"), `${parentCode} · ${parentName ?? "—"}`],
          ] as Array<[string, React.ReactNode]>).map(([k, v], i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <dt className="text-[10px] uppercase tracking-wider text-grey-mute mono">{k}</dt>
              <dd className="text-sm text-ink mono">{v}</dd>
            </div>
          ))}
        </dl>
        {contact.notes && (
          <div className="mt-3 border-t border-grey-line pt-3">
            <p className="whitespace-pre-wrap text-sm text-ink">{contact.notes}</p>
          </div>
        )}
      </section>
    </div>
  );
}
