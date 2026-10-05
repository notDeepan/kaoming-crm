"""Phase 4 production, FAT, shipment and G10 on the disposable E2E database.

Run after phase3_mi.py. The fixture contains example data only.
"""

import os
import subprocess
import unicodedata
from datetime import date, timedelta
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image
from playwright.sync_api import expect, sync_playwright
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Phase 4 acceptance requires disposable _e2e database")
BASE = env["AUTH_URL"].rstrip("/")
PSQL = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"


def sql(command: str) -> str:
    result = subprocess.run([str(PSQL), "-d", env["DATABASE_URL"], "-At", "-v", "ON_ERROR_STOP=1", "-c", command], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"Disposable test query failed: {result.stderr}")
    return result.stdout.strip()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    try:
        page.goto(BASE + "/login")
        page.get_by_label("Email").fill(env["SEED_ADMIN_EMAIL"])
        page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url(BASE + "/")
        deal_id = sql("SELECT id FROM deals WHERE deal_number='Q-2026-0147'")
        work_id = sql("SELECT w.id FROM work_orders w JOIN orders o ON o.id=w.order_id WHERE o.deal_id='" + deal_id + "'")
        count = int(sql("SELECT count(*) FROM progress_reviews WHERE work_order_id='" + work_id + "'"))
        assert count == 16, count  # 2026-11 through 2028-02 for contractual 2027-08-01
        page.goto(BASE + f"/deals/{deal_id}/production")
        expect(page.get_by_text("M+1", exact=True)).to_be_visible()
        page.locator('input[name="expectedCompletion"]').fill("2027-09-02")
        page.locator('select[name="reportedStage"]').select_option("machining")
        page.locator('select[name="delayReason"]').select_option("capacity")
        page.locator('select[name="attribution"]').select_option("kao_ming")
        page.get_by_role("button", name="Save expected date").click()
        expect(page.get_by_text("Monthly progress review recorded")).to_be_visible()
        assert sql("SELECT escalation_level||':'||cumulative_slip_days||':'||reported_stage FROM progress_reviews WHERE work_order_id='" + work_id + "' AND sequence=1") == "dept_manager:32:machining"
        page.locator('input[name="expectedCompletion"]').fill("2027-10-02")
        page.locator('select[name="reportedStage"]').select_option("assembly")
        page.locator('select[name="delayReason"]').select_option("supplier")
        page.locator('select[name="attribution"]').select_option("supplier")
        page.get_by_role("button", name="Save expected date").click()
        expect(page.get_by_text("Monthly progress review recorded")).to_be_visible()
        assert sql("SELECT escalation_level||':'||cumulative_slip_days||':'||delta_days FROM progress_reviews WHERE work_order_id='" + work_id + "' AND sequence=2") == "gm:62:30"
        yesterday = (date.today() - timedelta(days=3)).isoformat()
        sql("UPDATE progress_reviews SET due_date='" + yesterday + "' WHERE work_order_id='" + work_id + "' AND sequence=3")
        page.reload()
        expect(page.get_by_text("Overdue · dept_manager")).to_be_visible()
        print("Monthly counter, stage attribution, 30/60 day escalation and overdue exception: passed")

        page.locator('input[name="scheduledFor"]').fill("2027-07-01")
        page.get_by_role("button", name="Schedule FAT").click()
        expect(page.get_by_text("FAT scheduled with checklist from the issued specification")).to_be_visible()
        checklist_count = int(sql("SELECT count(*) FROM fat_checklist_items WHERE fat_record_id=(SELECT id FROM fat_records WHERE work_order_id='" + work_id + "' LIMIT 1)"))
        spec_count = int(sql("SELECT count(*) FROM spec_sheet_lines WHERE spec_sheet_id=(SELECT id FROM spec_sheets WHERE work_order_id='" + work_id + "' AND revision=1)"))
        assert checklist_count == spec_count and checklist_count > 0
        page.locator('input[name="conductedAt"]').fill("2027-07-01")
        page.get_by_role("button", name="Conclude FAT").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("Verify every specification item")
        for index in range(checklist_count):
            form = page.locator('form:has(input[name="itemId"])').nth(index)
            form.locator('select[name="verified"]').select_option("true")
            form.get_by_role("button", name="Save").click()
            expect(page.get_by_text("FAT checklist updated")).to_be_visible()
        page.locator('input[name="conductedAt"]').fill("2027-07-01")
        page.get_by_role("button", name="Conclude FAT").click()
        expect(page.get_by_text("FAT outcome recorded")).to_be_visible()
        assert sql("SELECT count(*) FROM progress_reviews WHERE work_order_id='" + work_id + "' AND filled_at IS NULL AND closed_at IS NULL") == "0"
        print("FAT frozen checklist and closure of remaining reviews: passed")

        page.goto(BASE + f"/deals/{deal_id}/delivery")
        page.get_by_role("button", name="Open shipment record").click()
        expect(page.get_by_text("Shipment opened")).to_be_visible()
        page.locator('input[name="serialNumber"]').fill("KMC-E2E-0147")
        page.locator('input[name="billOfLadingRef"]').fill("BL-E2E-147")
        page.get_by_role("button", name="Record shipment and create machine").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("final payment")
        page.locator('input[name="lengthMm"]').fill("2600")
        page.locator('input[name="forwarderName"]').fill("Example Forwarder")
        page.locator('input[name="widthMm"]').fill("2200")
        page.locator('input[name="heightMm"]').fill("1900")
        page.locator('input[name="grossWeightKg"]').fill("120")
        page.get_by_role("button", name="Save package").click()
        expect(page.get_by_text("Package details recorded")).to_be_visible()
        expect(page.get_by_text("Shipping mark required", exact=False)).to_be_visible()
        page.locator('input[name="actualFinish"]').fill("2027-06-30")
        page.get_by_role("button", name="Record E0 completion notice").click()
        expect(page.get_by_text("E0 completion notification recorded")).to_be_visible()
        page.get_by_role("button", name="Request booking").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G5:")
        page.get_by_role("button", name="Record final payment received").click()
        expect(page.get_by_text("Final payment recorded")).to_be_visible()
        page.get_by_role("button", name="Request booking").click()
        expect(page.get_by_text("Booking request recorded")).to_be_visible()
        page.locator('input[name="reason"]').fill("No space on requested vessel")
        page.get_by_role("button", name="Record refusal and retry").click()
        expect(page.get_by_text("Booking attempt rejected; a new attempt can be made")).to_be_visible()
        page.get_by_role("button", name="Request booking").click()
        expect(page.get_by_text("Booking request recorded")).to_be_visible()
        page.locator('input[name="vesselOrFlight"]').fill("EXAMPLE VESSEL")
        page.locator('input[name="etd"]').fill("2027-07-15")
        page.locator('input[name="eta"]').fill("2027-08-15")
        page.locator('input[name="bookingReference"]').evaluate("element => element.removeAttribute('required')")
        page.get_by_role("button", name="Confirm space").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G14:")
        page.locator('input[name="bookingReference"]').fill("BOOK-E2E-147")
        page.locator('input[name="vesselOrFlight"]').fill("EXAMPLE VESSEL")
        page.locator('input[name="etd"]').fill("2027-07-15")
        page.locator('input[name="eta"]').fill("2027-08-15")
        page.get_by_role("button", name="Confirm space").click()
        expect(page.get_by_text("Space confirmed", exact=True)).to_be_visible()
        assert sql("SELECT booking_attempts FROM shipments WHERE order_id=(SELECT id FROM orders WHERE deal_id='" + deal_id + "')") == "2"
        page.get_by_role("button", name="Issue 出貨通知 PDF").click()
        expect(page.get_by_text("Shipping notice PDF issued")).to_be_visible()
        notice_url = page.get_by_role("link", name="Open shipping notice PDF").get_attribute("href")
        assert page.context.request.get(BASE + notice_url).ok
        page.get_by_role("button", name="Record notice sent").click()
        expect(page.get_by_text("Shipping notice dispatch recorded")).to_be_visible()
        pdf = BytesIO()
        canvas = Canvas(pdf)
        canvas.drawString(72, 750, "Example export document")
        canvas.showPage()
        canvas.save()
        for kind in ("commercial_invoice", "packing_list", "certificate_of_origin"):
            form = page.locator(f'form:has(input[name="kind"][value="{kind}"])')
            form.locator('input[name="document"]').set_input_files({"name": f"{kind}.pdf", "mimeType": "application/pdf", "buffer": pdf.getvalue()})
            form.get_by_role("button", name="Upload PDF").click()
            expect(page.get_by_text("Export document recorded")).to_be_visible()
        page.locator('form:has(button:has-text("Issue 出貨單 PDF")) input[name="serialNumber"]').fill("KMC-E2E-0147")
        page.get_by_role("button", name="Issue 出貨單 PDF").click()
        expect(page.get_by_text("出貨單 PDF issued")).to_be_visible(timeout=30000)
        order_url = page.get_by_role("link", name="Open 出貨單 PDF").get_attribute("href")
        order_pdf = page.context.request.get(BASE + order_url)
        assert order_pdf.ok
        order_text = unicodedata.normalize("NFKC", "".join(p.extract_text() or "" for p in PdfReader(BytesIO(order_pdf.body())).pages))
        compact = "".join(order_text.split())
        assert "出" in compact and "貨" in compact and "生管" in compact and "KMC-E2E-0147" in compact
        page.get_by_role("button", name="Record printed 出貨單").click()
        expect(page.get_by_text("Printed 出貨單 recorded")).to_be_visible()
        print("E0-E6, G5/G14/G15/G16, booking retries and shipping PDFs: passed")
        page.locator('input[name="serialNumber"]').fill("KMC-E2E-0147")
        page.locator('input[name="billOfLadingRef"]').fill("BL-E2E-147")
        page.get_by_role("button", name="Record shipment and create machine").click()
        expect(page.get_by_text("Machine shipped and installed-base record created")).to_be_visible()
        page.get_by_role("button", name="Record arrival").click()
        expect(page.get_by_text("Arrival recorded")).to_be_visible()
        page.locator('input[name="visitedAt"]').fill(date.today().isoformat())
        page.locator('input[name="engineer"]').fill("Example engineer")
        page.get_by_role("button", name="Open site visit").click()
        expect(page.get_by_text("Site visit opened")).to_be_visible()
        page.get_by_role("button", name="Close visit").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G10:")
        image = BytesIO()
        Image.new("RGB", (80, 80), (42, 102, 160)).save(image, format="PNG")
        page.locator('input[name="photo"]').set_input_files({"name": "installation.png", "mimeType": "image/png", "buffer": image.getvalue()})
        page.get_by_role("button", name="Add photo").click()
        expect(page.get_by_text("Condition photo added")).to_be_visible()
        photo_url = page.get_by_role("link", name="installation.png").get_attribute("href")
        assert page.context.request.get(BASE + photo_url).ok
        page.get_by_role("button", name="Close visit").click()
        expect(page.get_by_text("Site visit closed")).to_be_visible()
        page.locator('input[name="acceptedAt"]').fill(date.today().isoformat())
        page.get_by_role("button", name="Record acceptance and start warranty").click()
        expect(page.get_by_text("Acceptance and warranty start recorded")).to_be_visible()
        assert sql("SELECT count(*) FROM machines WHERE serial_number='KMC-E2E-0147' AND accepted_at IS NOT NULL AND warranty_expires_at IS NOT NULL") == "1"
        print("Shipment, installed base, G10 condition photos and acceptance warranty: passed")
    finally:
        browser.close()
