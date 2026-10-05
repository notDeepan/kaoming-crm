"""Exercise late-booking cause capture and D2, restoring E2E fixture dates afterward."""
import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Booking browser check requires a disposable _e2e database")
BASE = env["AUTH_URL"].rstrip("/")
PSQL = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"

def sql(query: str) -> str:
    return subprocess.run([str(PSQL), "-d", env["DATABASE_URL"], "-At", "-v", "ON_ERROR_STOP=1", "-c", query],
                          capture_output=True, text=True, check=True).stdout.strip()

deal_id, shipment_id, original_due, original_cause = sql(
    "select o.deal_id||'|'||s.id||'|'||s.booking_due_by||'|'||coalesce(s.booking_delay_cause::text,'') "
    "from shipments s join orders o on o.id=s.order_id where o.pi_number='P-2026-0147'").split("|")
assert original_due and len(original_due) == 10
try:
    sql("update shipments set booking_due_by='2026-09-01' where id='" + shipment_id + "'")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        try:
            page.goto(BASE + "/login")
            page.get_by_label("Email").fill(env["SEED_ADMIN_EMAIL"])
            page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
            page.get_by_role("button", name="Sign in").click()
            page.wait_for_url(BASE + "/")
            page.goto(BASE + "/deals/" + deal_id + "/delivery")
            form = page.locator('form:has(button:has-text("Save delay cause"))')
            expect(form).to_be_visible()
            form.locator('select[name="delayCause"]').select_option("payment_outstanding")
            form.get_by_role("button", name="Save delay cause").click()
            expect(page.get_by_role("status")).to_contain_text("Booking delay cause recorded")
            assert sql("select booking_delay_cause from shipments where id='" + shipment_id + "'") == "payment_outstanding"
            page.goto(BASE + "/reports/d2")
            expect(page.get_by_text("Cause payment outstanding")).to_be_visible()
            print("Booking delay cause captured and shown on D2: passed")
        finally:
            browser.close()
finally:
    cause = "NULL" if not original_cause else "'" + original_cause + "'"
    sql("update shipments set booking_due_by='" + original_due + "', booking_delay_cause=" + cause + " where id='" + shipment_id + "'")
