# Kao Ming International Sales CRM — build package

Everything needed to build the system. Written for an AI coding agent.

## Running the application

For a public GitHub repository and an online test instance, see
[`docs/cloud-preview.md`](docs/cloud-preview.md). GitHub displays the source;
the interactive CRM runs on a web service with a PostgreSQL database.

The application follows the order in `docs/07-build-plan.md`. The current
implementation has working flows for foundation, quotation, Chinese
PI/MI/specification documents, production review, logistics/shipment, claims, all
18 specified report routes, spare parts enquiries, bilingual cases, commission
accrual, leakage and penalty exposure. Phase reviews in `docs/phase-reviews/` distinguish software
checks from real-data and physical paper acceptance. Printed PI and MI acceptance
by 生管 and printed 出貨單 acceptance by the supervisor and warehouse remain open.
The original German claim register and historical ERP exports have not been supplied.
They are not required to start entering current records or making quotations.
Administrators and managers can upload a per-model proposal PDF and edit bilingual
base specifications on the machine-model screen; uploaded PDFs are stored durably and
served only to signed-in users.

For a fresh local installation, use Node.js 22 or newer and PostgreSQL 16.
Set `DATABASE_URL`, `AUTH_SECRET`, `SEED_ADMIN_EMAIL`, and
`SEED_ADMIN_PASSWORD` in your environment, then run:

```sh
npm ci
npm run db:migrate
npm run db:bootstrap-admin
npm run dev
```

Open `http://localhost:3000/login`. The clean bootstrap creates the administrator
and fixed document categories only. It does not load example agents, products,
prices, deals, or quotations. Never run `db:seed` against a database used for
real work. The seed command accepts disposable `*_e2e` databases; reseeding the
separate `kaoming` demo database requires `ALLOW_EXAMPLE_SEED=1`. The supplied
CSVs are worked examples, not historical ERP transactions.

After signing in, use the home-screen checklist: add an agent, a machine model,
and bilingual item records; download the price-list template and publish a price
book; then create a deal and start its quotation. Entering these records builds
the CRM's reusable data over time. Prices are controlled through published price
books, and issuing a quotation still requires a confirmed design review and a
technical proposal PDF. Past ERP transactions are not required for this workflow,
but reports will contain only records entered into this CRM until historical
reporting data is supplied.
See `docs/first-use.md` for the step-by-step operator guide.

