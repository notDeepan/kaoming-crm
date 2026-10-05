"""Verify the manual first-use path on an empty, bootstrapped *_e2e database.

Start a separate app on MANUAL_E2E_URL with DATABASE_URL pointing to manual_e2e.
This creates disposable records and must never target the main CRM database.
"""

import os
import re
from datetime import datetime
from io import BytesIO
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from playwright.sync_api import expect, sync_playwright
from reportlab.pdfgen.canvas import Canvas


base = os.environ["MANUAL_E2E_URL"].rstrip("/")
database_url = os.environ["DATABASE_URL"]
if not urlparse(database_url).path.endswith("_e2e"):
    raise RuntimeError("Manual first-use check requires a disposable *_e2e database")
if urlparse(base).hostname not in ("127.0.0.1", "localhost"):
    raise RuntimeError("Manual first-use check requires a loopback app URL")


def visit(page, path):
    page.goto(base + path)
    page.wait_for_load_state("networkidle")


def proposal_pdf():
    output = BytesIO()
    canvas = Canvas(output)
    canvas.drawString(72, 750, "Manual first-use engineering proposal")
    canvas.showPage()
    canvas.save()
    return output.getvalue()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    try:
        visit(page, "/login")
        page.get_by_label("Email").fill(os.environ["SEED_ADMIN_EMAIL"])
        page.get_by_label("Password").fill(os.environ["SEED_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Sign in").click()
        expect(page).to_have_url(base + "/", timeout=15000)

        visit(page, "/partners/new")
        page.locator('input[name="code"]').fill("MANUAL-A1")
        page.locator('input[name="name"]').fill("Manual First Agent")
        page.locator('input[name="countryCode"]').fill("TW")
        page.locator('select[name="region"]').select_option("east_asia")
        page.get_by_role("button", name="Add partner").click()
        expect(page.get_by_text("Partner saved")).to_be_visible(timeout=10000)

        visit(page, "/products/models?new=1")
        page.locator('input[name="code"]').fill("MANUAL-M1")
        page.locator('input[name="nameEn"]').fill("Manual CNC model")
        page.locator('input[name="nameZh"]').fill("手動測試機型")
        page.get_by_role("button", name="Add machine model").click()
        expect(page.get_by_text("Machine model saved")).to_be_visible(timeout=10000)

        visit(page, "/products/items?new=1")
        page.locator('input[name="code"]').fill("MANUAL-M1")
        page.locator('select[name="itemType"]').select_option("machine")
        page.locator('input[name="nameEn"]').fill("Manual CNC machine")
        page.locator('input[name="nameZh"]').fill("手動測試機床")
        model_option = page.locator('select[name="machineModelId"] option').filter(has_text="MANUAL-M1").first
        page.locator('select[name="machineModelId"]').select_option(model_option.get_attribute("value"))
        page.get_by_role("button", name="Add item").click()
        expect(page.get_by_text("Item saved")).to_be_visible(timeout=10000)

        visit(page, "/products/price-books/imports")
        csv = (
            "item_code,name_en,name_zh,unit,spec_category,price_usd_eu,price_usd_non_eu,price_twd\n"
            "MANUAL-M1,Manual CNC machine,手動測試機床,set,,100000,90000,\n"
        )
        page.locator('input[name="priceFile"]').set_input_files({
            "name": "manual-first.csv", "mimeType": "text/csv", "buffer": csv.encode("utf-8"),
        })
        page.get_by_role("button", name="Upload and validate").click()
        expect(page.get_by_text("Diff preview")).to_be_visible(timeout=10000)
        expect(page.get_by_text("1 rows · 0 errors", exact=False)).to_be_visible()
        page.locator('input[name="name"]').fill("Manual First Book")
        page.locator('input[name="effectiveFrom"]').fill(datetime.now(ZoneInfo("Asia/Taipei")).date().isoformat())
        page.locator('input[name="confirmed"]').check()
        page.get_by_role("button", name="Publish price book").click()
        expect(page.get_by_text("Published", exact=True).first).to_be_visible(timeout=10000)

        visit(page, "/deals/new")
        partner_option = page.locator('select[name="partnerId"] option').filter(has_text="Manual First Agent").first
        page.locator('select[name="partnerId"]').select_option(partner_option.get_attribute("value"))
        model_option = page.locator('select[name="machineModelId"] option').filter(has_text="MANUAL-M1").first
        page.locator('select[name="machineModelId"]').select_option(model_option.get_attribute("value"))
        page.get_by_role("button", name="Create deal").click()
        expect(page).to_have_url(re.compile(r"/deals/[0-9a-f-]+$"), timeout=15000)
        page.get_by_role("button", name="Start quotation").click()
        expect(page.get_by_text("Quotation r1", exact=False)).to_be_visible(timeout=10000)
        item_option = page.locator('select[name="itemId"] option').filter(has_text="MANUAL-M1").first
        page.locator('select[name="itemId"]').select_option(item_option.get_attribute("value"))
        page.get_by_role("button", name="Add line").click()
        expect(page.get_by_text("Line added")).to_be_visible(timeout=10000)
        page.locator('input[name="reviewedBy"]').fill("Manual test engineer")
        page.get_by_role("button", name="Record review").click()
        expect(page.get_by_text("Design review recorded")).to_be_visible(timeout=10000)
        page.locator('input[name="proposal"]').set_input_files({
            "name": "manual-proposal.pdf", "mimeType": "application/pdf", "buffer": proposal_pdf(),
        })
        page.get_by_role("button", name="Attach engineering PDF").click()
        expect(page.get_by_text("Technical proposal attached")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Issue final quotation").click()
        expect(page.get_by_text("Quotation issued")).to_be_visible(timeout=10000)
        href = page.get_by_role("link", name="Print quotation").get_attribute("href")
        response = page.context.request.get(base + href)
        assert response.ok and response.headers["content-type"] == "application/pdf"
        assert response.body().startswith(b"%PDF-")
        print("Manual first-use path passed: partner, model, item, price book, deal, issued quotation PDF")
    finally:
        browser.close()
