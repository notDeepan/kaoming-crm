"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { deleteCustomer } from "../actions";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
  const t = useTranslations();
  return (
    <form
      action={deleteCustomer.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm(`${t("common.delete")}: ${name}?`)) e.preventDefault();
      }}
    >
      <Button variant="danger" size="sm" type="submit">{t("common.delete")}</Button>
    </form>
  );
}
