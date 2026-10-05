"""Phase 2 browser acceptance against a disposable *_e2e database.

Run after migrating/seeding the isolated database and starting Next on AUTH_URL.
"""

import os
import re
from datetime import datetime
from io import BytesIO
from pathlib import Path
from secrets import token_urlsafe
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from playwright.sync_api import expect, sync_playwright
from pypdf import PdfReader
from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parents[2]
env_file = Path(os.environ.get("E2E_ENV_FILE", ROOT / ".local" / "e2e.env"))
env = dict(line.split("=", 1) for line in env_file.read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Phase 2 browser checks require an isolated _e2e database")
BASE = env["AUTH_URL"].rstrip("/")


def visit(page, path):
    page.goto(BASE + path)
    page.wait_for_load_state("networkidle")


def login(page, email, password):
    visit(page, "/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign in").click()
    expect(page).to_have_url(BASE + "/", timeout=15000)


def select_item(page, code):
    choice = page.locator('select[name="itemId"] option').filter(has_text=code).first
    page.locator('select[name="itemId"]').select_option(choice.get_attribute("value"))


def sample_proposal():
    output = BytesIO()
    canvas = Canvas(output)
    canvas.drawString(72, 750, "Kao Ming technical proposal — acceptance sample")
    canvas.showPage()
    canvas.save()
    return output.getvalue()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    try:
        login(page, env["SEED_ADMIN_EMAIL"], env["SEED_ADMIN_PASSWORD"])
        visit(page, "/deals/new")
        page.locator('select[name="partnerId"]').select_option(label="A11004 · CP Agencies")
        model = page.locator('select[name="machineModelId"] option').filter(has_text="KMC-637AS").first
        page.locator('select[name="machineModelId"]').select_option(model.get_attribute("value"))
        page.get_by_role("button", name="Create deal").click()
        expect(page).to_have_url(re.compile(r"/deals/[0-9a-f-]+$"), timeout=15000)
        deal_url = page.url
        page.get_by_role("button", name="Start quotation").click()
        expect(page.get_by_text("Quotation r1", exact=False)).to_be_visible(timeout=15000)
        select_item(page, "KMC-637AS")
        page.get_by_role("button", name="Add line").click()
        expect(page.get_by_text("Line added")).to_be_visible(timeout=10000)
        select_item(page, "OPT-ZW11")
        page.locator('input[name="lineDiscount"]').fill("1000")
        page.get_by_role("button", name="Add line").click()
        expect(page.get_by_role("row").filter(has_text="OPT-ZW11")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Issue final quotation").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G1:", timeout=10000)
        print("G1 refuses premature issue: passed")

        page.locator('input[name="reviewedBy"]').fill("Acceptance engineer")
        page.locator('textarea[name="notes"]').fill("Fit checked against current configuration")
        page.get_by_role("button", name="Record review").click()
        expect(page.get_by_text("Design review recorded")).to_be_visible(timeout=10000)
        page.locator('input[name="proposal"]').set_input_files({
            "name": "proposal.pdf", "mimeType": "application/pdf", "buffer": sample_proposal(),
        })
        page.get_by_role("button", name="Attach engineering PDF").click()
        expect(page.get_by_text("Technical proposal attached")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Issue final quotation").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G2:", timeout=10000)
        print("G2 refuses unapproved discount: passed")

        suffix = token_urlsafe(4).lower().replace("-", "a").replace("_", "b")
        manager_email = f"dept-{suffix}@example.test"
        gm_email = f"gm-{suffix}@example.test"
        manager_password = token_urlsafe(18)
        gm_password = token_urlsafe(18)
        for name, email, password, department in [
            ("Acceptance department manager", manager_email, manager_password, "Sales"),
            ("Acceptance GM", gm_email, gm_password, "GM"),
        ]:
            visit(page, "/settings")
            page.get_by_label("Name", exact=True).fill(name)
            page.get_by_label("Email", exact=True).fill(email)
            page.get_by_label("Initial password").fill(password)
            page.get_by_label("Role").select_option("manager")
            page.get_by_label("Department").fill(department)
            page.get_by_role("button", name="Add user").click()
            expect(page.get_by_text("User account created")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Sign out").click()
        login(page, manager_email, manager_password)
        visit(page, deal_url.removeprefix(BASE))
        page.get_by_role("button", name="Department manager approval").click()
        expect(page.get_by_text("Discount approval recorded")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Sign out").click()
        login(page, gm_email, gm_password)
        visit(page, deal_url.removeprefix(BASE))
        page.get_by_role("button", name="GM approval").click()
        expect(page.get_by_text("Discount approval recorded")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Issue final quotation").click()
        expect(page.get_by_text("Quotation issued")).to_be_visible(timeout=10000)
        expect(page.get_by_text("Quotation r1", exact=False)).to_be_visible()
        quote_id = re.search(r"/api/quotations/([0-9a-f-]+)/pdf", page.locator('a:has-text("Print quotation")').get_attribute("href")).group(1)
        response = page.context.request.get(f"{BASE}/api/quotations/{quote_id}/pdf")
        assert response.ok and response.headers["content-type"] == "application/pdf"
        pdf_bytes = response.body()
        assert pdf_bytes.startswith(b"%PDF-")
        text = re.sub(r"\s+", " ", " ".join(p.extract_text() or "" for p in PdfReader(BytesIO(pdf_bytes)).pages))
        for phrase in ["QUOTATION", "CP Agencies", "Machine", "configuration", "Optional accessories", "List total", "Total price"]:
            assert phrase.lower() in text.lower(), f"{phrase}: {text[:700]}"
        print("Issued quotation and PDF structure: passed")

        page.get_by_role("button", name="Sign out").click()
        login(page, env["SEED_ADMIN_EMAIL"], env["SEED_ADMIN_PASSWORD"])
        visit(page, "/products/price-books/imports")
        invalid = "item_code,name_en,name_zh,unit,spec_category,price_usd_eu,price_usd_non_eu,price_twd\nBAD,Bad,,set,unknown,,oops,-2\n"
        page.locator('input[name="priceFile"]').set_input_files({"name": "invalid.csv", "mimeType": "text/csv", "buffer": invalid.encode()})
        page.get_by_role("button", name="Upload and validate").click()
        expect(page.get_by_text("UNKNOWN_ITEM")).to_be_visible(timeout=10000)
        expect(page.get_by_text("MISSING_品名")).to_be_visible()
        expect(page.get_by_text("BAD_NUMBER")).to_be_visible()
        print("Import row-numbered validation: passed")

        valid = "item_code,name_en,name_zh,unit,spec_category,price_usd_eu,price_usd_non_eu,price_twd\n"
        valid += "KMC-637AS,KMC-637AS base machine,龍門式加工中心機〈五軸〉,台,,735000,700000,22000000\n"
        valid += "OPT-ZW11,Z / W travel upgrade,Z / W 軸行程升級,式,travels,61793,58850,1800000\n"
        valid += "OPT-AUH,Automatic universal head A&C,自動萬向頭 A/C 軸 1度分度,式,attachment_head,78750,75000,2300000\n"
        page.locator('input[name="priceFile"]').set_input_files({"name": "2026-H2.csv", "mimeType": "text/csv", "buffer": valid.encode()})
        page.get_by_role("button", name="Upload and validate").click()
        expect(page.get_by_text("Diff preview")).to_be_visible(timeout=10000)
        expect(page.get_by_text("700000.00")).to_be_visible(timeout=10000)
        page.locator('input[name="name"]').fill("2026-H2-E2E")
        page.locator('input[name="effectiveFrom"]').fill(datetime.now(ZoneInfo("Asia/Taipei")).date().isoformat())
        page.locator('input[name="confirmed"]').evaluate("element => element.removeAttribute('required')")
        page.get_by_role("button", name="Publish price book").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G12:", timeout=10000)
        page.locator('input[name="name"]').fill("2026-H2-E2E")
        page.locator('input[name="effectiveFrom"]').fill(datetime.now(ZoneInfo("Asia/Taipei")).date().isoformat())
        page.locator('input[name="confirmed"]').check()
        page.get_by_role("button", name="Publish price book").click()
        expect(page.get_by_text("Published", exact=True).first).to_be_visible(timeout=10000)
        print("G12 confirmation and publication: passed")

        visit(page, deal_url.removeprefix(BASE))
        expect(page.get_by_text("2026-H1")).to_be_visible()
        page.get_by_role("button", name="New revision").click()
        expect(page.get_by_text("Quotation r2", exact=False)).to_be_visible(timeout=10000)
        expect(page.get_by_text("2026-H2-E2E")).to_be_visible()
        response_after = page.context.request.get(f"{BASE}/api/quotations/{quote_id}/pdf")
        text_after = re.sub(r"\s+", " ", " ".join(p.extract_text() or "" for p in PdfReader(BytesIO(response_after.body())).pages))
        assert text_after == text, "Issued r1 quotation content changed after price publication"
        print("Issued revision retains locked old prices after publication: passed")

        # Complete r2, then create and issue r3 with another line-level discount.
        page.locator('input[name="reviewedBy"]').fill("Acceptance engineer")
        page.get_by_role("button", name="Record review").click()
        expect(page.get_by_text("Design review recorded")).to_be_visible(timeout=10000)
        page.locator('input[name="proposal"]').set_input_files({"name": "proposal-r2.pdf", "mimeType": "application/pdf", "buffer": sample_proposal()})
        page.get_by_role("button", name="Attach engineering PDF").click()
        expect(page.get_by_text("Technical proposal attached")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Sign out").click()
        login(page, manager_email, manager_password)
        visit(page, deal_url.removeprefix(BASE))
        page.get_by_role("button", name="Department manager approval").click()
        expect(page.get_by_text("Discount approval recorded")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Sign out").click()
        login(page, gm_email, gm_password)
        visit(page, deal_url.removeprefix(BASE))
        page.get_by_role("button", name="GM approval").click()
        expect(page.get_by_text("Discount approval recorded")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Issue final quotation").click()
        expect(page.get_by_text("Quotation issued")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="New revision").click()
        expect(page.get_by_text("Quotation r3", exact=False)).to_be_visible(timeout=10000)
        select_item(page, "OPT-AUH")
        page.locator('input[name="lineDiscount"]').fill("5000")
        page.get_by_role("button", name="Add line").click()
        expect(page.get_by_role("row").filter(has_text="OPT-AUH")).to_be_visible(timeout=10000)
        expect(page.get_by_text("827850.00")).to_be_visible()
        page.locator('input[name="reviewedBy"]').fill("Acceptance engineer")
        page.get_by_role("button", name="Record review").click()
        expect(page.get_by_text("Design review recorded")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Generate three-part proposal").click()
        expect(page.get_by_text("Three-part technical proposal generated")).to_be_visible(timeout=30000)
        page.locator('textarea[name="paymentTerms"]').fill("30% down payment; balance before shipment")
        page.get_by_role("button", name="Save terms").click()
        expect(page.get_by_text("Terms saved")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Issue final quotation").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G1:", timeout=10000)
        page.get_by_role("button", name="Generate three-part proposal").click()
        expect(page.get_by_text("Three-part technical proposal generated")).to_be_visible(timeout=30000)
        print("Changed quotation terms invalidate the generated proposal: passed")
        page.get_by_role("button", name="Sign out").click()
        login(page, manager_email, manager_password)
        visit(page, deal_url.removeprefix(BASE))
        page.get_by_role("button", name="Department manager approval").click()
        expect(page.get_by_text("Discount approval recorded")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Sign out").click()
        login(page, gm_email, gm_password)
        visit(page, deal_url.removeprefix(BASE))
        page.get_by_role("button", name="GM approval").click()
        expect(page.get_by_text("Discount approval recorded")).to_be_visible(timeout=10000)
        page.get_by_role("button", name="Issue final quotation").click()
        expect(page.get_by_text("Quotation issued")).to_be_visible(timeout=10000)
        expect(page.get_by_text("r1", exact=True)).to_be_visible()
        expect(page.get_by_text("r2", exact=True)).to_be_visible()
        expect(page.get_by_text("r3", exact=True)).to_be_visible()
        expect(page.get_by_text("827850.00")).to_be_visible()
        print("r1 to r3 immutable revisions with line-level discount: passed")
    except Exception:
        page.screenshot(path=str(ROOT / ".local" / "phase2-e2e-failure.png"), full_page=True)
        raise
    finally:
        browser.close()
