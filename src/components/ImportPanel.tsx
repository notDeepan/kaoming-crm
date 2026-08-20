"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, cx } from "@/components/ui";
import {
  getTemplate,
  previewImport,
  commitImport,
  type ImportEntity,
  type PreviewResult,
  type CommitDecision,
} from "@/app/actions/import";

function downloadBase64(base64: string, filename: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function ImportPanel({ entity, title, backHref }: { entity: ImportEntity; title: string; backHref: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [base64, setBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [decisions, setDecisions] = useState<Record<number, CommitDecision["action"]>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  async function onTemplate() {
    const { base64: b, filename } = await getTemplate(entity);
    downloadBase64(b, filename, XLSX_MIME);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const b = String(reader.result).split(",")[1] ?? "";
      setBase64(b);
      setBusy(true);
      try {
        const res = await previewImport(entity, b);
        setPreview(res);
        const seed: Record<number, CommitDecision["action"]> = {};
        for (const r of res.rows) seed[r.rowNo] = r.suggested;
        setDecisions(seed);
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function onCommit() {
    if (!base64 || !preview) return;
    setBusy(true);
    try {
      const payload: CommitDecision[] = preview.rows.map((r) => ({ rowNo: r.rowNo, action: decisions[r.rowNo] ?? r.suggested }));
      const res = await commitImport(entity, base64, payload);
      if (res.error) return;
      setResult({ imported: res.imported, skipped: res.skipped });
      setPreview(null);
      setBase64(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const commitCount = preview
    ? preview.rows.filter((r) => r.errors.length === 0 && (decisions[r.rowNo] ?? r.suggested) !== "skip").length
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <div className="mb-5 flex items-center gap-3">
        <Link href={backHref} className="text-xs text-grey-mute hover:text-ink mono">← {title}</Link>
        <h1 className="text-xl font-semibold">{t("excel.importTitle")}</h1>
        <div className="ml-auto">
          <Button variant="secondary" size="sm" onClick={onTemplate}>{t("excel.downloadTemplate")}</Button>
        </div>
      </div>

      {result && (
        <p role="status" className="mb-4 rounded-sm border border-kmc/30 bg-kmc-wash px-3 py-2 text-sm text-kmc-ink">
          {t("excel.committed", { count: result.imported, skipped: result.skipped })}
        </p>
      )}

      {/* Step 1 — choose file */}
      <div className="rounded-sm border border-grey-line bg-surface p-4">
        <div className="mb-1 label">{t("excel.step1")}</div>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={onFile}
          className="block w-full text-sm text-grey-mute file:mr-3 file:rounded-sm file:border file:border-grey-line file:bg-paper file:px-3 file:py-1.5 file:text-sm file:text-ink hover:file:bg-surface"
        />
        {fileName && <p className="mt-2 text-xs text-grey-mute mono">{fileName}</p>}
      </div>

      {busy && !preview && <p className="mt-4 text-sm text-grey-mute">{t("common.loading")}…</p>}

      {/* Preview + Step 2 */}
      {preview && (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <span className="text-sm text-ink">{t("excel.validRows", { count: preview.validCount })}</span>
            {preview.invalidCount > 0 && (
              <span className="text-sm text-alert">{t("excel.invalidRows", { count: preview.invalidCount })}</span>
            )}
            <div className="ml-auto">
              <Button variant="primary" size="sm" onClick={onCommit} disabled={busy || commitCount === 0}>
                {t("excel.commit", { count: commitCount })}
              </Button>
            </div>
          </div>

          {commitCount === 0 && preview.invalidCount > 0 && (
            <p className="mb-3 rounded-sm border border-alert/30 bg-alert-wash px-3 py-2 text-xs text-alert">
              {t("excel.nothingValid")}
            </p>
          )}

          <div className="overflow-x-auto rounded-sm border border-grey-line">
            <table className="w-full text-sm">
              <thead className="bg-paper">
                <tr className="border-b border-grey-line">
                  <th className="label px-3 py-2 text-left">{t("excel.row")}</th>
                  {preview.headers.map((h) => (
                    <th key={h} className="label px-3 py-2 text-left">{h}</th>
                  ))}
                  <th className="label px-3 py-2 text-left">{t("excel.problem")}</th>
                  <th className="label px-3 py-2 text-left">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNo} className={cx("border-b border-grey-line/60", r.errors.length > 0 && "bg-alert-wash/40")}>
                    <td className="px-3 py-1.5 mono text-grey-mute">{r.rowNo}</td>
                    {preview.headers.map((h) => (
                      <td key={h} className="max-w-[10rem] truncate px-3 py-1.5 mono text-ink">{r.cells[h] ?? ""}</td>
                    ))}
                    <td className="px-3 py-1.5 text-xs text-alert">
                      {r.errors.length ? r.errors.join("; ") : r.dupLabel ? t("excel.duplicate") : ""}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.errors.length ? (
                        <span className="text-2xs text-grey-mute mono">{t("excel.skip")}</span>
                      ) : (
                        <select
                          value={decisions[r.rowNo] ?? r.suggested}
                          onChange={(e) => setDecisions((d) => ({ ...d, [r.rowNo]: e.target.value as CommitDecision["action"] }))}
                          className="h-7 rounded-sm border border-grey-line bg-surface px-1.5 text-xs focus:border-kmc focus:outline-none"
                        >
                          {r.dupId ? (
                            <>
                              <option value="update">{t("excel.update")}</option>
                              <option value="skip">{t("excel.skip")}</option>
                            </>
                          ) : (
                            <>
                              <option value="create">{t("excel.createNew")}</option>
                              <option value="skip">{t("excel.skip")}</option>
                            </>
                          )}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
