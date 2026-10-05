---
name: new-document-type
description: Add a generated PDF document type (quotation, PI, MI, spec sheet, technical proposal, invoice). Use when creating or changing any document template or PDF output.
argument-hint: [doc-type]
allowed-tools: Read Edit Write Grep Glob Bash(npm run test*)
---

Add or modify the document type: $ARGUMENTS

## Rules

1. **Never author content.** Every value comes from `deal_spec_values`, `quotation_lines`
   or the deal record. If a value has no source, add the field to the schema first.
2. Templates live in `src/documents/templates/<doc-type>/` — one `template.tsx` rendering
   to HTML, one `styles.css`.
3. Chinese documents embed Noto Sans TC from `/public/fonts`. **Never rely on a system
   font.**
4. Chinese documents use the ROC calendar: 民國 year = Gregorian − 1911. Format `115.08.13`.
5. Reproduce the layout in @reference/forms/real-forms-layout.md, including the footer
   sign-off blocks 生管 / 核覆 / 經辦. The shop floor rejects anything unfamiliar.
6. Every page footer carries the deal number, revision and issue date.
7. Register the type in `src/documents/registry.ts` and add it to the `docType` enum.
8. Add a snapshot test that renders the PDF, extracts its text, and **asserts the Chinese
   characters are present**. A PDF rendering tofu boxes still has the right byte size.

## After generating
Run `npm run test -- documents` and report which assertions passed. Then run
`/cjk-pdf-test`.
