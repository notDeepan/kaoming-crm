import { test, expect } from "@playwright/test";
import * as XLSX from "xlsx";
import { signIn } from "./helpers";

// Phase 1 slice of the spec §32 acceptance criteria. Criteria that depend on later phases
// (quotation revisioning, catalogue immutability, installed-machine creation, document access)
// are covered by their own suites when those phases are built — see the skipped test at the end.

test("1 — a user signs in and sees permitted functions", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();
  // Admin sees the Administration section.
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
});

test("2 — switching language changes every visible string", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();
  await page.getByRole("button", { name: "繁中" }).click();
  await expect(page.getByRole("heading", { name: "代理商" })).toBeVisible();
  await expect(page.getByRole("link", { name: "客戶" })).toBeVisible();
  await expect(page.getByRole("link", { name: "系統設定" })).toBeVisible();
});

test("3 — an agent past its contact cadence is flagged overdue", async ({ page }) => {
  await signIn(page);
  // TR-01 was seeded with a 30-day cadence and last contact 41 days ago.
  await page.getByText("Anadolu Takım Tezgâhları A.Ş.").click();
  await expect(page.getByText("Agent overdue for contact")).toBeVisible();
});

test("10 — a filtered list exports to Excel with the visible columns", async ({ page }) => {
  await signIn(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export to Excel" }).click(),
  ]);
  const path = await download.path();
  const wb = XLSX.readFile(path!);
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json(ws);
  // 8 seeded agents exported.
  expect(rows.length).toBe(8);
  expect(Object.keys(rows[0] as object)).toContain("Agent code");
});

test("11 — Excel import previews invalid rows and commits the valid ones", async ({ page }) => {
  await signIn(page);

  // Build a workbook: 1 valid new agent + 2 deliberately invalid rows.
  const aoa = [
    ["agent_code", "company_name_en", "agent_type", "status", "territory_countries"],
    ["ZZ-99", "Valid Import Co.", "agent", "active", "IT"],
    ["", "Missing Code Co.", "agent", "active", "ES"], // invalid: no agent_code
    ["XX-01", "Bad Enum Co.", "not_a_type", "active", "ZZ"], // invalid: bad type + bad country
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "agent");
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  await page.goto("/agents/import");
  await page.setInputFiles('input[type="file"]', {
    name: "agents.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: buf,
  });

  // Both invalid rows are reported with reasons.
  await expect(page.getByText("2 rows with problems")).toBeVisible();
  await expect(page.getByText("agent_code is required")).toBeVisible();

  // Commit the single valid row.
  await page.getByRole("button", { name: /Import 1 row/ }).click();
  await expect(page.getByText(/Imported 1 row/)).toBeVisible();

  // The valid agent now exists.
  await page.goto("/agents");
  await expect(page.getByText("Valid Import Co.")).toBeVisible();
});

// Phase 3 — document access control (spec §32 test 9), including the direct-URL attempt.
// The secure streaming route and grant model are built in Phase 3; this placeholder marks where
// that real test lives so it is not forgotten.
test.skip("9 — a confidential document is unreachable without a grant, even by direct URL", async () => {
  // build in Phase 3: upload Confidential doc, assert 403 for ungranted user via UI and direct URL,
  // grant access, assert 200 + download recorded in the document audit trail.
});
