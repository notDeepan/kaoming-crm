---
name: schema-change
description: Make a database schema change safely — Drizzle schema, migration, seed and tests together. Use whenever adding or altering a table, column, enum or constraint.
disable-model-invocation: true
allowed-tools: Bash(npm run db:*) Bash(npm run test*) Read Edit Write Grep Glob
---

## Current schema files
!`ls -1 src/db/schema/ 2>/dev/null`

## Pending migrations
!`ls -1 drizzle/ 2>/dev/null | tail -5`

## Procedure

1. Re-read the relevant section of @docs/02-data-model.md before changing anything.
2. Edit the Drizzle schema in `src/db/schema/`. One file per domain area.
3. Confirm against the spec: every table has `id uuid`, `created_at`, `updated_at`,
   `created_by`, `updated_by`, `deleted_at`. Money is `numeric(14,2)`. Dates are
   `timestamptz`.
4. Run `npm run db:generate` and **read the generated SQL** before applying it. Reject
   anything that drops a column holding business data.
5. Update `src/db/seed.ts` so the seed still runs.
6. Run `npm run db:migrate && npm run db:seed && npm run test`.
7. Report what changed and what the migration does to existing rows.

## Never
- Never edit an already-applied migration. Write a new one.
- Never drop a column on `deals`, `quotations`, `orders`, `work_orders`, `documents`,
  `cases` or `case_messages` without asking first.
- Never add an enum value in the database without adding it to the TypeScript const in
  `src/db/enums.ts`.
