"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signIn, type LoginState } from "./actions";
import { Button, Field, TextInput } from "@/components/ui";

export function LoginForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  const message =
    state.error === "locked"
      ? t("locked", { minutes: state.lockMinutes ?? 15 })
      : state.error === "disabled"
        ? t("disabled")
        : state.error === "wrongCredentials"
          ? t("wrongCredentials")
          : null;

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-ink">{t("heading")}</h1>
        <p className="text-sm text-grey-mute">{t("sub")}</p>
      </div>

      <Field label={t("username")} htmlFor="username" required>
        <TextInput id="username" name="username" autoComplete="username" autoFocus mono required />
      </Field>

      <Field label={t("password")} htmlFor="password" required>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {message && (
        <p role="alert" className="rounded-sm border border-alert/30 bg-alert-wash px-3 py-2 text-xs text-alert">
          {message}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {t("signInAction")}
      </Button>
    </form>
  );
}
