# KAO MING CRM — Sales & Channel Management

Internal Sales & Channel Management System for **KAO MING Machinery Industrial Co., Ltd. (高明精機)**,
a Taiwanese manufacturer of CNC double-column machining centres, 5-axis and multi-face gantry
machines, vertical machining centres and hydraulic radial drills.

It replaces a spreadsheet process for managing an overseas agent and dealer network, in English and
Traditional Chinese. Capital-equipment deals run six to eighteen months, and **the agent — not the
end customer — is the primary commercial object**, which is the single biggest departure from a
conventional CRM and shapes the whole data model.

> **Note on the specification.** This system is built against an internal build specification and
> KAO MING's product catalogues. Those documents are company-confidential and are deliberately not
> published in this repository. The code stands on its own.

---

## What's built

**Phase 1 — Foundation** (complete)

- Users, roles and permissions, session authentication (argon2), account lockout
- Append-only audit log; every create/update/delete, login and export recorded
- Bilingual shell with per-user EN ⇄ 繁中 switching, no re-login; every string in a resource file
- Agents — territories, commercial terms, contact cadence, derived performance panel, overdue and
  agreement-expiry warnings, territory-overlap detection
- Customers and contacts, with duplicate warnings and polymorphic contact parents
- Global search across agents, customers, contacts and serial numbers
- A reusable list-view framework — column selection, sorting, multi-field filtering, saved views
- Excel export from every list, and two-phase Excel import (validate & preview, then commit) with a
  per-row error report and duplicate handling

**Phase 2 — Catalogue & quotation** (core complete)

- `machine_series` / `machine_model` with series inheritance: constant specification fields live on
  the series, size-varying ones on the model, and values are flattened at quote time
- Options with per-series and per-model applicability and mutually exclusive groups — availability
  is real, not decorative
- Unit conversion service (mm ↔ inch, kg ↔ lb, kW ↔ HP, Nm ↔ ft-lb, tonnes ↔ kg/m² ↔ lb/ft²);
  values are stored with an explicit unit and converted only for display
- Quotation builder — auto-filled header and specification block, catalogue and custom lines,
  deferred prices that print as `TBD` and never count as zero, optional discount with a
  show-on-print toggle
- Quotation numbering, revisioning, and a frozen configuration snapshot at issue: **a catalogue
  change can never alter an issued quotation**
- A single-page printable quotation matching KAO MING's existing template

**Not built yet:** enquiries and opportunities, the installed-machine registry, document management
with per-document access control, the knowledge library, dashboards and reports.

---

## Engineering rules

These are load-bearing, not stylistic:

1. Documents are served only through an authenticated, authorised route that streams the file —
   never a static or guessable path.
2. Money is decimal with an explicit currency. Never a float, never a bare amount column.
3. Issued quotations are immutable; the configuration is snapshotted as JSON at issue time.
4. No `organization_id` — this is one company. Multi-tenancy was removed deliberately.
5. Soft delete everywhere (`deletedAt`). Append-only logs are never deleted either.
6. Maximum six required fields per entity.
7. Bilingual data fields are two columns, not one field plus a language flag.
8. Every list view exports to Excel.
9. Server-side validation on everything; client validation is convenience only.
10. Timestamps stored in UTC, displayed in local time.

### Two portability decisions worth knowing

The same Prisma schema runs on SQLite locally and PostgreSQL on the server, so:

- **No Prisma enums** — unsupported on SQLite. Enums are `String` columns validated by Zod unions in
  `src/lib/enums.ts`, which also satisfies the spec's "enums stored as readable strings".
- **No scalar lists** — also unsupported on SQLite. Queryable multi-selects are child tables
  (`agent_territory`, `model_option_applicability`); non-queried ones are JSON columns.

---

## Run it locally

No cloud services, no internet needed at runtime. SQLite and local files.

```bash
npm install
```

```bash
npx prisma migrate dev
```

```bash
npm run seed
```

```bash
npm run dev
```

Then open http://localhost:3000 and sign in as the administrator:

```
deepan / admin12345
```

Other seeded accounts (`lchen`, `mkaya`, `awong`, `jhsu`, `director`) use `changeme123` and are
prompted to set their own password at first sign-in. **These are development credentials for seed
data only.** All seeded agents, customers and contacts are fictional.

To also load a demo machine and options so the quotation flow is usable:

```bash
npx tsx prisma/seedCatalogueDemo.ts
```

> The demo catalogue carries **placeholder** specifications and null prices. Real model codes,
> specifications and prices must be loaded from KAO MING's catalogues before any real quotation is
> sent — none are invented in this codebase.

---

## Verify it

```bash
npm run typecheck
```

```bash
npm run build
```

```bash
npm test
```

The Playwright suite covers the acceptance criteria: role-gated sign-in, full-interface language
switching, agent contact-cadence overdue detection, Excel export, Excel import with deliberately
invalid rows, the unit conversion service, and an end-to-end quotation — built, issued and printed,
with an option that is correctly unavailable for its machine series.

---

## Deploying to a server

The schema is PostgreSQL-compatible with no SQLite-only features. Switch the Prisma datasource
`provider` to `postgresql`, then:

```bash
docker compose up --build
```

Documents are written to a persistent volume outside the web root and served only through an
authorised application route.

---

## Layout

| Path | What's in it |
|---|---|
| `prisma/schema.prisma` | All 24 tables, covering every phase |
| `prisma/seed.ts` | Users, agents, customers, contacts |
| `src/lib/enums.ts` | Single source of truth for every enum |
| `src/lib/units.ts` | Unit conversion service |
| `src/lib/spec.ts` | Machine specification resolution and flattening |
| `src/components/` | UI kit, the machine nameplate, the list-view framework |
| `src/server/` | Server-only data access |
| `src/app/**/actions.ts` | Server actions — validation, permissions, audit |
| `messages/` | Every user-visible string, EN and 繁中 |
| `tests/` | Playwright acceptance and unit suites |

---

## Design

The interface is built as an instrument rather than a dashboard: compact rows sized for scanning
fifty records, monospace with tabular figures for every identifier and number so values line up for
comparison, a six-value palette in which the brand red is reserved for identity and meaningful state
only, and one signature element — a dark machine nameplate echoing the anodized plate riveted to
every KAO MING machine. Keyboard navigable throughout, with visible focus and reduced motion
respected.
