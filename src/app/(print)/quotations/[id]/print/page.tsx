import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getQuotation, computeTotals } from "@/server/quotations";
import { getSetting } from "@/server/settings";
import { prisma } from "@/lib/prisma";
import { fmtDate } from "@/lib/format";
import { PrintToolbar } from "./PrintToolbar";

// Exact fixed strings from the live template (docs/reference/Quote_example.xls). Every one is
// overridable in system settings (Q-01); these are the fallbacks.
const OPENING = "As your request , we will be pleased to offer our following quotation for your reference";
const REMARKS = [
  "The price is Net price and without installation and adjusting charge",
  "User site requires necessary suitable equipments instrument for installation",
  "Machine dismounted during transporation(it depends packing size to adjust)",
  "Please refer to our brochure for all the specification and stanard accessories.",
];
const END_RULE = "---------------------------------END---------------------------------";
const COMPANY = "KAO MING MACHINERY INDUSTRIAL CO.,LTD.";

// The ten printed spec-line labels, verbatim from the template. splashGuard prints as text only.
const SPEC_LABEL: Record<string, string | null> = {
  travel: "X/Y/Z-axis travel",
  distanceColumns: "Distance between two columns",
  spindleTaper: "Spindle taper",
  spindleNoseToTable: "Distance from spindle nose to table surface",
  spindleMotor: "Main spindle motor",
  spindleSpeed: "Spindle speed (V/H)",
  toolMagazine: "Tool magazine capacity",
  tableArea: "Table area",
  maxTableLoading: "Max. table loading",
  splashGuard: null,
};

function money(v: number | null | undefined, currency: string): string {
  if (v == null) return "TBD";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v) + ` ${currency}`;
}

type SpecLine = { key: string; labelKey: string; text: string };

