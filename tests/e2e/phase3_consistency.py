"""Issued generated proposal and frozen factory sheet share resolved quote values."""

import json
import os
import subprocess
import unicodedata
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright
from pypdf import PdfReader
from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Consistency check requires a disposable _e2e database")
base = env["AUTH_URL"].rstrip("/")
psql = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"


def query(command: str) -> str:
    result = subprocess.run([str(psql), "-d", env["DATABASE_URL"], "-At", "-c", command],
                            capture_output=True, text=True, encoding="utf-8",
                            env={**os.environ, "PGCLIENTENCODING": "UTF8"})
    if result.returncode:
        raise RuntimeError("Disposable consistency database query failed")
    return result.stdout.strip()


def compact(value: str) -> str:
    return "".join(unicodedata.normalize("NFKC", value).split())


deal_number = query("SELECT d.deal_number FROM deals d JOIN quotations q ON q.deal_id=d.id "
                    "WHERE q.revision=3 AND q.status='issued' AND d.deal_number<>'Q-2026-0147' "
                    "ORDER BY d.deal_number DESC LIMIT 1")
assert deal_number, "Run phase2.py before this consistency check"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    try:
        page.goto(base + "/login")
        page.get_by_label("Email").fill(env["SEED_ADMIN_EMAIL"])
        page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url(base + "/")
        page.goto(base + "/deals")
        page.get_by_role("link", name=deal_number).click()
        expect(page.get_by_role("link", name="PI 訂單")).to_be_visible(timeout=15000)
        deal_url = page.url
        proposal_href = page.get_by_role("link", name="PDF attached").get_attribute("href")
        proposal = PdfReader(BytesIO(page.context.request.get(base + proposal_href).body()))
        assert len(proposal.pages) >= 3
        proposal_specs = compact(proposal.pages[1].extract_text() or "")

        page.get_by_role("link", name="Configuration").click()
        page.get_by_role("button", name="Generate from quotation").click()
        expect(page.get_by_text("Configuration generated")).to_be_visible(timeout=15000)
        values = json.loads(query("SELECT json_agg(json_build_object('en',v.value_en,'zh',v.value_zh," 
            "'proposal',c.appears_on @> ARRAY['proposal']::text[])) "
            "FROM deal_spec_values v JOIN spec_categories c ON c.id=v.spec_category_id "
            f"JOIN deals d ON d.id=v.deal_id WHERE d.deal_number='{deal_number}' AND v.deleted_at IS NULL"))
        for value in values:
            if value["proposal"]:
                assert compact(value["en"]) in proposal_specs, value["en"]

        page.goto(deal_url)
        page.get_by_role("link", name="PI 訂單").click()
        po = BytesIO()
        canvas = Canvas(po)
        canvas.drawString(72, 750, f"Example customer PO for {deal_number}")
        canvas.showPage()
        canvas.save()
        page.locator('input[name="poRef"]').fill("E2E-CONSISTENCY-PO")
        page.locator('input[name="depositPercent"]').fill("30")
        page.locator('input[name="customerPo"]').set_input_files({"name": "example-po.pdf", "mimeType": "application/pdf", "buffer": po.getvalue()})
        page.get_by_role("button", name="Record customer PO").click()
        expect(page.get_by_text("Customer PO recorded")).to_be_visible(timeout=15000)
        page.locator('input[name="verifiedLineByLine"]').check()
        page.get_by_role("button", name="Verify customer PO").click()
        expect(page.get_by_text("Customer PO verified")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Mark deal won").click()
        expect(page.get_by_text("Deal marked won")).to_be_visible(timeout=15000)
        page.goto(deal_url)
        page.get_by_role("link", name="MI 製令單").click()
        page.locator('input[name="plannedFinish"]').fill("2027-08-01")
        page.get_by_role("button", name="Create MI draft").click()
        expect(page.get_by_text("MI draft and specification 版次 1 created")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Issue MI and 製造規格表 PDFs").click()
        expect(page.get_by_text("MI and specification PDFs issued")).to_be_visible(timeout=30000)
        spec_href = page.get_by_role("link", name="Open Chinese PDF").nth(1).get_attribute("href")
        spec = PdfReader(BytesIO(page.context.request.get(base + spec_href).body()))
        spec_text = compact("".join(p.extract_text() or "" for p in spec.pages))
        mismatches = query("SELECT count(*) FROM spec_sheet_lines s JOIN spec_sheets sh ON sh.id=s.spec_sheet_id "
            "JOIN work_orders w ON w.id=sh.work_order_id JOIN orders o ON o.id=w.order_id "
            "JOIN deals d ON d.id=o.deal_id JOIN deal_spec_values v ON v.deal_id=d.id "
            "AND v.spec_category_id=s.spec_category_id WHERE sh.revision=1 "
            f"AND d.deal_number='{deal_number}' AND (s.value_en<>v.value_en OR s.value_zh<>v.value_zh)")
        assert mismatches == "0", mismatches
        for value in values:
            assert compact(value["zh"]) in spec_text, value["zh"]
        print("Issued generated proposal and MI specification share the same bilingual quote configuration: passed")
    finally:
        browser.close()
