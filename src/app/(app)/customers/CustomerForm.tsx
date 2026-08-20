"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Field, TextInput, TextArea, Select } from "@/components/ui";
import { COUNTRY_CODES } from "@/lib/countries";
import { INDUSTRIES, CUSTOMER_TYPES } from "@/lib/enums";
import type { CustomerFormState } from "./actions";
import type { CustomerInitial } from "./empty";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-grey-line py-5 first:border-t-0">
      <h2 className="label mb-3">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export function CustomerForm({
  mode,
  action,
  initial,
  users,
  agents,
}: {
  mode: "create" | "edit";
  action: (prev: CustomerFormState, fd: FormData) => Promise<CustomerFormState>;
  initial: CustomerInitial;
  users: Array<{ id: string; fullName: string }>;
  agents: Array<{ id: string; label: string }>;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};
  const backHref = initial.id ? `/customers/${initial.id}` : "/customers";

  return (
    <form action={formAction} className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-grey-line px-5 py-3">
        <h1 className="text-xl font-semibold">
          {mode === "create" ? t("customer.newCustomer") : t("customer.editCustomer")}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Link href={backHref}>
            <Button variant="ghost" size="sm" type="button">{t("common.cancel")}</Button>
          </Link>
          <Button variant="primary" size="sm" type="submit" disabled={pending}>{t("common.save")}</Button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mx-5 mt-4 rounded-sm border border-alert/30 bg-alert-wash px-3 py-2 text-xs text-alert">
          {state.error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-16">
        <Section title={t("customer.sectionIdentity")}>
          <Field label={t("customer.code")} htmlFor="customerCode" hint={mode === "create" ? "C-NNNN" : undefined} error={fe.customerCode}>
            <TextInput id="customerCode" name="customerCode" mono defaultValue={initial.customerCode} placeholder={mode === "create" ? "auto" : undefined} />
          </Field>
          <Field label={t("customer.companyNameEn")} htmlFor="companyNameEn" required error={fe.companyNameEn}>
            <TextInput id="companyNameEn" name="companyNameEn" defaultValue={initial.companyNameEn} required />
          </Field>
          <Field label={t("customer.companyNameLocal")} htmlFor="companyNameLocal">
            <TextInput id="companyNameLocal" name="companyNameLocal" defaultValue={initial.companyNameLocal} />
          </Field>
          <Field label={t("customer.customerType")} htmlFor="customerType" required>
            <Select id="customerType" name="customerType" defaultValue={initial.customerType || "prospect"}>
              {CUSTOMER_TYPES.map((v) => (
                <option key={v} value={v}>{t(`enums.customerType.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("customer.industry")} htmlFor="industry">
            <Select id="industry" name="industry" defaultValue={initial.industry}>
              <option value="">{t("common.notSet")}</option>
              {INDUSTRIES.map((v) => (
                <option key={v} value={v}>{t(`enums.industry.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("customer.website")} htmlFor="website">
            <TextInput id="website" name="website" type="url" placeholder="https://" defaultValue={initial.website} />
          </Field>
        </Section>

        <Section title={t("customer.sectionLocation")}>
          <Field label={t("customer.country")} htmlFor="country" required error={fe.country}>
            <Select id="country" name="country" defaultValue={initial.country} required>
              <option value="" disabled>{t("common.notSet")}</option>
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>{t(`country.${c}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("customer.city")} htmlFor="city">
            <TextInput id="city" name="city" defaultValue={initial.city} />
          </Field>
          <Field label={t("customer.employeeCount")} htmlFor="employeeCount">
            <TextInput id="employeeCount" name="employeeCount" type="number" mono defaultValue={initial.employeeCount} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("customer.addressEn")} htmlFor="addressEn">
              <TextArea id="addressEn" name="addressEn" defaultValue={initial.addressEn} />
            </Field>
            <Field label={t("customer.addressLocal")} htmlFor="addressLocal">
              <TextArea id="addressLocal" name="addressLocal" defaultValue={initial.addressLocal} />
            </Field>
          </div>
        </Section>

        <Section title={t("customer.sectionCommercial")}>
          <Field label={t("customer.primaryAgent")} htmlFor="primaryAgentId" hint={t("customer.primaryAgentHint")}>
            <Select id="primaryAgentId" name="primaryAgentId" defaultValue={initial.primaryAgentId}>
              <option value="">{t("common.notSet")}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("customer.owner")} htmlFor="ownerUserId" required error={fe.ownerUserId}>
            <Select id="ownerUserId" name="ownerUserId" defaultValue={initial.ownerUserId} required>
              <option value="" disabled>{t("common.notSet")}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label={t("customer.existingMachines")} htmlFor="existingMachinesNotes" hint={t("customer.existingMachinesHint")}>
              <TextInput id="existingMachinesNotes" name="existingMachinesNotes" defaultValue={initial.existingMachinesNotes} />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label={t("customer.notes")} htmlFor="notes">
              <TextArea id="notes" name="notes" defaultValue={initial.notes} />
            </Field>
          </div>
        </Section>
      </div>
    </form>
  );
}

