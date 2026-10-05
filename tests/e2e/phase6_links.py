"""Verify manual leakage and claim to case linking in the disposable E2E database."""
import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Browser check requires a disposable _e2e database")
BASE = env["AUTH_URL"].rstrip("/")
PSQL = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"

def sql(query: str) -> str:
    return subprocess.run([str(PSQL), "-d", env["DATABASE_URL"], "-At", "-v", "ON_ERROR_STOP=1", "-c", query],
                          capture_output=True, text=True, check=True).stdout.strip()

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    try:
        page.goto(BASE + "/login")
        page.get_by_label("Email").fill(env["SEED_ADMIN_EMAIL"])
        page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url(BASE + "/")

        deal_id = sql("select deal_id from orders where pi_number='P-2026-0147'")
        page.goto(BASE + "/leakage")
        expect(page.get_by_role("heading", name="Margin leakage register")).to_be_visible()
        form = page.locator('form:has(button:has-text("Record leakage"))')
        form.locator('select[name="dealId"]').select_option(deal_id)
        form.locator('select[name="category"]').select_option("travel_absorbed")
        form.locator('input[name="incurredOn"]').fill("2026-10-03")
        form.locator('input[name="amount"]').fill("125.00")
        form.locator('input[name="currency"]').fill("USD")
        form.locator('textarea[name="notes"]').fill("E2E manual leakage check")
        form.get_by_role("button", name="Record leakage").click()
        expect(page.get_by_role("status")).to_contain_text("Leakage recorded")
        assert sql("select count(*) from leakage_entries where deal_id='" + deal_id + "' and notes='E2E manual leakage check'") == "1"
        print("Manual leakage entry: passed")

        claim_id, case_id = sql("select c.id||'|'||s.id from claims c join cases s on s.partner_id=c.partner_id and (s.machine_id=c.machine_id or s.machine_id is null) where c.claim_number='CL-2026-0001' order by s.case_number limit 1").split("|")
        page.goto(BASE + "/claims/" + claim_id)
        form = page.locator('form:has(button:has-text("Link case"))')
        expect(form).to_be_visible()
        form.locator('select[name="caseId"]').select_option(case_id)
        form.get_by_role("button", name="Link case").click()
        expect(page.get_by_role("link", name="CS-2026-0001")).to_be_visible()
        assert sql("select linked_case_id from claims where id='" + claim_id + "'") == case_id
        print("Claim to case link: passed")
    finally:
        browser.close()
