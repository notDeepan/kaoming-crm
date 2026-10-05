"""Render the supplied Q-2026-0147 quotation PDF for visual review."""

import os
from pathlib import Path
from urllib.parse import urlparse

import pypdfium2 as pdfium
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
env_file = Path(os.environ.get("E2E_ENV_FILE", ROOT / ".local" / "e2e.env"))
env = dict(line.split("=", 1) for line in env_file.read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("PDF review requires an isolated _e2e database")
base = env["AUTH_URL"].rstrip("/")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    page = browser.new_page()
    page.goto(base + "/login")
    page.get_by_label("Email").fill(env["SEED_ADMIN_EMAIL"])
    page.get_by_label("Password").fill(env["SEED_ADMIN_PASSWORD"])
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url(base + "/")
    page.goto(base + "/deals")
    page.get_by_role("link", name="Q-2026-0147").click()
    path = page.locator('a:has-text("Print quotation")').get_attribute("href")
    response = page.context.request.get(base + path)
    assert response.ok, response.status
    pdf_bytes = response.body()
    (ROOT / ".local" / "Q-2026-0147-r3.pdf").write_bytes(pdf_bytes)
    pdf = pdfium.PdfDocument(pdf_bytes)
    for index in range(len(pdf)):
        rendered = pdf[index].render(scale=1.7).to_pil()
        rendered.save(ROOT / ".local" / f"Q-2026-0147-r3-page-{index + 1}.png")
    print(f"Rendered Q-2026-0147 r3: {len(pdf)} page(s)")
    browser.close()
