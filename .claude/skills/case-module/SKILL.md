---
name: case-module
description: Build or change the bilingual after-sales case module — cases, message threads, translation review, state log. Use for any work on cases, case messages, or translation.
allowed-tools: Read Edit Write Grep Glob Bash(npm run test*)
---

Specification: @docs/10-aftersales-cases.md · Schema: @docs/02-data-model.md §4.14

## Invariants — do not violate these

1. **`source_text` is never overwritten.** It is the message exactly as received. The
   translation lives in `translated_text`.
2. **`sent_at` stays null until a person has reviewed the translation.** Never send an
   unreviewed machine translation.
3. **Every status change writes a `case_state_log` row.** Time-in-state is the point of
   the module; a transition that does not log is a bug.
4. `translation_source` records `machine`, `machine_edited` or `human`. After a few months
   this answers whether the translation assist is saving real time.
5. Gate G13: a case cannot close without a resolution and with any message missing its
   translation.

## Translation

Machine translation **is** correct here — unlike factory documents. Draft automatically,
present for edit, store both versions. The difference is that a human reviews before
sending and the vocabulary is one-off prose rather than controlled terminology.

## Links
- `part_failure` → `parts_requests`
- `onsite_repair`, `onsite_training` → `site_visits`, and therefore the condition photo set
  required by gate G10
- `repair_return_dispute` → the original visit or parts request

## Design for later access
After-sales may eventually work in the system directly in Chinese. Assume no schema or UI
dependency on international sales being the only author, and keep the `sales` and `service`
roles distinct from the start.
