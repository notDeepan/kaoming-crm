"""Check FAT photo capture before a machine exists, in the disposable E2E database."""
import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Photo browser check requires a disposable _e2e database")
BASE = env["AUTH_URL"].rstrip("/")
PSQL = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"

def sql(query: str) -> str:
    return subprocess.run([str(PSQL), "-d", env["DATABASE_URL"], "-At", "-v", "ON_ERROR_STOP=1", "-c", query],
                          capture_output=True, text=True, check=True).stdout.strip()

deal_id = sql("select deal_id from orders where pi_number='P-2026-0148'")
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
        open_button = page.get_by_role("button", name="Open shipment record")
        if open_button.count():
            open_button.click()
        expect(page.get_by_role("heading", name="FAT and loading condition photos")).to_be_visible()
        form = page.locator('form:has(button:has-text("Add shipment photo"))')
        form.locator('select[name="capturePoint"]').select_option("fat")
        form.locator('input[name="photo"]').set_input_files(str(ROOT / ".local" / "phase7-d2.png"))
        form.locator('input[name="caption"]').fill("E2E pre-shipment FAT image")
        form.get_by_role("button", name="Add shipment photo").click()
        expect(page.get_by_role("status")).to_contain_text("Shipment condition photo added")
        expect(page.get_by_role("link", name="FAT · phase7-d2.png · E2E pre-shipment FAT image")).to_be_visible()
        assert sql("select count(*) from condition_photos p join shipments s on s.id=p.shipment_id join orders o on o.id=s.order_id where o.pi_number='P-2026-0148' and p.capture_point='fat' and p.machine_id is null") == "1"
        print("FAT photo attached before machine registration: passed")
    finally:
        browser.close()
