"""Model literature and bilingual base-spec editing on the disposable database."""

import os
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright
from pypdf import PdfReader
from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Model asset check requires a disposable _e2e database")
base = env["AUTH_URL"].rstrip("/")
sample = BytesIO()
canvas = Canvas(sample)
canvas.drawString(72, 750, "UPLOADED TEST MODEL CONTENT")
canvas.showPage()
canvas.save()

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    try:
        page.goto(base + "/login")
        page.get_by_label("Email").fill(env["SEED_ADMIN_EMAIL"])
        page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url(base + "/")
        page.goto(base + "/products/models")
        page.get_by_role("link", name="KMC-637AS").click()
        page.locator('input[name="proposal"]').set_input_files({"name": "damaged.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-" + b"broken" * 30})
        page.get_by_role("button", name="Upload model PDF").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("damaged or unsupported", timeout=15000)
        page.locator('input[name="proposal"]').set_input_files({"name": "test-model.pdf", "mimeType": "application/pdf", "buffer": sample.getvalue()})
        page.get_by_role("button", name="Upload model PDF").click()
        expect(page.get_by_text("Model literature PDF uploaded")).to_be_visible(timeout=15000)
        asset_href = page.get_by_role("link", name="test-model.pdf").get_attribute("href")
        response = page.context.request.get(base + asset_href)
        assert response.ok and "UPLOADED TEST MODEL CONTENT" in PdfReader(BytesIO(response.body())).pages[0].extract_text()
        anonymous = playwright.request.new_context()
        assert anonymous.get(base + asset_href).status == 401
        anonymous.dispose()

        page.locator('textarea[name="spec_controller_en"]').fill("Fanuc 31iMB TEST")
        page.locator('textarea[name="spec_controller_zh"]').fill("")
        page.get_by_role("button", name="Save base specifications").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("provide both English and Chinese values", timeout=15000)
        page.locator('textarea[name="spec_controller_en"]').fill("Fanuc 31iMB TEST")
        page.locator('textarea[name="spec_controller_zh"]').fill("Fanuc 31iMB 測試")
        page.get_by_role("button", name="Save base specifications").click()
        expect(page.get_by_text("Bilingual model specifications saved")).to_be_visible(timeout=15000)
        page.goto(base + "/deals")
        page.get_by_role("link", name="Q-2026-0147").click()
        expect(page.get_by_role("button", name="Generate three-part proposal")).to_be_visible(timeout=15000)
        proposal_card = page.get_by_text("G1 · Technical proposal").locator("..")
        expect(proposal_card.get_by_text("Pending")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Generate three-part proposal").click()
        expect(page.get_by_text("Three-part technical proposal generated")).to_be_visible(timeout=30000)
        href = page.get_by_role("link", name="PDF attached").get_attribute("href")
        pdf = PdfReader(BytesIO(page.context.request.get(base + href).body()))
        assert "UPLOADED TEST MODEL CONTENT" in pdf.pages[0].extract_text()
        assert "Fanuc 31iMB TEST" in pdf.pages[1].extract_text()
        print("Model PDF upload, secure retrieval, base-spec edit and draft proposal invalidation: passed")
    finally:
        browser.close()
