---
name: cjk-pdf-test
description: Verify Traditional Chinese renders correctly in generated PDFs. Use after touching fonts, templates, Puppeteer config or the Docker image.
allowed-tools: Bash(npm run test*) Bash(node *) Read Glob
---

Chinese PDF rendering fails silently — the file generates, the size looks right, and every
glyph is a box. Verify properly:

1. Generate a PI, an MI and a spec sheet from the seed data.
2. Extract text from each PDF (`pdf-parse` or `pdftotext`).
3. Assert these strings are present and correctly ordered:
   `製令單`, `製造規格表`, `訂單`, `訂單號碼`, `製令單號`, `生管`, `核覆`, `經辦`.
4. Rasterise page 1 of each and confirm ink coverage in the header band is non-zero — this
   catches tofu boxes that still extract as text.
5. Confirm Noto Sans TC is **embedded**, not referenced: the PDF font list must name it.
6. Confirm ROC dates render as `115.09.04`, not `2026-09-04`.

Report pass or fail per document with the extracted strings.
