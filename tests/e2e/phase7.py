"""Browser smoke for the remaining reports, against the disposable E2E database."""
import os
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Report browser check requires a disposable _e2e database")
BASE = env["AUTH_URL"].rstrip("/")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(BASE + "/login")
        page.get_by_label("Email").fill(env["SEED_ADMIN_EMAIL"])
        page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url(BASE + "/")

        checks = {
            "a1": "A1 · Executive overview · order date",
            "b2": "Latest quarterly snapshot",
            "b3": "Known partner coverage",
            "b4": "Channel economics by agent",
            "c1": "Pipeline by sales stage",
            "c2": "Model mix and discounting",
            "d2": "Slip curve and booking window by order",
            "d3": "Expected finish load",
            "e1": "Warranty determination",
            "e2": "Request turnaround",
            "e3": "Case register",
            "g1": "Order detail",
            "g2": "Claims register",
        }
        for report, heading in checks.items():
            response = page.goto(BASE + "/reports/" + report)
            assert response and response.status == 200, (report, response.status if response else None)
            expect(page.get_by_role("heading", name=heading, exact=True)).to_be_visible()
            assert "Application error" not in page.locator("body").inner_text(), report
            print(f"{report} browser render: passed")

        page.goto(BASE + "/reports/d2")
        expect(page.get_by_text("P-2026-0147").first).to_be_visible()
        expect(page.get_by_text("62d").first).to_be_visible()
        page.screenshot(path=str(ROOT / ".local" / "phase7-d2.png"), full_page=True)

        page.goto(BASE + "/reports/b2")
        expect(page.get_by_text("Fewer than four quarters", exact=False).first).to_be_visible()
        expect(page.get_by_text("Unrated", exact=False).first).to_be_visible()
        page.screenshot(path=str(ROOT / ".local" / "phase7-b2.png"), full_page=True)

        page.goto(BASE + "/reports/g1")
        expect(page.get_by_text("Estimated realized", exact=True).first).to_be_visible()
        page.screenshot(path=str(ROOT / ".local" / "phase7-g1.png"), full_page=True)
        assert not errors, errors
    finally:
        browser.close()
