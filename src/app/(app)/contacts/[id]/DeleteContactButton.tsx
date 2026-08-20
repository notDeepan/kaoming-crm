"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { deleteContact } from "../actions";

export function DeleteContactButton({ id, name }: { id: string; name: string }) {
  const t = useTranslations();
  return (
    <form
      action={deleteContact.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm(`${t("common.delete")}: ${name}?`)) e.preventDefault();
      }}
    >
      <Button variant="danger" size="sm" type="submit">{t("common.delete")}</Button>
    </form>
  );
}
