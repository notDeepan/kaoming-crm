import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getQuotation } from "@/server/quotations";
import { availableOptions } from "@/server/catalogue";
import { QuotationEditor, type EditorData } from "./QuotationEditor";

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const q = await getQuotation(id);
  if (!q) notFound();

  const options = q.machineModelId ? await availableOptions(q.machineModelId) : [];

  const data: EditorData = {
    id: q.id,
    status: q.status,
    quoteNo: q.quoteNo,
    refNo: q.refNo,
    revision: q.revision,
    currency: q.currency,
    unitSystem: q.unitSystem,
    modelCode: q.machineModel?.modelCode ?? null,
    customerName: q.customer.companyNameEn,
    header: {
      machineType: q.machineType ?? "",
      machineConfigHeading: q.machineConfigHeading ?? "",
      paymentTerms: q.paymentTerms ?? "",
      placeOfDelivery: q.placeOfDelivery ?? "",
      timeOfDelivery: q.timeOfDelivery ?? "",
      validityText: q.validityText ?? "",
      sectionManagerName: q.sectionManagerName ?? "",
      standardAccessoriesText: q.standardAccessoriesText ?? "",
      quoteTo: q.quoteTo,
      notesToCustomer: q.notesToCustomer ?? "",
    },
    specLines: (q.specLinesJson as unknown as EditorData["specLines"]) ?? [],
    lines: q.lines.map((l) => ({
      id: l.id,
      kind: l.lineKind,
      description: l.descriptionEn,
      modelOptionId: l.modelOptionId ?? undefined,
      machineModelId: l.machineModelId ?? undefined,
      quantity: Number(l.quantity),
      unitPrice: l.unitPrice == null ? null : Number(l.unitPrice),
    })),
    discountPercent: q.discountPercent == null ? null : Number(q.discountPercent),
    showDiscountOnPrint: q.showDiscountOnPrint,
  };

  const opts = options.map((o) => ({
    id: o.id, optionCode: o.optionCode, optionNameEn: o.optionNameEn, category: o.category,
    mutexGroup: o.mutexGroup, priceUsd: o.priceUsd?.toString() ?? null, priceTwd: o.priceTwd?.toString() ?? null,
  }));

  return <QuotationEditor data={data} options={opts} />;
}
