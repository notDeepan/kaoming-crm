"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Field, TextInput, TextArea, Select } from "@/components/ui";
import { COUNTRY_CODES } from "@/lib/countries";
import {
  AGENT_TYPES,
  AGENT_STATUSES,
  EXCLUSIVITY,
  PRICING_BASIS,
  CURRENCIES,
  WORKING_LANGUAGES,
  PRODUCT_FAMILIES,
} from "@/lib/enums";
import type { AgentFormState } from "./actions";
import type { AgentInitial } from "./empty";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-grey-line py-5 first:border-t-0">
      <h2 className="label mb-3">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export function AgentForm({
  mode,
  action,
  initial,
  users,
  defaultCadence,
}: {
  mode: "create" | "edit";
  action: (prev: AgentFormState, fd: FormData) => Promise<AgentFormState>;
  initial: AgentInitial;
  users: Array<{ id: string; fullName: string }>;
  defaultCadence: number;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<AgentFormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  const backHref = initial.id ? `/agents/${initial.id}` : "/agents";

  return (
    <form action={formAction} className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-grey-line px-5 py-3">
        <h1 className="text-xl font-semibold">
          {mode === "create" ? t("agent.newAgent") : t("agent.editAgent")}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Link href={backHref}>
            <Button variant="ghost" size="sm" type="button">
              {t("common.cancel")}
            </Button>
          </Link>
          <Button variant="primary" size="sm" type="submit" disabled={pending}>
            {t("common.save")}
          </Button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mx-5 mt-4 rounded-sm border border-alert/30 bg-alert-wash px-3 py-2 text-xs text-alert">
          {state.error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-16">
        <Section title={t("agent.sectionIdentity")}>
          <Field label={t("agent.code")} htmlFor="agentCode" required hint={t("agent.codeHint")} error={fe.agentCode}>
            <TextInput id="agentCode" name="agentCode" mono defaultValue={initial.agentCode} required />
          </Field>
          <Field label={t("agent.companyNameEn")} htmlFor="companyNameEn" required error={fe.companyNameEn}>
            <TextInput id="companyNameEn" name="companyNameEn" defaultValue={initial.companyNameEn} required />
          </Field>
          <Field label={t("agent.companyNameLocal")} htmlFor="companyNameLocal">
            <TextInput id="companyNameLocal" name="companyNameLocal" defaultValue={initial.companyNameLocal} />
          </Field>
          <Field label={t("agent.agentType")} htmlFor="agentType" required>
            <Select id="agentType" name="agentType" defaultValue={initial.agentType || "agent"}>
              {AGENT_TYPES.map((v) => (
                <option key={v} value={v}>{t(`enums.agentType.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("agent.status")} htmlFor="status" required>
            <Select id="status" name="status" defaultValue={initial.status || "prospective"}>
              {AGENT_STATUSES.map((v) => (
                <option key={v} value={v}>{t(`enums.agentStatus.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("agent.website")} htmlFor="website">
            <TextInput id="website" name="website" type="url" placeholder="https://" defaultValue={initial.website} />
          </Field>
        </Section>

        <Section title={t("agent.sectionTerritory")}>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label={t("agent.territoryCountries")}>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
                {COUNTRY_CODES.map((c) => (
                  <label key={c} className="flex items-center gap-1.5 rounded-sm border border-grey-line bg-surface px-2 py-1 text-xs">
                    <input
                      type="checkbox"
                      name="territories"
                      value={c}
                      defaultChecked={initial.territories.includes(c)}
                      className="accent-kmc"
                    />
                    <span className="mono">{c}</span>
                    <span className="truncate text-grey-mute">{t(`country.${c}`)}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
          <Field label={t("agent.exclusivity")} htmlFor="exclusivity">
            <Select id="exclusivity" name="exclusivity" defaultValue={initial.exclusivity}>
              <option value="">{t("common.notSet")}</option>
              {EXCLUSIVITY.map((v) => (
                <option key={v} value={v}>{t(`enums.exclusivity.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("agent.exclusiveProductFamilies")}>
              <div className="flex flex-wrap gap-1.5">
                {PRODUCT_FAMILIES.map((f) => (
                  <label key={f} className="flex items-center gap-1.5 rounded-sm border border-grey-line bg-surface px-2 py-1 text-xs">
                    <input
                      type="checkbox"
                      name="exclusiveProductFamilies"
                      value={f}
                      defaultChecked={initial.exclusiveProductFamilies.includes(f)}
                      className="accent-kmc"
                    />
                    {t(`enums.productFamily.${f}`)}
                  </label>
                ))}
              </div>
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label={t("agent.territoryNotes")} htmlFor="territoryNotes" hint={t("agent.territoryNotesHint")}>
              <TextInput id="territoryNotes" name="territoryNotes" defaultValue={initial.territoryNotes} />
            </Field>
          </div>
          <Field label={t("agent.commissionPercent")} htmlFor="commissionPercent">
            <TextInput id="commissionPercent" name="commissionPercent" type="number" step="0.1" mono defaultValue={initial.commissionPercent} />
          </Field>
          <Field label={t("agent.standardDiscountPercent")} htmlFor="standardDiscountPercent">
            <TextInput id="standardDiscountPercent" name="standardDiscountPercent" type="number" step="0.1" mono defaultValue={initial.standardDiscountPercent} />
          </Field>
          <Field label={t("agent.pricingBasis")} htmlFor="pricingBasis">
            <Select id="pricingBasis" name="pricingBasis" defaultValue={initial.pricingBasis}>
              <option value="">{t("common.notSet")}</option>
              {PRICING_BASIS.map((v) => (
                <option key={v} value={v}>{t(`enums.pricingBasis.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("agent.preferredCurrency")} htmlFor="preferredCurrency">
            <Select id="preferredCurrency" name="preferredCurrency" defaultValue={initial.preferredCurrency}>
              <option value="">{t("common.notSet")}</option>
              {CURRENCIES.map((v) => (
                <option key={v} value={v}>{t(`enums.currency.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("agent.paymentTerms")} htmlFor="paymentTerms">
            <TextInput id="paymentTerms" name="paymentTerms" defaultValue={initial.paymentTerms} />
          </Field>
          <Field label={t("agent.preferredIncoterms")} htmlFor="preferredIncoterms">
            <TextInput id="preferredIncoterms" name="preferredIncoterms" mono defaultValue={initial.preferredIncoterms} />
          </Field>
          <Field label={t("agent.agreementStart")} htmlFor="agreementStartDate">
            <TextInput id="agreementStartDate" name="agreementStartDate" type="date" mono defaultValue={initial.agreementStartDate} />
          </Field>
          <Field label={t("agent.agreementEnd")} htmlFor="agreementEndDate">
            <TextInput id="agreementEndDate" name="agreementEndDate" type="date" mono defaultValue={initial.agreementEndDate} />
          </Field>
        </Section>

        <Section title={t("agent.sectionRelationship")}>
          <Field label={t("agent.owner")} htmlFor="ownerUserId" required error={fe.ownerUserId}>
            <Select id="ownerUserId" name="ownerUserId" defaultValue={initial.ownerUserId} required>
              <option value="" disabled>
                {t("common.notSet")}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("agent.workingLanguage")} htmlFor="workingLanguage">
            <Select id="workingLanguage" name="workingLanguage" defaultValue={initial.workingLanguage}>
              <option value="">{t("common.notSet")}</option>
              {WORKING_LANGUAGES.map((v) => (
                <option key={v} value={v}>{t(`enums.workingLanguage.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("agent.cadenceDays")} htmlFor="contactCadenceDays" hint={`${t("settings.agentCadenceDefault")}: ${defaultCadence}`}>
            <TextInput id="contactCadenceDays" name="contactCadenceDays" type="number" mono defaultValue={initial.contactCadenceDays} placeholder={String(defaultCadence)} />
          </Field>
          <Field label={t("agent.firstAppointed")} htmlFor="firstAppointedDate">
            <TextInput id="firstAppointedDate" name="firstAppointedDate" type="date" mono defaultValue={initial.firstAppointedDate} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label={t("agent.notes")} htmlFor="notes">
              <TextArea id="notes" name="notes" defaultValue={initial.notes} />
            </Field>
          </div>
        </Section>
      </div>
    </form>
  );
}

