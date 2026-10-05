# 09 · Anti-requirements

Things that will look tempting and must not be built.

- **No ERP integration.** It was ruled out. Do not build connectors or scrapers.
- **No accessory compatibility rules engine.** Fit is decided case by case with the
  design team. Build the `design_reviews` gate, not a rules engine.
- **No end-customer portal.** Kao Ming does not have that relationship.
- **No attempt to collect end-customer pricing from mark-up agents.** It would damage
  the relationship. Capture what surfaces at FAT and in lost deals.
- **No percentage-complete progress field.** Expected completion date only. See §4.7.
- **No total-level-only discount.** Line-level capture, always.
- **No scorecard before four quarters of data.** A ranking built on one thin quarter
  will be disproved and the project will not recover from it.
- **No machine translation for factory documents.** Chinese item names come from the
  item master. The one place machine translation belongs is after-sales correspondence,
  where a human reviews before sending — see `10-aftersales-cases.md`.
- **No transactional data migration.** See `01-domain.md` §6.
- **No mobile application.** Five or six users, all at desks. A responsive layout is enough.
- **No forwarder integration.** Space is booked by email and phone. Record the outcome;
  do not attempt to book programmatically.
