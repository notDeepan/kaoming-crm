"""Example claims and settlement gates on a disposable E2E database after phase4.py."""

import os
import subprocess
import unicodedata
from datetime import datetime
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from playwright.sync_api import expect, sync_playwright
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Claims browser check requires a disposable _e2e database")
BASE = env["AUTH_URL"].rstrip("/")
PSQL = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"
today = datetime.now(ZoneInfo("Asia/Taipei")).date().isoformat()


def sql(command: str) -> str:
    result = subprocess.run([str(PSQL), "-d", env["DATABASE_URL"], "-At", "-v", "ON_ERROR_STOP=1", "-c", command], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    try:
        page.goto(BASE + "/login")
        page.get_by_label("Email").fill(env["SEED_ADMIN_EMAIL"])
        page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url(BASE + "/")
        page.goto(BASE + "/claims")
        page.locator('select[name="machineId"]').select_option(label="KMC-E2E-0147 · KMC-637AS · CP Agencies")
        page.locator('input[name="receivedAt"]').fill(today)
        page.locator('input[name="sourceReference"]').fill("Example Germany visit claim email")
        page.locator('select[name="category"]').select_option("late_delivery")
        page.locator('textarea[name="description"]').fill("Late shipment and customer cost claim")
        page.locator('input[name="claimedAmount"]').fill("7500")
        page.locator('input[name="claimedCurrency"]').fill("EUR")
        page.locator('select[name="responsibility"]').select_option("kao_ming")
        page.get_by_role("button", name="Register claim").click()
        expect(page.get_by_text("Claim registered")).to_be_visible(timeout=15000)
        claim_id = page.url.rsplit("/", 1)[-1].split("?")[0]
        assert sql("SELECT claim_number FROM claims WHERE id='" + claim_id + "'") == "CL-" + today[:4] + "-0001"
        print("Claim register, machine/agent inheritance and number: passed")

        href = page.get_by_role("link", name="Print agent briefing PDF").get_attribute("href")
        response = page.context.request.get(BASE + href)
        assert response.ok, response.status
        pdf = PdfReader(BytesIO(response.body()))
        assert 1 <= len(pdf.pages) <= 2
        text = "".join(unicodedata.normalize("NFKC", p.extract_text() or "") for p in pdf.pages)
        assert "POSITIONNOTSTATED" in "".join(text.split()), text[:500]
        print("Bilingual agent briefing flags a missing position in 1-2 pages: passed")

        line_form = page.locator('form:has(button:has-text("Add claimed item"))')
        line_form.locator('input[name="description"]').fill("Control panel rebuild")
        line_form.locator('input[name="amount"]').fill("4400")
        line_form.get_by_role("button", name="Add claimed item").click()
        expect(page.get_by_text("Claim item added")).to_be_visible()
        line_form = page.locator('form:has(button:has-text("Add claimed item"))')
        line_form.locator('input[name="description"]').fill("Customer goodwill")
        line_form.locator('input[name="amount"]').fill("1000")
        line_form.get_by_role("button", name="Add claimed item").click()
        expect(page.get_by_text("#2 Customer goodwill")).to_be_visible()
        page.reload()
        page.locator('form:has(button:has-text("Record position")) textarea[name="position"]').fill("We will review documented shipment and customer cost evidence before agreeing a settlement.")
        page.get_by_role("button", name="Record position").click()
        expect(page.get_by_text("Position recorded")).to_be_visible()
        page.locator('input[name="nextAction"]').fill("Review freight and delivery evidence with the agent")
        page.get_by_role("button", name="Save next action").click()
        expect(page.get_by_text("Next action recorded")).to_be_visible()
        assert sql("SELECT count(*) FROM claim_lines WHERE claim_id='" + claim_id + "'") == "2"
        print("Itemised claim, position, events and next action: passed")

        settlement = page.locator('form:has(button:has-text("Record settlement"))')
        settlement.locator('select[name="method"]').evaluate('el => el.insertAdjacentHTML("beforeend", "<option value=none>None</option>")')
        settlement.locator('select[name="method"]').select_option("none")
        settlement.locator('input[name="amount"]').fill("0")
        settlement.get_by_role("button", name="Record settlement").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G19:")
        settlement = page.locator('form:has(button:has-text("Record settlement"))')
        settlement.locator('select[name="method"]').select_option("cash")
        settlement.locator('input[name="amount"]').fill("7500")
        settlement.locator('input[name="fxRate"]').fill("1.10")
        settlement.locator('input[name="fxRateDate"]').fill(today)
        settlement.get_by_role("button", name="Record settlement").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("G20:")
        settlement = page.locator('form:has(button:has-text("Record settlement"))')
        settlement.locator('select[name="method"]').select_option("credit_note")
        settlement.locator('input[name="amount"]').fill("7500")
        settlement.locator('input[name="fxRate"]').fill("1.10")
        settlement.locator('input[name="fxRateDate"]').fill(today)
        settlement.locator('select[name="leakageCategory"]').select_option("late_delivery_penalty")
        settlement.locator('select[name="recoveryStatus"]').select_option("absorbed")
        settlement.locator('input[name="incurredOn"]').fill(today)
        settlement.get_by_role("button", name="Record settlement").click()
        expect(page.get_by_text("Claim settled")).to_be_visible()
        assert sql("SELECT pending_credit FROM claims WHERE id='" + claim_id + "'") == "t"
        assert sql("SELECT count(*) FROM leakage_entries WHERE source_claim_id='" + claim_id + "'") == "1"
        print("G19, G20 and one linked leakage entry: passed")

        page.get_by_role("button", name="Close claim").click()
        expect(page.locator('p[role="alert"]')).to_contain_text("pending credit")
        sql("INSERT INTO orders (deal_id,source_quotation_id,pi_number,customer_po_ref,customer_po_url,order_value,currency) "
            "SELECT d.id,q.id,'P-2026-0148','E2E-CREDIT','/e2e-credit',q.net_total,'USD' "
            "FROM deals d JOIN quotations q ON q.deal_id=d.id WHERE d.deal_number='Q-2026-0148' "
            "AND q.status='issued' ORDER BY q.revision DESC LIMIT 1")
        page.reload()
        page.locator('select[name="orderId"]').select_option(label="P-2026-0148")
        page.get_by_role("button", name="Apply credit").click()
        expect(page.get_by_text("Pending credit applied to order")).to_be_visible()
        page.get_by_role("button", name="Close claim").click()
        expect(page.get_by_text("Claim closed")).to_be_visible()
        assert sql("SELECT pending_credit::text||':'||(applied_to_order_id IS NOT NULL)::text FROM claims WHERE id='" + claim_id + "'") == "false:true"
        print("G21 holds credit until a later agent order, then permits closure: passed")
    finally:
        browser.close()