For Docker Compose, set `DB_PASSWORD`, `AUTH_SECRET`, `AUTH_URL`, and `CRM_DOMAIN`
in `.env`, then run `docker compose up --build`. A one-time migration container
must finish successfully before the app starts. The `jobs` container waits for the app health check,
then runs penalty recalculation and closed-quarter snapshots on startup and daily
at 02:00 Taipei time; a failed cycle retries after an hour. Use
`npm run db:seed` from the development checkout only in a disposable example
database; the runtime image intentionally omits example seed files. For a fresh office
database, pass `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to the one-time
`db:bootstrap-admin` command without loading examples. `CRM_DOMAIN=localhost` is suitable for a local
preview; set the real DNS name and matching `AUTH_URL` for the office deployment.

Checks: `npm test`, `npm run lint`, and `npm run build`. A running PostgreSQL server
is required to verify migrations, seeding, sign-in, and the data screens end to end.
After seeding, `npm run db:smoke` checks the worked examples and optional administrator.
Phase 1 technical acceptance passed on 2026-10-01 with PostgreSQL 16.15 and the supplied
worked examples; see `docs/phase-reviews/phase-1.md` for evidence and remaining data work.
Phase 2 acceptance with example data is recorded in `docs/phase-reviews/phase-2.md`.
Phase 3 software checks and the outstanding paper gate are recorded in
`docs/phase-reviews/phase-3.md`. Print samples are in
`docs/phase-reviews/print-samples/` and are labelled as examples.
The browser regression in `tests/e2e/phase1.py` requires a seeded disposable database
whose name ends in `_e2e`, a matching `.local/e2e.env`, Python Playwright from
`tests/e2e/requirements.txt`, and Chrome. It refuses to run against the main database.
`tests/e2e/phase2.py` covers quotations and imports. The database guard is checked by
`tests/e2e/issued-immutability.sql`; `tests/e2e/pdf_review.py` renders the worked
example PDF for visual inspection. These also require the disposable database.
Phase 3 browser checks run in order: `phase3_configuration.py`, `phase3_pi.py`,
`phase3_mi.py`, `phase3_revision.py`, and `phase3_proposal.py`. After `phase2.py`
has created its example deal, `phase3_consistency.py` compares its issued proposal
with the generated factory specification. `cjk_pdf_check.py` verifies Chinese PDF
text, ROC dates, embedded Noto font, and rasterized header ink.
`phase3_model_assets.py` checks model literature upload, damaged-file refusal,
authenticated retrieval, base-spec editing, and draft proposal invalidation.
Phase 4–7 checks are in `tests/e2e/phase4.py`, `phase4_photos.py`,
`phase4_booking_cause.py`, `phase4c.py`, `phase5.py`, `phase6_core.py`,
`phase6_commercial.py`, `phase6_links.py`, `phase7.py`, and `nightly.py`. They use the
disposable `_e2e` database and should not be run against live customer data.

`npm run jobs:nightly` recalculates penalty exposure for open orders with issued
work orders, using the latest filled progress review. The Compose `jobs` service
schedules it; the command also remains available for an operator rerun.
`npm run jobs:quarterly` writes immutable snapshots for the last closed quarter.
It is safe to retry: an existing partner/quarter row is left intact. Snapshot
tiers remain unrated until four consecutive quarters and the missing market-size
and scoring inputs are supplied. The Compose worker invokes it daily so a restart
or transient failure can catch up within the last closed quarter.

Uploaded PDFs and photos are stored in PostgreSQL. The Compose stack has no active
object-storage dependency. `scripts/backup-compose.ps1` quiesces the app and worker,
creates a custom-format PostgreSQL dump in ignored `backup/`, writes its SHA-256
checksum, and restarts them. Copy each backup off the host to encrypted storage.
See `docs/deployment-readiness.md` for restore rehearsal and release gates.

Changes to business tables are captured by PostgreSQL triggers in the append-only
`audit_log` table. Admins can inspect the latest entries at `/settings/audit`.
Password hashes, file bodies and login-attempt keys are excluded from audit
payloads. This log begins at migration 0020; it does not reconstruct earlier
history. `tests/e2e/audit.sql` checks capture, redaction and immutability in a
transaction that rolls back.

In this checkout, a workspace-local PostgreSQL 16.15 installation and cluster live under
the ignored `.local/` directory. `.env.local` points to the clean `kaoming_live`
database. The example database `kaoming` and its environment copy
`.local/demo.env` remain separate for reference. Start
the database after a reboot with:

```powershell
& '.\.local\postgresql16\bin\pg_ctl.exe' -D '.\.local\pgdata' -l '.\.local\postgres.log' -o '-h 127.0.0.1 -p 5432' -w start
```

This local setup is for development; Docker Compose remains the intended deployment stack.
For the current local-only setup, run `npm run build` once, then start the app with
`npm run start -- -H 127.0.0.1 -p 3000`. In a second terminal run
`npm run jobs:worker:local`; it loads `.env.local`, performs the first scheduled
cycle immediately, then runs daily at 02:00 Taipei time. Keep both terminals open.
For the current local-only setup, run `powershell -File scripts/backup-local.ps1`
to save a custom-format database dump and SHA-256 checksum in ignored `backup/`.
The app can stay running. Copy any backup you need to keep to encrypted storage
outside this computer.

---

## Read in this order

1. **`CLAUDE.md`** — project memory. Loaded every session automatically.
2. **`docs/01-domain.md`** — the business. Read before writing any code; the domain is
   unusual and getting the vocabulary wrong produces a system nobody recognises.
3. **`docs/07-build-plan.md`** — the phases. Build in order. Do not build ahead.
4. **`docs/prompts/PLAYBOOK.md`** — the prompt sequence, phase by phase.

Everything else is reference, consulted when the relevant phase begins.

---

## What is in this folder

```
kaoming-crm/
├── CLAUDE.md                   project memory — conventions, commands, domain traps
├── .claude/
│   ├── skills/                 11 skills — procedures for the risky operations
│   ├── agents/                 spec-auditor, an independent reviewer
│   └── settings.json
├── docs/
│   ├── 01-domain.md            the business, the vocabulary, the constraints
│   ├── 02-data-model.md        31 tables, typed
│   ├── 03-business-rules.md    gates G1–G13, derived rules, enumerations
│   ├── 04-documents.md         bilingual PDF generation
│   ├── 05-reports.md           16 reports, their tiles and dependencies
│   ├── 06-screens.md           33 screens, mapped to the wireframes
│   ├── 07-build-plan.md        8 phases with acceptance criteria
│   ├── 08-decisions.md         12 open decisions and their defaults
│   ├── 09-anti-requirements.md what must not be built
│   ├── 10-aftersales-cases.md  the bilingual case module
│   ├── 11-price-book.md        six-monthly price list import
│   ├── 12-logistics.md         shipment flow and the corrected parts enquiry
│   ├── 13-claims-disputes.md   commercial claims and the visit briefing pack
│   └── prompts/PLAYBOOK.md     how to drive the build
├── reference/
│   ├── screens/                33 wireframes, one per screen
│   ├── diagrams/               lifecycle, phase flows, report layouts
│   └── forms/                  the real Chinese forms, extracted with coordinates
├── data/
│   ├── seed/                   seed data and CSV templates
│   ├── i18n/zh-Hant.json       the Traditional Chinese interface strings
│   └── import-templates/       the price list upload format
└── scaffold/                   package.json, docker-compose, tsconfig, env template
```

---

## First session

```
Read docs/01-domain.md and docs/07-build-plan.md in full, then summarise back to me
in under 300 words: the domain, the eight phases, and the three things you think are
most likely to be got wrong. Do not write any code yet.
```

Check the summary before going further. If it misdescribes the domain, fix `CLAUDE.md`
and the `domain-context` skill first — everything downstream inherits that
misunderstanding.

---

## Ground rules

- Build in phase order. Building ahead is a defect, not enthusiasm.
- Where a decision in `docs/08-decisions.md` is unresolved, implement the stated default
  and leave a `// DECISION-PENDING: <id>` comment. Never invent a business rule.
- Read `docs/09-anti-requirements.md` before proposing anything not in the specification.
- The Chinese terms in these documents are the real names used inside the company. Keep
  them as domain vocabulary. Do not translate `製令單` to `work_order` in the interface.
- Commit after every accepted change. Use plan mode for anything touching the schema.

---

## Scale

Five to six users. Fifty-nine agents. Roughly 100 machine orders a year, each worth
US$250k–900k. Sales cycles of ten to twelve months.

This is not a scale problem. Optimise for correctness and clarity, never for throughput.
