"""PI order, G3 and G9 browser acceptance on a disposable *_e2e database."""

import os
import unicodedata
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright
from pypdf import PdfReader
import pypdfium2 as pdfium
from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("PI browser check requires a disposable _e2e database")
base = env["AUTH_URL"].rstrip("/")

po = BytesIO()
canvas = Canvas(po)
canvas.drawString(72, 750, "Example customer PO for Q-2026-0147")
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
        page.goto(base + "/deals")
        page.get_by_role("link", name="Q-2026-0147").click()
        page.get_by_role("link", name="PI 訂單").click()
        page.locator('input[name="poRef"]').fill("PO/2026/0884")
        page.locator('input[name="depositPercent"]').fill("30")
        page.locator('input[name="customerPo"]').set_input_files({"name": "example-po.pdf", "mimeType": "application/pdf", "buffer": po.getvalue()})
        page.get_by_role("button", name="Record customer PO").click()
        expect(page.get_by_text("Customer PO recorded")).to_be_visible(timeout=15000)

        page.get_by_role("button", name="Mark deal won").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G3:", timeout=15000)
        print("G3 refuses deal won before PO verification: passed")
        page.locator('input[name="verifiedLineByLine"]').check()
        page.get_by_role("button", name="Verify customer PO").click()
        expect(page.get_by_text("Customer PO verified")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Mark deal won").click()
        expect(page.get_by_text("Deal marked won")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Issue PI 訂單 PDF").click()
        expect(page.get_by_text("PI 訂單 issued")).to_be_visible(timeout=30000)
        href = page.get_by_role("link", name="Open PDF").get_attribute("href")
        response = page.context.request.get(base + href)
        assert response.ok, response.status
        pdf_bytes = response.body()
        (ROOT / ".local" / "P-2026-0147-pi.pdf").write_bytes(pdf_bytes)
        reader = PdfReader(BytesIO(pdf_bytes))
        text = unicodedata.normalize("NFKC", "\n".join(pdf_page.extract_text() or "" for pdf_page in reader.pages))
        compact = "".join(text.split())
        for expected in ("訂", "單", "訂單號碼", "P-2026-0147", "高明精機", "115."):
            assert expected in compact, f"PI PDF missing {expected}"
        font_names = []
        for pdf_page in reader.pages:
            resources = pdf_page.get("/Resources")
            fonts = resources.get("/Font") if resources else None
            if fonts:
                for font in fonts.values():
                    font_names.append(str(font.get_object().get("/BaseFont", "")))
        assert any("NotoSans" in name for name in font_names), font_names
        pdfium.PdfDocument(pdf_bytes)[0].render(scale=1.7).to_pil().save(ROOT / ".local" / "P-2026-0147-pi-page-1.png")
        print("PI Chinese PDF text and embedded Noto font: passed")

        page.get_by_role("button", name="Record printed copy").click()
        expect(page.get_by_text("Printed copy recorded")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Release signed PI").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G9:", timeout=15000)
        print("G9 refuses PI release without signature: passed")
        page.get_by_role("button", name="Record signature").click()
        expect(page.get_by_text("Signature recorded")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Release signed PI").click()
        expect(page.get_by_text("Document released")).to_be_visible(timeout=15000)
        print("Signed PI release: passed")
    finally:
        browser.close()
