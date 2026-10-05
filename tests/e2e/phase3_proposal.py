"""Three-part proposal merge from a new draft quotation on the disposable database."""

import os
import unicodedata
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Proposal check requires a disposable _e2e database")
base = env["AUTH_URL"].rstrip("/")

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
        page.get_by_role("button", name="New revision").click()
        expect(page.get_by_text("Draft revision created")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Generate three-part proposal").click()
        expect(page.get_by_text("Three-part technical proposal generated")).to_be_visible(timeout=30000)
        href = page.get_by_role("link", name="PDF attached").get_attribute("href")
        response = page.context.request.get(base + href)
        assert response.ok, response.status
        data = response.body()
        (ROOT / ".local" / "Q-2026-0147-r4-proposal.pdf").write_bytes(data)
        reader = PdfReader(BytesIO(data))
        assert len(reader.pages) >= 3
        parts = [unicodedata.normalize("NFKC", p.extract_text() or "") for p in reader.pages]
        assert "MODEL CONTENT / PART A" in parts[0]
        assert "WORKED EXAMPLE" in parts[0]
        assert "CONFIRMED CONFIGURATION" in parts[1]
        assert "Spindle" in parts[1] and "ISO 50 / 6000 rpm" in parts[1]
        assert "*" not in parts[1]
        assert "DEAL RECORD" in parts[-1] and "CP Agencies" in parts[-1]
        assert all("Q-2026-0147" in part and "revision 4" in part for part in parts)
        print("Three-part technical proposal, static model page, configuration and deal page: passed")
    finally:
        browser.close()
