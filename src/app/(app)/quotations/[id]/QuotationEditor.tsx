"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Field, TextInput, TextArea, Select, StatusPill, cx } from "@/components/ui";
import { saveQuotation, issueQuotation, reviseQuotation, refillSpecs } from "../actions";
import type { UnitSystem } from "@/lib/units";

interface OptionDef { id: string; optionCode: string; optionNameEn: string; category: string; mutexGroup: string | null; priceUsd: string | null; priceTwd: string | null }
interface LineState { id: string; kind: string; description: string; modelOptionId?: string; machineModelId?: string; quantity: number; unitPrice: number | null }
interface SpecLine { key: string; labelKey: string; text: string }

export interface EditorData {
  id: string;
  status: string;
  quoteNo: string;
  refNo: string | null;
  revision: number;
  currency: string;
  unitSystem: string;
  modelCode: string | null;
  customerName: string;
  header: Record<string, string>;
  specLines: SpecLine[];
  lines: LineState[];
  discountPercent: number | null;
  showDiscountOnPrint: boolean;
}

const SPEC_LABEL: Record<string, string> = {
  travel: "X/Y/Z-axis travel",
  distanceColumns: "Distance between two columns",
  spindleTaper: "Spindle taper",
  spindleNoseToTable: "Distance from spindle nose to table surface",
  spindleMotor: "Main spindle motor",
  spindleSpeed: "Spindle speed (V/H)",
  toolMagazine: "Tool magazine capacity",
  tableArea: "Table area",
  maxTableLoading: "Max. table loading",
  splashGuard: "Splash guard",
};

let tmp = 0;
const tmpId = () => `tmp-${++tmp}`;

