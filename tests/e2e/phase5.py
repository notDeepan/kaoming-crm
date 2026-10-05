"""Check the five wave-1 reports against the disposable example database."""

import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Report browser check requires a disposable _e2e database")
BASE = env["AUTH_URL"].rstrip("/")
PSQL = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"

def sql(query: str) -> str:
    result = subprocess.run([str(PSQL), "-d", env["DATABASE_URL"], "-At", "-v", "ON_ERROR_STOP=1", "-c", query],
                            capture_output=True, text=True, check=True)
    return result.stdout.strip()

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

        page.goto(BASE + "/reports/d1")
        expect(page.get_by_role("heading", name="D1 · Order book and status · order date")).to_be_visible()
        expect(page.get_by_role("heading", name="Daily working queue · open orders")).to_be_visible()
        expect(page.get_by_text("P-2026-0148")).to_be_visible()
        expect(page.get_by_text("USD 827,850.00").first).to_be_visible()
        page.screenshot(path=str(ROOT / ".local" / "phase5-d1.png"), full_page=True)
        print("D1 open order queue and value: passed")

        page.get_by_role("link", name="A2 · Revenue").click()
        expect(page.get_by_text("USD 1,515,850.00").first).to_be_visible()
        expect(page.get_by_text("USD 688,000.00").first).to_be_visible()
        expect(page.get_by_text("USD 827,850.00").first).to_be_visible()
        page.screenshot(path=str(ROOT / ".local" / "phase5-a2.png"), full_page=True)
        print("A2 bookings, shipped revenue, order book: passed")

        page.get_by_role("link", name="A3 · Cash").click()
        expect(page.get_by_role("heading", name="Deposits not received")).to_be_visible()
        if sql("select deposit_received_amount is null from orders where pi_number='P-2026-0147'") == "t":
            expect(page.get_by_text("P-2026-0147")).to_be_visible()
        expect(page.get_by_text("missing amounts").first).to_be_visible()
        print("A3 payment milestones and unknown-amount disclosure: passed")

        page.get_by_role("link", name="B1 · Agents").click()
        expect(page.get_by_text("USD 688,000.00").first).to_be_visible()
        expect(page.get_by_text("Market size bands are not yet in the source data.")).to_be_visible()
        print("B1 net-after-commission ranking and confidence disclosure: passed")

        page.get_by_role("link", name="F1 · Documents").click()
        expect(page.get_by_role("heading", name="Waiting now")).to_be_visible()
        expect(page.get_by_role("heading", name="Print to release by document type")).to_be_visible()
        print("F1 document throughput: passed")

        page.locator('select[name="country"]').select_option("IN")
        page.locator('select[name="region"]').select_option("south_asia")
        page.get_by_role("button", name="Apply filters").click()
        page.wait_for_url("**country=IN**")
        assert "country=IN" in page.url and "region=south_asia" in page.url
        page.get_by_role("link", name="D1 · Order book").click()
        assert "country=IN" in page.url and "region=south_asia" in page.url
        print("Shared filters persist across reports: passed")

        deal_id = sql("select deal_id from orders where pi_number='P-2026-0147'")
        page.goto(BASE + "/deals/" + deal_id + "/order")
        deposit = page.locator('form:has(button:has-text("Record deposit"))')
        if deposit.count():
            deposit.locator('input[name="amount"]').fill("206400.00")
            deposit.get_by_role("button", name="Record deposit").click()
            expect(page.get_by_text("Deposit received", exact=True).first).to_be_visible()
        assert sql("select deposit_received_amount from orders where pi_number='P-2026-0147'") == "206400.00"
        assert sql("select project_stage from deals where id='" + deal_id + "'") == "accepted"
        page.goto(BASE + "/reports/a3")
        expect(page.get_by_text("USD 206,400.00").first).to_be_visible()
        page.goto(BASE + "/reports/a2")
        expect(page.get_by_text("USD 206,400.00").first).to_be_visible()
        print("Recorded deposit appears in cash reports without regressing project stage: passed")

        assert not errors, errors
    finally:
        browser.close()
