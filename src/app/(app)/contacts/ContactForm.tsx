"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Field, TextInput, TextArea, Select, cx } from "@/components/ui";
import { CONTACT_PARENTS, ROLES_IN_DEAL, LANGUAGES } from "@/lib/enums";
import type { ContactFormState } from "./actions";
import type { ContactInitial } from "./empty";

export function ContactForm({
  mode,
  action,
  initial,
  agents,
  customers,
}: {
  mode: "create" | "edit";
  action: (prev: ContactFormState, fd: FormData) => Promise<ContactFormState>;
  initial: ContactInitial;
  agents: Array<{ id: string; label: string }>;
  customers: Array<{ id: string; label: string }>;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};
  const [parentType, setParentType] = useState(initial.parentType || "customer");
  const backHref = initial.id ? `/contacts/${initial.id}` : "/contacts";

  return (
    <form action={formAction} className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-grey-line px-5 py-3">
        <h1 className="text-xl font-semibold">
          {mode === "create" ? t("contact.newContact") : t("contact.editContact")}
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

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* parent picker */}
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label={t("contact.parentType")} required error={fe.parentId}>
              <div className="flex gap-2">
                <div className="inline-flex rounded-sm border border-grey-line" role="group">
                  {CONTACT_PARENTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setParentType(p)}
                      aria-pressed={parentType === p}
                      className={cx(
                        "h-9 px-3 text-sm",
                        parentType === p ? "bg-ink text-paper" : "text-grey-mute hover:text-ink"
                      )}
                    >
                      {t(`enums.contactParent.${p}`)}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="parentType" value={parentType} />
                {parentType === "agent" ? (
                  <Select name="agentId" defaultValue={initial.agentId} className="flex-1">
                    <option value="">{t("common.notSet")}</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </Select>
                ) : (
                  <Select name="customerId" defaultValue={initial.customerId} className="flex-1">
                    <option value="">{t("common.notSet")}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </Select>
                )}
              </div>
            </Field>
          </div>

          <Field label={t("contact.fullName")} htmlFor="fullName" required error={fe.fullName}>
            <TextInput id="fullName" name="fullName" defaultValue={initial.fullName} required />
          </Field>
          <Field label={t("contact.nameLocal")} htmlFor="nameLocal">
            <TextInput id="nameLocal" name="nameLocal" defaultValue={initial.nameLocal} />
          </Field>
          <Field label={t("contact.jobTitle")} htmlFor="jobTitle">
            <TextInput id="jobTitle" name="jobTitle" defaultValue={initial.jobTitle} />
          </Field>
          <Field label={t("contact.roleInDeal")} htmlFor="roleInDeal">
            <Select id="roleInDeal" name="roleInDeal" defaultValue={initial.roleInDeal}>
              <option value="">{t("common.notSet")}</option>
              {ROLES_IN_DEAL.map((v) => (
                <option key={v} value={v}>{t(`enums.roleInDeal.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("contact.email")} htmlFor="email" hint={t("contact.contactMethodHint")}>
            <TextInput id="email" name="email" type="email" mono defaultValue={initial.email} />
          </Field>
          <Field label={t("contact.phone")} htmlFor="phone">
            <TextInput id="phone" name="phone" mono defaultValue={initial.phone} />
          </Field>
          <Field label={t("contact.mobile")} htmlFor="mobile">
            <TextInput id="mobile" name="mobile" mono defaultValue={initial.mobile} />
          </Field>
          <Field label={t("contact.messagingHandle")} htmlFor="messagingHandle" hint={t("contact.messagingHint")}>
            <TextInput id="messagingHandle" name="messagingHandle" mono defaultValue={initial.messagingHandle} />
          </Field>
          <Field label={t("contact.preferredLanguage")} htmlFor="preferredLanguage">
            <Select id="preferredLanguage" name="preferredLanguage" defaultValue={initial.preferredLanguage}>
              <option value="">{t("common.notSet")}</option>
              {LANGUAGES.map((v) => (
                <option key={v} value={v}>{t(`enums.language.${v}`)}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="isPrimary" defaultChecked={initial.isPrimary} className="accent-kmc" />
              {t("contact.isPrimary")}
            </label>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label={t("contact.notes")} htmlFor="notes">
              <TextArea id="notes" name="notes" defaultValue={initial.notes} />
            </Field>
          </div>
        </div>
      </div>
    </form>
  );
}