export function QuotationEditor({ data, options }: { data: EditorData; options: OptionDef[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const readOnly = data.status !== "draft";

  const [header, setHeader] = useState(data.header);
  const [specLines, setSpecLines] = useState<SpecLine[]>(data.specLines);
  const [lines, setLines] = useState<LineState[]>(data.lines);
  const [discount, setDiscount] = useState<number | null>(data.discountPercent);
  const [showDiscount, setShowDiscount] = useState(data.showDiscountOnPrint);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(data.unitSystem as UnitSystem);
  const [saved, setSaved] = useState(false);

  const machineLine = lines.find((l) => l.kind === "machine");
  const optionLines = lines.filter((l) => l.kind !== "machine");
  const selectedOptionIds = new Set(optionLines.filter((l) => l.modelOptionId).map((l) => l.modelOptionId!));

  const totals = useMemo(() => {
    let subtotal = 0;
    let hasTbd = false;
    for (const l of lines) {
      if (l.unitPrice == null) { hasTbd = true; continue; }
      subtotal += l.unitPrice * l.quantity;
    }
    const disc = discount ? (subtotal * discount) / 100 : 0;
    return { subtotal, net: subtotal - disc, disc, hasTbd };
  }, [lines, discount]);

  const setH = (k: string, v: string) => setHeader((h) => ({ ...h, [k]: v }));
  const priceFor = (o: OptionDef) => {
    const p = data.currency === "TWD" ? o.priceTwd : o.priceUsd;
    return p == null ? null : Number(p);
  };

  function toggleOption(o: OptionDef, on: boolean) {
    setLines((prev) => {
      let next = prev.filter((l) => l.modelOptionId !== o.id);
      if (on) {
        // mutex: one option per group
        if (o.mutexGroup) {
          const groupIds = new Set(options.filter((x) => x.mutexGroup === o.mutexGroup).map((x) => x.id));
          next = next.filter((l) => !(l.modelOptionId && groupIds.has(l.modelOptionId)));
        }
        next.push({ id: tmpId(), kind: "option", modelOptionId: o.id, description: o.optionNameEn, quantity: 1, unitPrice: priceFor(o) });
      }
      return next;
    });
  }

  const setLine = (id: string, patch: Partial<LineState>) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addCustom = () => setLines((prev) => [...prev, { id: tmpId(), kind: "custom", description: "", quantity: 1, unitPrice: null }]);
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

  function doSave(after?: () => void) {
    start(async () => {
      const res = await saveQuotation(data.id, {
        header, specLines, discountPercent: discount, showDiscountOnPrint: showDiscount, unitSystem,
        lines: lines.map((l) => ({ kind: l.kind, description: l.description, modelOptionId: l.modelOptionId, machineModelId: l.machineModelId, quantity: l.quantity, unitPrice: l.unitPrice })),
      });
      if (res.ok) { setSaved(true); after?.(); router.refresh(); }
    });
  }

  function doIssue() {
    if (totals.hasTbd && !window.confirm(t("quotation.tbdConfirm"))) return;
    if (!window.confirm(t("quotation.issueConfirm"))) return;
    doSave(() => start(async () => { const r = await issueQuotation(data.id); if (r.ok) router.refresh(); }));
  }

  async function doRefill() {
    if (!window.confirm(t("quotation.refillConfirm"))) return;
    const fresh = await refillSpecs(data.id, unitSystem);
    setSpecLines(fresh);
  }

  const priceInput = (value: number | null, on: (v: number | null) => void, disabled: boolean, testid?: string) => (
    <input
      type="number" inputMode="decimal" disabled={disabled} value={value ?? ""}
      data-testid={testid}
      onChange={(e) => on(e.target.value === "" ? null : Number(e.target.value))}
      placeholder="TBD"
      className="h-8 w-28 rounded-sm border border-grey-line bg-surface px-2 text-right text-sm mono placeholder:text-alert focus:border-kmc focus:outline-none disabled:bg-paper"
    />
  );

  return (
    <div className="flex h-full flex-col">
      {/* header bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-grey-line px-5 py-3">
        <Link href="/quotations" className="text-xs text-grey-mute hover:text-ink mono">← {t("nav.quotations")}</Link>
        <h1 className="text-lg font-semibold mono">{data.refNo ?? data.quoteNo}</h1>
        <StatusPill tone={data.status === "issued" ? "active" : data.status === "draft" ? "warn" : "muted"}>
          {t(`enums.quotationStatus.${data.status}`)}{data.revision > 1 ? ` · R${data.revision}` : ""}
        </StatusPill>
        {totals.hasTbd && <StatusPill tone="warn">{t("quotation.incomplete")}</StatusPill>}
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/quotations/${data.id}/print`} target="_blank"><Button variant="secondary" size="sm">{t("quotation.print")}</Button></Link>
          {readOnly ? (
            <Button variant="primary" size="sm" disabled={pending} onClick={() => start(async () => { await reviseQuotation(data.id); })}>{t("quotation.revise")}</Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" disabled={pending} onClick={() => doSave()}>{saved ? t("common.saved") : t("common.save")}</Button>
              <Button variant="primary" size="sm" disabled={pending} onClick={doIssue}>{t("quotation.issue")}</Button>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-4xl">
          {readOnly && (
            <p className="mb-4 rounded-sm border border-grey-line bg-surface px-3 py-2 text-xs text-grey-mute">{t("quotation.readOnly")}</p>
          )}

          {/* header fields */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("quotation.machineType")}><TextInput value={header.machineType ?? ""} disabled={readOnly} onChange={(e) => setH("machineType", e.target.value)} /></Field>
            <Field label={t("quotation.quoteTo")}>
              <Select value={header.quoteTo ?? "end_customer"} disabled={readOnly} onChange={(e) => setH("quoteTo", e.target.value)}>
                <option value="end_customer">{t("enums.quoteTo.end_customer")}</option>
                <option value="agent">{t("enums.quoteTo.agent")}</option>
              </Select>
            </Field>
            <div className="sm:col-span-2"><Field label={t("quotation.configHeading")} hint={t("quotation.configHeadingHint")}><TextArea value={header.machineConfigHeading ?? ""} disabled={readOnly} onChange={(e) => setH("machineConfigHeading", e.target.value)} /></Field></div>
            <Field label={t("quotation.paymentTerms")}><TextArea value={header.paymentTerms ?? ""} disabled={readOnly} onChange={(e) => setH("paymentTerms", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("quotation.placeOfDelivery")}><TextInput value={header.placeOfDelivery ?? ""} disabled={readOnly} onChange={(e) => setH("placeOfDelivery", e.target.value)} /></Field>
              <Field label={t("quotation.timeOfDelivery")}><TextInput value={header.timeOfDelivery ?? ""} disabled={readOnly} onChange={(e) => setH("timeOfDelivery", e.target.value)} /></Field>
              <Field label={t("quotation.validity")}><TextInput value={header.validityText ?? ""} disabled={readOnly} onChange={(e) => setH("validityText", e.target.value)} /></Field>
              <Field label={t("quotation.unitSystem")}>
                <Select value={unitSystem} disabled={readOnly} onChange={(e) => setUnitSystem(e.target.value as UnitSystem)}>
                  <option value="metric">{t("quotation.metric")}</option>
                  <option value="imperial">{t("quotation.imperial")}</option>
                </Select>
              </Field>
            </div>
          </section>

          {/* machine + spec lines */}
          <section className="mt-6 rounded-sm border border-grey-line">
            <div className="flex items-center justify-between border-b border-grey-line bg-paper px-3 py-2">
              <span className="label">{t("quotation.machine")} · <span className="mono text-ink">{data.modelCode}</span></span>
              <div className="flex items-center gap-2">
                {!readOnly && <button onClick={doRefill} className="text-2xs text-kmc-ink hover:underline mono">{t("quotation.refillSpecs")}</button>}
                <span className="label">{t("quotation.basePrice")}</span>
                {machineLine && priceInput(machineLine.unitPrice, (v) => setLine(machineLine.id, { unitPrice: v }), readOnly, "base-price")}
              </div>
            </div>
            <div className="divide-y divide-grey-line/60 px-3 py-1">
              {specLines.map((s, i) => (
                <div key={s.key} className="flex items-center gap-3 py-1">
                  <span className="w-64 shrink-0 text-xs text-grey-mute">{SPEC_LABEL[s.key] ?? s.key}</span>
                  <input value={s.text} disabled={readOnly}
                    onChange={(e) => setSpecLines((prev) => prev.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                    className="h-7 flex-1 rounded-sm border border-transparent bg-transparent px-1 text-sm mono hover:border-grey-line focus:border-kmc focus:bg-surface focus:outline-none disabled:hover:border-transparent" />
                </div>
              ))}
              {specLines.length === 0 && <p className="py-2 text-xs text-grey-mute">{t("quotation.noSpecs")}</p>}
            </div>
          </section>

          {/* optional accessories */}
          <section className="mt-6">
            <h2 className="label mb-2">{t("quotation.optionalAccessories")}</h2>
            {!readOnly && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {options.length === 0 && <span className="text-xs text-grey-mute">{t("quotation.noOptions")}</span>}
                {options.map((o) => (
                  <label key={o.id} className={cx("flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs", selectedOptionIds.has(o.id) ? "border-kmc/40 bg-kmc-wash" : "border-grey-line bg-surface")}>
                    <input type="checkbox" checked={selectedOptionIds.has(o.id)} onChange={(e) => toggleOption(o, e.target.checked)} className="accent-kmc" />
                    {o.optionNameEn}
                  </label>
                ))}
              </div>
            )}
            <div className="rounded-sm border border-grey-line">
              {optionLines.length === 0 && <p className="px-3 py-2 text-xs text-grey-mute">—</p>}
              {optionLines.map((l) => (
                <div key={l.id} className="flex items-center gap-2 border-b border-grey-line/60 px-3 py-1.5 last:border-0">
                  <input value={l.description} disabled={readOnly || l.kind === "option"} onChange={(e) => setLine(l.id, { description: e.target.value })}
                    placeholder={t("quotation.customDesc")} className="h-8 flex-1 rounded-sm border border-transparent bg-transparent px-1 text-sm hover:border-grey-line focus:border-kmc focus:bg-surface focus:outline-none" />
                  {l.kind === "custom" && <StatusPill tone="warn">{t("quotation.review")}</StatusPill>}
                  <input type="number" value={l.quantity} min={1} disabled={readOnly} onChange={(e) => setLine(l.id, { quantity: Number(e.target.value) || 1 })} className="h-8 w-14 rounded-sm border border-grey-line bg-surface px-1 text-right text-sm mono focus:border-kmc focus:outline-none" />
                  {priceInput(l.unitPrice, (v) => setLine(l.id, { unitPrice: v }), readOnly, "line-price")}
                  {!readOnly && <button onClick={() => removeLine(l.id)} className="px-1 text-grey-mute hover:text-alert" aria-label={t("common.delete")}>×</button>}
                </div>
              ))}
            </div>
            {!readOnly && <button onClick={addCustom} className="mt-2 text-xs text-kmc-ink hover:underline">+ {t("quotation.addCustom")}</button>}
          </section>

          {/* totals + discount */}
          <section className="mt-6 flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-3 text-sm">
              <span className="label">{t("quotation.discount")}</span>
              <input type="number" value={discount ?? ""} disabled={readOnly} onChange={(e) => setDiscount(e.target.value === "" ? null : Number(e.target.value))} placeholder="0" className="h-8 w-16 rounded-sm border border-grey-line bg-surface px-1 text-right text-sm mono focus:border-kmc focus:outline-none" />
              <span className="text-grey-mute">%</span>
              <label className="flex items-center gap-1.5 text-xs text-grey-mute">
                <input type="checkbox" checked={showDiscount} disabled={readOnly} onChange={(e) => setShowDiscount(e.target.checked)} className="accent-kmc" />
                {t("quotation.showDiscount")}
              </label>
            </div>
            <div className="flex items-baseline gap-3 border-t border-ink pt-1.5">
              <span className="font-semibold">{t("quotation.totalNet")}</span>
              <span className="text-lg font-semibold mono tabular-nums">
                {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(totals.net)} {data.currency}
              </span>
            </div>
            {totals.hasTbd && <span className="text-2xs text-alert">{t("quotation.tbdNote")}</span>}
          </section>

          {/* standard accessories */}
          <section className="mt-6">
            <Field label={t("quotation.standardAccessories")} hint={t("quotation.standardAccessoriesHint")}>
              <TextArea value={header.standardAccessoriesText ?? ""} disabled={readOnly} onChange={(e) => setH("standardAccessoriesText", e.target.value)} className="min-h-[120px]" />
            </Field>
          </section>
        </div>
      </div>
    </div>
  );
}
