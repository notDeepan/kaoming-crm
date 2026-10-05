"""Offline /cjk-pdf-test checks for the generated Phase 3 example PDFs."""

import re
import unicodedata
from io import BytesIO
from pathlib import Path

import pypdfium2 as pdfium
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
examples = [
    ("PI", "P-2026-0147-pi.pdf", ("訂單", "訂單號碼", "核覆", "經辦")),
    ("MI", "M-2026-0147-mi.pdf", ("製令單", "製令單號", "生管", "核覆", "經辦")),
    ("Spec", "M-2026-0147-spec-sheet.pdf", ("製造規格表", "製令單號", "生管", "核覆", "經辦")),
]

for label, filename, expected in examples:
    data = (ROOT / ".local" / filename).read_bytes()
    reader = PdfReader(BytesIO(data))
    text = unicodedata.normalize("NFKC", "\n".join(page.extract_text() or "" for page in reader.pages))
    compact = "".join(text.split())
    positions = [compact.index(term) for term in expected]
    # PDF text extraction follows content-stream order, which puts the spec title
    # after its metadata. The sign-off row remains ordered in each document.
    if label != "Spec":
        assert positions == sorted(positions), (label, expected, positions)
    else:
        assert positions[2:] == sorted(positions[2:]), (label, expected, positions)
    assert re.search(r"115\.\d{2}\.\d{2}", compact), label
    fonts = [str(font.get_object().get("/BaseFont", ""))
             for page in reader.pages for font in page["/Resources"]["/Font"].values()]
    assert any("NotoSansCJKtc-Regular" in font for font in fonts), (label, fonts)
    raster = pdfium.PdfDocument(data)[0].render(scale=1.5).to_pil().convert("L")
    header = raster.crop((0, 0, raster.width, raster.height // 3))
    ink = sum(header.histogram()[:180])
    assert ink > 1000, (label, ink)
    print(f"{label}: ordered Chinese text, ROC date, embedded Noto font and header ink passed ({ink} dark pixels)")
