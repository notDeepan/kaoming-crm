"""MI and specification PDF check on a disposable database after phase3_pi.py."""

import os
import subprocess
import unicodedata
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("MI browser check requires a disposable _e2e database")
base = env["AUTH_URL"].rstrip("/")
psql = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"


def sql(command: str) -> None:
    result = subprocess.run([str(psql), "-d", env["DATABASE_URL"], "-v", "ON_ERROR_STOP=1", "-c", command],
                            capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError("Disposable acceptance database setup failed")

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
        page.get_by_role("link", name="MI 製令單").click()
        page.locator('input[name="batchNumber"]').fill("227E005118")
        page.locator('input[name="plannedStart"]').fill("2026-10-15")
        page.locator('input[name="plannedFinish"]').fill("2027-08-01")
        page.get_by_role("button", name="Create MI draft").click()
        expect(page.get_by_text("MI draft and specification 版次 1 created")).to_be_visible(timeout=15000)
        sql("UPDATE partner_compliance_profiles SET default_colour_codes=NULL "
            "WHERE partner_id=(SELECT partner_id FROM deals WHERE deal_number='Q-2026-0147')")
        try:
            page.get_by_role("button", name="Issue MI and 製造規格表 PDFs").click()
            expect(page.locator('p[role="alert"]')).to_contain_text("G4:", timeout=15000)
        finally:
            sql("UPDATE partner_compliance_profiles SET default_colour_codes=ARRAY['790-49780H','790-49K84'] "
                "WHERE partner_id=(SELECT partner_id FROM deals WHERE deal_number='Q-2026-0147')")
        print("G4 refuses incomplete destination profile: passed")
        sql("INSERT INTO attachments (deal_id,\"group\",kind,file_url,filename,uploaded_by) "
            "SELECT d.id,'manufacturing','custom_change_image','pending','e2e-unbound.png',u.id "
            "FROM deals d CROSS JOIN users u WHERE d.deal_number='Q-2026-0147' AND u.role='admin' LIMIT 1")
        try:
            page.get_by_role("button", name="Issue MI and 製造規格表 PDFs").click()
            expect(page.locator('p[role="alert"]')).to_contain_text("G11:", timeout=15000)
        finally:
            sql("DELETE FROM attachments WHERE filename='e2e-unbound.png' AND file_url='pending'")
        print("G11 refuses an image without a specification revision: passed")
        image = BytesIO()
        Image.new("RGB", (80, 80), (42, 102, 160)).save(image, format="PNG")
        page.locator('input[name="image"]').set_input_files({"name": "custom-reference.png", "mimeType": "image/png", "buffer": image.getvalue()})
        page.get_by_role("button", name="Attach to revision").click()
        expect(page.get_by_text("Custom image bound to specification revision")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Issue MI and 製造規格表 PDFs").click()
        expect(page.get_by_text("MI and specification PDFs issued")).to_be_visible(timeout=30000)
        links = page.get_by_role("link", name="Open Chinese PDF")
        assert links.count() == 2
        for index, expected in enumerate(("製令單", "製造規格表")):
            response = page.context.request.get(base + links.nth(index).get_attribute("href"))
            assert response.ok, response.status
            data = response.body()
            name = "mi" if index == 0 else "spec-sheet"
            (ROOT / ".local" / f"M-2026-0147-{name}.pdf").write_bytes(data)
            reader = PdfReader(BytesIO(data))
            text = unicodedata.normalize("NFKC", "\n".join(pdf_page.extract_text() or "" for pdf_page in reader.pages))
            compact = "".join(text.split())
            assert "M-2026-0147" in compact and "115." in compact, (name, text[:300])
            assert expected in compact, (name, text[:300])
            assert "生管" in compact and "核覆" in compact and "經辦" in compact, (name, text[-300:])
            assert "custom-reference.png" in compact, (name, text[-300:])
            fonts = [str(font.get_object().get("/BaseFont", "")) for pdf_page in reader.pages for font in pdf_page["/Resources"]["/Font"].values()]
            assert any("NotoSans" in font for font in fonts), fonts
            raster = pdfium.PdfDocument(data)
            raster[0].render(scale=1.7).to_pil().save(ROOT / ".local" / f"M-2026-0147-{name}-page-1.png")
        print("MI and specification Chinese PDFs, ROC dates and sign-off text: passed")
        page.get_by_role("button", name="Record distribution").click()
        expect(page.get_by_text("Paper copy distribution recorded")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Acknowledge").click()
        expect(page.get_by_text("Paper copy acknowledged")).to_be_visible(timeout=15000)
        print("Specification paper circulation: passed")
    finally:
        browser.close()
