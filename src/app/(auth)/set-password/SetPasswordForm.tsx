"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { setPassword, type SetPasswordState } from "./actions";
import { Button, Field, TextInput } from "@/components/ui";

export function SetPasswordForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setPassword, {});

  const err =
    state.error === "tooShort"
      ? t("passwordTooShort")
      : state.error === "mismatch"
        ? t("passwordMismatch")
        : null;

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-5">
      <h1 className="text-xl font-semibold">{t("mustChange")}</h1>
      <Field label={t("newPassword")} htmlFor="password" required hint={t("passwordTooShort")}>
        <TextInput id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label={t("confirmPassword")} htmlFor="confirm" required error={err ?? undefined}>
        <TextInput id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {t("signInAction")}
      </Button>
    </form>
  );
}
