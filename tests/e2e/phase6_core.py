"""Phase 6 case and parts gates on the disposable example database."""

import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright
from pypdf import PdfReader
from io import BytesIO

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Phase 6 browser check requires a disposable _e2e database")
BASE = env["AUTH_URL"].rstrip("/")
PSQL = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"

def sql(query: str) -> str:
    result = subprocess.run([str(PSQL), "-d", env["DATABASE_URL"], "-At", "-v", "ON_ERROR_STOP=1", "-c", query],
                            capture_output=True, text=True, check=True)
    return result.stdout.strip()

def login(page, email: str):
    page.goto(BASE + "/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url(BASE + "/")

def notice(page, text: str):
    expect(page.get_by_role("status")).to_have_text(text, timeout=15000)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    try:
        login(page, env["SEED_ADMIN_EMAIL"])
        page.goto(BASE + "/cases")
        page.locator('select[name="partnerId"]').select_option(label="CP Agencies")
        page.locator('select[name="machineId"]').select_option(label="KMC-E2E-0147")
        page.locator('select[name="caseType"]').select_option("technical_query")
        page.locator('input[name="subject"]').fill("Example spindle startup question")
        page.get_by_role("button", name="Open case").click()
        notice(page, "Case opened")
        case_id = page.url.split("/cases/")[1].split("?")[0]
        assert sql("select count(*) from case_state_log where case_id='" + case_id + "'") == "1"
        form = page.locator('form:has(button:has-text("Record message"))')
        form.locator('textarea[name="sourceText"]').fill("Please confirm the startup sequence.")
        form.get_by_role("button", name="Record message").click()
        notice(page, "Message recorded")
        for target in ["translated", "with_engineering", "response_received",
                       "translated_back", "sent_to_agent", "awaiting_customer"]:
            form = page.locator('form:has(button:has-text("Change state"))')
            form.locator('select[name="target"]').select_option(target)
            form.get_by_role("button", name="Change state").click()
            notice(page, "Case state changed")
            expect(page.get_by_role("heading", name="State · " + target.replace("_", " "))).to_be_visible()
        form = page.locator('form:has(button:has-text("Change state"))')
        form.locator('select[name="target"]').select_option("resolved")
        form.locator('input[name="resolution"]').fill("Startup sequence supplied and confirmed.")
        form.get_by_role("button", name="Change state").click()
        notice(page, "Case state changed")
        expect(page.get_by_role("heading", name="State · resolved")).to_be_visible()
        page.get_by_role("button", name="Change state").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G13: Every case message needs source and translated text")
        assert sql("select status from cases where id='" + case_id + "'") == "resolved"
        page.locator('textarea[name="translatedText"]').fill("請確認開機順序。")
        page.get_by_role("button", name="Save reviewed translation").click()
        notice(page, "Translation reviewed")
        expect(page.get_by_text("請確認開機順序。").first).to_be_visible()
        outbound = page.locator('form:has(button:has-text("Record message"))')
        outbound.locator('select[name="direction"]').select_option("outbound_agent")
        outbound.locator('select[name="sourceLanguage"]').select_option("zh-Hant")
        outbound.locator('textarea[name="sourceText"]').fill("請檢查主軸開機順序。")
        outbound.get_by_role("button", name="Record message").click()
        notice(page, "Message recorded")
        message = page.locator("article").filter(has_text="請檢查主軸開機順序。")
        message.locator('textarea[name="translatedText"]').fill("Please check the spindle startup sequence.")
        message.get_by_role("button", name="Save reviewed translation").click()
        notice(page, "Translation reviewed")
        message = page.locator("article").filter(has_text="請檢查主軸開機順序。")
        message.get_by_role("button", name="Mark outbound correspondence sent").click()
        notice(page, "Outbound message marked sent")
        page.get_by_role("button", name="Change state").click()
        notice(page, "Case state changed")
        assert sql("select status from cases where id='" + case_id + "'") == "closed"
        assert sql("select count(*) from case_state_log where case_id='" + case_id + "'") == "9"
        print("Case original/translation, G13 and full state log: passed")

        page.goto(BASE + "/aftermarket")
        page.locator('select[name="partnerId"]').select_option(label="CP Agencies")
        page.locator('textarea[name="description"]').fill("Unknown machine needs a spindle bearing")
        page.get_by_role("button", name="Open request").click()
        notice(page, "Request opened")
        request_id = page.url.split("/aftermarket/")[1].split("?")[0]
        expect(page.get_by_text("Warranty cannot be determined")).to_be_visible()
        assert sql("select warranty_determination from parts_requests where id='" + request_id + "'") == "undeterminable"
        page.get_by_role("button", name="Request part identification from 售後").click()
        notice(page, "Identification requested")
        form = page.locator('form:has(button:has-text("Record identification"))')
        form.locator('input[name="partNumber"]').fill("SPARE-E2E-001")
        form.locator('input[name="identifiedBy"]').fill("After-sales")
        form.get_by_role("button", name="Record identification").click()
        notice(page, "Part identified")
        page.get_by_role("button", name="Record stock check").click()
        notice(page, "Stock checked")
        page.get_by_role("button", name="Request price from 採購 / 生管").click()
        notice(page, "Pricing requested")
        form = page.locator('form:has(button:has-text("Record price"))')
        form.locator('input[name="price"]').fill("250.00")
        form.locator('input[name="pricedBy"]').fill("Procurement")
        form.locator('select[name="source"]').select_option("procurement_quote")
        form.get_by_role("button", name="Record price").click()
        notice(page, "Part price recorded")
        page.get_by_role("button", name="Draft parts quotation").click()
        notice(page, "Quotation drafted")
        page.get_by_role("button", name="Approve quotation · G18").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G18: The approver cannot be the preparer")
        assert sql("select status from parts_quotations where parts_request_id='" + request_id + "'") == "draft"
        print("Undeterminable warranty, two handoffs, G17 preparation and G18 self-approval refusal: passed")

        sql("""insert into users(name,email,password_hash,role)
               select 'E2E Manager','manager-e2e@local.test',password_hash,'manager'
               from users where role='admin' order by created_at limit 1
               on conflict(email) do nothing""")
        manager = browser.new_page(viewport={"width": 1440, "height": 900})
        login(manager, "manager-e2e@local.test")
        manager.goto(BASE + "/aftermarket/" + request_id)
        manager.get_by_role("button", name="Approve quotation · G18").click()
        notice(manager, "Quotation approved")
        terms = manager.locator('form:has(button:has-text("Complete terms"))')
        terms.get_by_role("button", name="Complete terms · G8").click()
        notice(manager, "Terms completed")
        manager.get_by_role("button", name="Issue PDF quotation").click()
        notice(manager, "Parts quotation issued")
        href = manager.get_by_role("link", name="Open issued PDF").get_attribute("href")
        response = manager.context.request.get(BASE + href)
        assert response.ok
        pdf = PdfReader(BytesIO(response.body()))
        assert len(pdf.pages) == 1
        assert "SPARE-E2E-001" in (pdf.pages[0].extract_text() or "")
        print("Independent approval, G8 terms and one-page parts quotation: passed")
        manager.close()
    finally:
        browser.close()
