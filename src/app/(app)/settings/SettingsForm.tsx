"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, TextInput, Select } from "@/components/ui";
import { CURRENCIES } from "@/lib/enums";
import { updateSettings, type SettingsState } from "./actions";

export function SettingsForm({ values }: { values: Record<string, unknown> }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateSettings, {});
  const v = (k: string) => (values[k] == null ? "" : String(values[k]));

  return (
    <form action={action} className="mx-auto max-w-3xl px-5 py-6">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
        <div className="ml-auto">
          <Button variant="primary" size="sm" type="submit" disabled={pending}>{t("common.saveChanges")}</Button>
        </div>
      </div>
      <p className="mb-5 text-sm text-grey-mute">{t("settings.sub")}</p>

      {state.saved && (
        <p role="status" className="mb-4 rounded-sm border border-kmc/30 bg-kmc-wash px-3 py-2 text-xs text-kmc-ink">
          {t("settings.saved")}
        </p>
      )}
      {state.error && (
        <p role="alert" className="mb-4 rounded-sm border border-alert/30 bg-alert-wash px-3 py-2 text-xs text-alert">
          {state.error}
        </p>
      )}

      <section className="border-t border-grey-line py-5">
        <h2 className="label mb-3">{t("settings.commercial")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("settings.defaultIncoterms")} htmlFor="default_incoterms">
            <TextInput id="default_incoterms" name="default_incoterms" mono defaultValue={v("default_incoterms")} />
          </Field>
          <Field label={t("settings.defaultNamedPlace")} htmlFor="default_named_place">
            <TextInput id="default_named_place" name="default_named_place" defaultValue={v("default_named_place")} />
          </Field>
          <Field label={t("settings.defaultPaymentTerms")} htmlFor="default_payment_terms">
            <TextInput id="default_payment_terms" name="default_payment_terms" defaultValue={v("default_payment_terms")} />
          </Field>
          <Field label={t("settings.defaultValidityDays")} htmlFor="default_validity_days">
            <TextInput id="default_validity_days" name="default_validity_days" type="number" mono defaultValue={v("default_validity_days")} />
          </Field>
          <Field label={t("settings.defaultCurrency")} htmlFor="default_currency">
            <Select id="default_currency" name="default_currency" defaultValue={v("default_currency") || "USD"}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{t(`enums.currency.${c}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("settings.quoteNumberFormat")} htmlFor="quote_number_format">
            <TextInput id="quote_number_format" name="quote_number_format" mono defaultValue={v("quote_number_format")} />
          </Field>
          <Field label={t("settings.defaultWarrantyMonths")} htmlFor="default_warranty_months">
            <TextInput id="default_warranty_months" name="default_warranty_months" type="number" mono defaultValue={v("default_warranty_months")} />
          </Field>
          <Field label={t("settings.warrantyBasis")} htmlFor="warranty_basis">
            <Select id="warranty_basis" name="warranty_basis" defaultValue={v("warranty_basis") || "shipment"}>
              <option value="shipment">{t("settings.warrantyFromShipment")}</option>
              <option value="installation">{t("settings.warrantyFromInstallation")}</option>
            </Select>
          </Field>
        </div>
      </section>

      <section className="border-t border-grey-line py-5">
        <h2 className="label mb-3">{t("settings.reminders")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("settings.agentCadenceDefault")} htmlFor="agent_cadence_default_days">
            <TextInput id="agent_cadence_default_days" name="agent_cadence_default_days" type="number" mono defaultValue={v("agent_cadence_default_days")} />
          </Field>
          <Field label={t("settings.opportunityInactivityDays")} htmlFor="opportunity_inactivity_days">
            <TextInput id="opportunity_inactivity_days" name="opportunity_inactivity_days" type="number" mono defaultValue={v("opportunity_inactivity_days")} />
          </Field>
        </div>
      </section>
    </form>
  );
}
