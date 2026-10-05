"""Check the admin audit page against the disposable E2E database."""
import os
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Audit browser check requires a disposable _e2e database")
BASE = env["AUTH_URL"].rstrip("/")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    try:
        page.goto(BASE + "/login")
        page.get_by_label("Email").fill(env["SEED_ADMIN_EMAIL"])
        page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url(BASE + "/")
        page.goto(BASE + "/settings")
        page.get_by_role("link", name="View change history").click()
        expect(page.get_by_role("heading", name="Change history")).to_be_visible()
        expect(page.get_by_role("cell", name="shipments").first).to_be_visible()
        assert "password_hash" not in page.locator("main").inner_text()
        print("Admin audit history page: passed")
    finally:
        browser.close()
