import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listQuotations } from "@/server/quotations";
import { getLocale } from "@/i18n/locale";
import { fmtDate } from "@/lib/format";
import { Button, StatusPill } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

export default async function QuotationsPage() {
  const user = await requireUser();
  const t = await getTranslations();
  const locale = await getLocale();
  const rows = await listQuotations();
  const canCreate = can(user.role, "c", "quotation");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-grey-line px-5 py-3">
        <h1 className="text-xl font-semibold">{t("nav.quotations")}</h1>
        <span className="text-2xs text-grey-mute mono">{rows.length}</span>
        {canCreate && (
          <div className="ml-auto">
            <Link href="/quotations/new"><Button variant="primary" size="sm">{t("quotation.newQuotation")}</Button></Link>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="p-10"><EmptyState title={t("quotation.emptyTitle")} hint={t("quotation.emptyHint")} actionHref={canCreate ? "/quotations/new" : undefined} actionLabel={t("quotation.newQuotation")} /></div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-paper">
              <tr className="border-b border-grey-line">
                {["ref", "customer", "machine", "status", "issued"].map((k) => <th key={k} className="label px-4 py-2 text-left">{t(`quotation.col.${k}`)}</th>)}
                <th className="label px-4 py-2 text-right">{t("quotation.col.total")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="h-row cursor-pointer border-b border-grey-line/60 hover:bg-kmc-wash/40" onClick={undefined}>
                  <td className="px-4 py-1.5 mono"><Link href={`/quotations/${q.id}`} className="font-medium text-ink hover:text-kmc-ink">{q.refNo ?? q.quoteNo}</Link>{q.revision > 1 ? <span className="ml-1 text-2xs text-grey-mute">R{q.revision}</span> : null}</td>
                  <td className="px-4 py-1.5">{q.customer.companyNameEn}</td>
                  <td className="px-4 py-1.5 mono text-grey-mute">{q.machineModel?.modelCode ?? "—"}</td>
                  <td className="px-4 py-1.5"><StatusPill tone={q.status === "issued" ? "active" : q.status === "draft" ? "warn" : "muted"}>{t(`enums.quotationStatus.${q.status}`)}</StatusPill></td>
                  <td className="px-4 py-1.5 mono text-grey-mute">{q.issueDate ? fmtDate(q.issueDate, locale) : "—"}</td>
                  <td className="px-4 py-1.5 text-right mono">{q.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
