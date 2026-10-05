"""Specification revision preserves the issued first sheet on the disposable database."""

import hashlib
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
    raise RuntimeError("Revision check requires a disposable _e2e database")
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
        page.get_by_role("link", name="MI 製令單").click()
        old_href = page.get_by_role("link", name="Open Chinese PDF").nth(1).get_attribute("href")
        old_bytes = page.context.request.get(base + old_href).body()
        old_hash = hashlib.sha256(old_bytes).hexdigest()

        page.get_by_role("link", name="← Q-2026-0147 quotation").click()
        page.get_by_role("link", name="Configuration").click()
        controller = page.locator("form").filter(has_text="Controller and CRT")
        controller.locator('textarea[name="valueEn"]').fill("Fanuc 31iMB — reviewed revision")
        controller.locator('textarea[name="valueZh"]').fill("Fanuc 31iMB — 版次二確認")
        controller.get_by_role("button", name="Save").click()
        expect(page.get_by_text("Specification saved")).to_be_visible(timeout=15000)

        page.get_by_role("link", name="← Q-2026-0147 quotation").click()
        page.get_by_role("link", name="MI 製令單").click()
        page.get_by_role("button", name="Create next specification 版次").click()
        expect(page.get_by_text("New specification revision created")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Issue specification revision PDF").click()
        expect(page.get_by_text("Specification revision PDF issued")).to_be_visible(timeout=30000)
        links = page.get_by_role("link", name="Open Chinese PDF")
        assert links.count() == 3
        new_bytes = page.context.request.get(base + links.nth(2).get_attribute("href")).body()
        new_text = unicodedata.normalize("NFKC", "".join(p.extract_text() or "" for p in PdfReader(BytesIO(new_bytes)).pages))
        assert "版次二確認" in new_text and "版次:2" in "".join(new_text.split()), new_text[-500:]
        assert hashlib.sha256(page.context.request.get(base + old_href).body()).hexdigest() == old_hash
        print("Specification revision 2 contains reviewed values; revision 1 PDF remains frozen: passed")
    finally:
        browser.close()