export default async function QuotationPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const q = await getQuotation(id);
  if (!q) notFound();

  const preparer = await prisma.user.findUnique({ where: { id: q.preparedById }, select: { fullName: true, jobTitle: true } });

  const [opening, r1, r2, r3, r4, sectionManagerDefault] = await Promise.all([
    getSetting<string>("quote_opening_line", OPENING),
    getSetting<string>("quote_remark_1", REMARKS[0]!),
    getSetting<string>("quote_remark_2", REMARKS[1]!),
    getSetting<string>("quote_remark_3", REMARKS[2]!),
    getSetting<string>("quote_remark_4", REMARKS[3]!),
    getSetting<string>("default_section_manager", ""),
  ]);
  const remarks = [r1, r2, r3, r4];

  const currencyTag = q.currency === "TWD" ? "NT$" : "US$";
  const specLines = (q.specLinesJson as SpecLine[] | null) ?? [];
  const machineLine = q.lines.find((l) => l.lineKind === "machine");
  const optionLines = q.lines.filter((l) => l.lineKind !== "machine");
  const totals = computeTotals(q.lines, q.discountPercent ? Number(q.discountPercent) : null, q.currency);

  const recipientName =
    q.quoteTo === "agent" && q.agent ? q.agent.companyNameEn : q.customer.companyNameEn;
  const ref = q.refNo ?? q.quoteNo;
  const date = q.issueDate ? fmtDate(q.issueDate, "en") : fmtDate(new Date(), "en");
  const paymentLines = (q.paymentTerms ?? "").split("\n").filter(Boolean);

  return (
    <>
      <PrintToolbar backHref={`/quotations/${id}`} draft={q.status === "draft"} />
      <div className="mx-auto my-6 w-[210mm] bg-white px-[16mm] py-[14mm] text-[10.5px] leading-[1.5] text-black shadow-lg print:my-0 print:shadow-none" style={{ fontFamily: "var(--font-plex-sans)" }}>
        {/* incomplete-total warning is internal only; never part of the customer document */}
        <h1 className="mb-3 text-center text-[15px] font-semibold tracking-wide">QUOTATION</h1>

        <div className="flex justify-between">
          <div><span className="font-medium">REF:</span> <span style={{ fontFamily: "var(--font-plex-mono)" }}>{ref}</span></div>
          <div><span className="font-medium">Date:</span> <span style={{ fontFamily: "var(--font-plex-mono)" }}>{date}</span></div>
        </div>
        <div className="mt-1"><span className="font-medium">To:</span> {recipientName}</div>

        <p className="mt-2">{opening}</p>

        <table className="mt-2 w-full">
          <tbody className="align-top">
            <Row label="Machine Type :" value={q.machineType ?? ""} />
            <Row label="Terms of Payment :" value={paymentLines[0] ?? ""} />
            {paymentLines.slice(1).map((l, i) => <Row key={i} label="" value={l} />)}
            <Row label="Place of Delivery:" value={q.placeOfDelivery ?? "FOB TAIWAN"} />
            <Row label="Time of Delivery:" value={q.timeOfDelivery ?? ""} />
            <Row label="Validity time:" value={q.validityText ?? "3 months"} />
          </tbody>
        </table>

        {/* machine heading + right-hand price column header */}
        <div className="mt-3 flex justify-between border-t border-black pt-2">
          <div className="pr-4">
            {(q.machineConfigHeading ?? "").split("\n").filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}
          </div>
          <div className="whitespace-nowrap font-medium">Unit Price {currencyTag}</div>
        </div>

        {/* model + base price */}
        <div className="mt-1 flex justify-between">
          <div className="font-medium">Model: <span style={{ fontFamily: "var(--font-plex-mono)" }}>{q.machineModel?.modelCode ?? ""}</span></div>
          <div style={{ fontFamily: "var(--font-plex-mono)" }}>{money(machineLine?.unitPrice == null ? null : Number(machineLine.unitPrice), q.currency)}</div>
        </div>

        {/* the ten spec lines — only these print (Q-02A) */}
        <div className="mt-0.5">
          {specLines.map((s) => {
            const label = SPEC_LABEL[s.key];
            return (
              <div key={s.key}>
                {label ? <><span>{label}:</span> {s.text}</> : s.text}
              </div>
            );
          })}
        </div>

        {/* optional accessories */}
        <div className="mt-3 font-medium">Optional Accessories</div>
        {optionLines.length === 0 && <div className="text-black/50">—</div>}
        {optionLines.map((l) => (
          <div key={l.id} className="flex justify-between">
            <div className="pr-4">{l.descriptionEn}{Number(l.quantity) !== 1 ? ` × ${Number(l.quantity)}` : ""}</div>
            <div style={{ fontFamily: "var(--font-plex-mono)" }}>{money(l.unitPrice == null ? null : Number(l.unitPrice) * Number(l.quantity), q.currency)}</div>
          </div>
        ))}

        {/* discount (A8) prints only when the toggle is on */}
        {q.showDiscountOnPrint && totals.discountAmount > 0 && (
          <div className="mt-1 flex justify-between">
            <div>Discount ({Number(q.discountPercent)}%)</div>
            <div style={{ fontFamily: "var(--font-plex-mono)" }}>-{money(totals.discountAmount, q.currency)}</div>
          </div>
        )}

        {/* total */}
        <div className="mt-2 flex justify-between border-t border-black pt-1 font-semibold">
          <div>TOTAL PRICE FOB TAIWAN (NET)</div>
          <div style={{ fontFamily: "var(--font-plex-mono)" }}>{money(totals.net, q.currency)}</div>
        </div>

        {/* standard accessories — descriptive text, unpriced (Q-06) */}
        <div className="mt-3 font-medium">Standard Accessories</div>
        <div className="whitespace-pre-wrap">{q.standardAccessoriesText ?? ""}</div>

        {/* remarks */}
        <div className="mt-3">
          {remarks.map((r, i) => (
            <div key={i}>Remark: {i + 1}.{r}</div>
          ))}
        </div>

        <div className="my-2 text-center tracking-tight">{END_RULE}</div>

        <div className="mt-3">
          <div className="font-medium">{COMPANY}</div>
          <div className="mt-3">{q.sectionManagerName || sectionManagerDefault} <span className="text-black/60">(Section Manager)</span></div>
          <div>{preparer?.fullName ?? ""} <span className="text-black/60">({preparer?.jobTitle ?? "Overseas Sales"})</span></div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-[46%] pr-2 font-medium">{label}</td>
      <td>{value}</td>
    </tr>
  );
}
