"""Phase 3 configuration bridge check against a disposable *_e2e database."""

import os
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Configuration browser check requires a disposable _e2e database")
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
        page.get_by_role("link", name="Configuration").click()
        expect(page.get_by_text("Source: issued quotation r3")).to_be_visible()
        page.get_by_role("button", name="Generate from quotation").click()
        expect(page.get_by_text("Configuration generated")).to_be_visible(timeout=15000)
        expect(page.get_by_text("Z 軸行程 1100 mm / W 軸行程 1500 mm")).to_be_visible()
        expect(page.get_by_text("主軸中心出水 40BAR 附 1000L 水箱", exact=False)).to_be_visible()
        assert page.locator('textarea[name="valueZh"]').count() >= 6
        values = page.locator('textarea[name="valueZh"]').evaluate_all("els => els.map(el => el.value)")
        assert not any("現場水平調整技師服務" in value for value in values), "Service leaked into factory configuration"
        assert not any("Renishaw RMP60" in value for value in values), "Excluded probe leaked into factory configuration"
        assert any("415V" in value and "3 相" in value for value in values), "Compliance electrical value missing"
        print("Issued quotation resolved into bilingual factory configuration: passed")
    finally:
        browser.close()
