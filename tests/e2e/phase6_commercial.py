"""Commission accrual at confirmation and G7 refusal on disposable example data."""

import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Commission check requires a disposable _e2e database")
BASE = env["AUTH_URL"].rstrip("/")
PSQL = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"
def sql(query: str):
    result = subprocess.run([str(PSQL), "-d", env["DATABASE_URL"], "-At", "-v", "ON_ERROR_STOP=1", "-c", query],
                            capture_output=True, text=True, check=True)
    return result.stdout.strip()

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page()
    try:
        page.goto(BASE + "/login")
        page.get_by_label("Email").fill(env["SEED_ADMIN_EMAIL"])
        page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url(BASE + "/")
        deal_id = sql("select deal_id from orders where pi_number='P-2026-0148'")
        page.goto(BASE + "/deals/" + deal_id + "/order")
        if sql("select po_verified_at is not null from orders where pi_number='P-2026-0148'") == "f":
            page.locator('input[name="verifiedLineByLine"]').check()
            page.get_by_role("button", name="Verify customer PO").click()
            expect(page.get_by_text("Customer PO verified")).to_be_visible()
        if sql("select sales_stage from deals where id='" + deal_id + "'") != "won":
            page.get_by_role("button", name="Mark deal won").click()
            expect(page.get_by_text("Deal marked won")).to_be_visible()
        result = sql("""select c.model || '|' || c.accrued_amount || '|' ||
                        (c.accrued_at is not null)::text
                        from commissions c join orders o on o.id=c.order_id
                        where o.pi_number='P-2026-0148'""")
        assert result == "markup|0.00|true", result
        page.goto(BASE + "/commissions")
        expect(page.get_by_text("P-2026-0148").first).to_be_visible()
        if sql("""select claimed_amount is null from commissions c join orders o on o.id=c.order_id
                  where o.pi_number='P-2026-0148'""") == "t":
            page.get_by_role("button", name="Record claim").click()
            expect(page.get_by_text("Commission claim recorded")).to_be_visible()
        page.get_by_role("button", name="Settle · G7").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G7: Confirm relationship/model and machine acceptance")
        assert sql("""select settled_at is null from commissions c join orders o on o.id=c.order_id
                      where o.pi_number='P-2026-0148'""") == "t"
        print("Commission accrued as zero at order confirmation; G7 blocks settlement before acceptance: passed")
    finally:
        browser.close()
