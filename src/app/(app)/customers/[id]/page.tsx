import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getCustomer } from "@/server/customers";
import { userNameMap } from "@/server/users";
import { TitleBlock } from "@/components/TitleBlock";
import { StatusPill, Button } from "@/components/ui";
import { DeleteCustomerButton } from "./DeleteCustomerButton";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const t = await getTranslations();

  const [customer, names] = await Promise.all([getCustomer(id), userNameMap()]);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 py-5">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/customers" className="text-xs text-grey-mute hover:text-ink mono">
          ← {t("nav.customers")}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {can(user.role, "u", "customer") && (
            <Link href={`/customers/${customer.id}/edit`}>
              <Button variant="secondary" size="sm">{t("common.edit")}</Button>
            </Link>
          )}
          {can(user.role, "d", "customer") && (
            <DeleteCustomerButton id={customer.id} name={customer.companyNameEn} />
          )}
        </div>
      </div>

      <TitleBlock
        eyebrow={`${t("customer.one")} · ${customer.customerCode}`}
        title={customer.companyNameEn}
        subtitle={customer.companyNameLocal ?? undefined}
        fields={[
          { label: t("customer.customerType"), value: <StatusPill tone={customer.customerType === "active" ? "active" : customer.customerType === "prospect" ? "warn" : "muted"}>{t(`enums.customerType.${customer.customerType}`)}</StatusPill> },
          { label: t("customer.country"), value: `${customer.country} · ${t(`country.${customer.country}`)}` },
          { label: t("customer.industry"), value: customer.industry ? t(`enums.industry.${customer.industry}`) : "—" },
          { label: t("customer.owner"), value: names.get(customer.ownerUserId) ?? "—" },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-sm border border-grey-line bg-surface p-4">
          <h2 className="label mb-3">{t("customer.sectionLocation")}</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
            {([
              [t("customer.city"), customer.city ?? "—"],
              [t("customer.primaryAgent"), customer.primaryAgent ? (
                <Link href={`/agents/${customer.primaryAgent.id}`} className="text-kmc-ink hover:underline mono">{customer.primaryAgent.agentCode}</Link>
              ) : "—"],
              [t("customer.employeeCount"), customer.employeeCount ?? "—"],
              [t("customer.website"), customer.website ? <a href={customer.website} target="_blank" rel="noreferrer" className="text-kmc-ink hover:underline">{customer.website}</a> : "—"],
            ] as Array<[string, React.ReactNode]>).map(([k, v], i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <dt className="text-[10px] uppercase tracking-wider text-grey-mute mono">{k}</dt>
                <dd className="text-sm text-ink mono">{v}</dd>
              </div>
            ))}
          </dl>
          {(customer.addressEn || customer.addressLocal) && (
            <div className="mt-3 border-t border-grey-line pt-3 text-sm text-ink">
              {customer.addressEn && <p>{customer.addressEn}</p>}
              {customer.addressLocal && <p className="text-grey-mute">{customer.addressLocal}</p>}
            </div>
          )}
          {customer.existingMachinesNotes && (
            <div className="mt-3 border-t border-grey-line pt-3">
              <div className="text-[10px] uppercase tracking-wider text-grey-mute mono">{t("customer.existingMachines")}</div>
              <p className="mt-0.5 text-sm text-ink">{customer.existingMachinesNotes}</p>
            </div>
          )}
        </section>

        <section className="rounded-sm border border-grey-line bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="label">{t("contact.many")}</h2>
            <span className="text-2xs text-grey-mute mono">{customer.contacts.length}</span>
          </div>
          {customer.contacts.length === 0 ? (
            <p className="text-sm text-grey-mute">{t("empty.contactsHint")}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {customer.contacts.map((c) => (
                  <tr key={c.id} className="border-b border-grey-line/60 last:border-0">
                    <td className="py-1.5 pr-3">
                      <Link href={`/contacts/${c.id}`} className="font-medium text-ink hover:text-kmc-ink">{c.fullName}</Link>
                      {c.isPrimary && <span className="ml-1.5"><StatusPill tone="active">{t("contact.isPrimary")}</StatusPill></span>}
                    </td>
                    <td className="py-1.5 pr-3 text-grey-mute">{c.jobTitle ?? "—"}</td>
                    <td className="py-1.5 text-grey-mute mono">{c.email ?? c.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {customer.notes && (
        <section className="mt-4 rounded-sm border border-grey-line bg-surface p-4">
          <h2 className="label mb-2">{t("customer.notes")}</h2>
          <p className="whitespace-pre-wrap text-sm text-ink">{customer.notes}</p>
        </section>
      )}
    </div>
  );
}
