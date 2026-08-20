"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Field, TextInput, Select } from "@/components/ui";
import { ROLES, LANGUAGES, USER_STATUSES } from "@/lib/enums";
import type { UserFormState } from "./actions";
import type { UserInitial } from "./empty";

export function UserForm({
  mode,
  action,
  initial,
}: {
  mode: "create" | "edit";
  action: (prev: UserFormState, fd: FormData) => Promise<UserFormState>;
  initial: UserInitial;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mx-auto max-w-2xl px-5 py-6">
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-xl font-semibold">
          {mode === "create" ? t("user.newUser") : t("user.editUser")}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/users">
            <Button variant="ghost" size="sm" type="button">{t("common.cancel")}</Button>
          </Link>
          <Button variant="primary" size="sm" type="submit" disabled={pending}>{t("common.save")}</Button>
        </div>
      </div>

      {mode === "create" && (
        <p className="mb-4 rounded-sm border border-grey-line bg-surface px-3 py-2 text-xs text-grey-mute">
          {t("user.adminOnly")}
        </p>
      )}
      {state.error && (
        <p role="alert" className="mb-4 rounded-sm border border-alert/30 bg-alert-wash px-3 py-2 text-xs text-alert">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("user.username")} htmlFor="username" required error={fe.username}>
          <TextInput id="username" name="username" mono defaultValue={initial.username} required disabled={mode === "edit"} />
        </Field>
        <Field label={t("user.email")} htmlFor="email" required error={fe.email}>
          <TextInput id="email" name="email" type="email" mono defaultValue={initial.email} required />
        </Field>
        <Field label={t("user.fullName")} htmlFor="fullName" required error={fe.fullName}>
          <TextInput id="fullName" name="fullName" defaultValue={initial.fullName} required />
        </Field>
        <Field label={t("user.fullNameZh")} htmlFor="fullNameZh">
          <TextInput id="fullNameZh" name="fullNameZh" defaultValue={initial.fullNameZh} />
        </Field>
        <Field label={t("user.role")} htmlFor="role" required>
          <Select id="role" name="role" defaultValue={initial.role || "sales"}>
            {ROLES.map((v) => (
              <option key={v} value={v}>{t(`enums.role.${v}`)}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("user.language")} htmlFor="languagePreference" required>
          <Select id="languagePreference" name="languagePreference" defaultValue={initial.languagePreference || "en"}>
            {LANGUAGES.map((v) => (
              <option key={v} value={v}>{t(`enums.language.${v}`)}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("user.jobTitle")} htmlFor="jobTitle">
          <TextInput id="jobTitle" name="jobTitle" defaultValue={initial.jobTitle} />
        </Field>
        <Field label={t("user.phone")} htmlFor="phone">
          <TextInput id="phone" name="phone" mono defaultValue={initial.phone} />
        </Field>

        {mode === "create" ? (
          <Field label={t("user.tempPassword")} htmlFor="tempPassword" required hint={t("user.tempPasswordHint")} error={fe.tempPassword}>
            <TextInput id="tempPassword" name="tempPassword" type="text" mono required minLength={10} />
          </Field>
        ) : (
          <Field label={t("user.status")} htmlFor="status" required>
            <Select id="status" name="status" defaultValue={initial.status || "active"}>
              {USER_STATUSES.map((v) => (
                <option key={v} value={v}>{t(`enums.userStatus.${v}`)}</option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </form>
  );
}

