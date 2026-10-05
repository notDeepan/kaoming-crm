# Kao Ming CRM Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkboxes for tracking.

**Goal:** Deliver a working bilingual CRM foundation with login, role enforcement, and master data management for partners, items, machine models, and price books.

**Architecture:** A single Next.js application owns the interface and server actions. PostgreSQL stores domain data through Drizzle; all writes validate input on the server and record an actor. The app reads the supplied seed examples, while historical ERP analysis remains pending until the real export is available.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, PostgreSQL 16, Drizzle ORM, Auth.js v5, next-intl, Tailwind, Vitest, Docker Compose.

**Spec:** `docs/01-domain.md`, `docs/02-data-model.md` §§4.1–4.3, `docs/03-business-rules.md`, `docs/07-build-plan.md` Phase 1, and `docs/09-anti-requirements.md`.

## Global Constraints

- Kao Ming sells through long-lived partners; a partner is never a lead.
- Money is `numeric(14,2)` in PostgreSQL and integer minor units in TypeScript.
- Every business table has UUID identity, creation/update actor and timestamps, and `deleted_at`.
- UI supports English and Traditional Chinese; Chinese item names come from the item master.
- A quotation will lock its price book version when issued in Phase 2. Phase 1 must preserve the versioned data model.
- No ERP integration or transactional history migration.
- Phase 0 historical analysis requires a real ERP export; worked examples are used for development only.

## Review Focus

- Duplicate partner, item, model, or version codes produce a useful server error and never overwrite an existing row.
- Invalid ISO country and currency codes are refused before insert.
- A user without the right role cannot mutate master data by calling a server action directly.
- A deleted item remains available to historical records but disappears from active selections.
- A price book cannot be published with overlapping effective dates; the more detailed import gate arrives in Phase 2.

---

### Task 1: Application scaffold and verification

**Files:** Copy scaffold configuration into the root; create `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/lib/env.ts`, `vitest.config.ts`, and `src/lib/env.test.ts`.

**Interfaces:** `readServerEnv(input: NodeJS.ProcessEnv)` returns validated database, auth, and storage settings. Later tasks import it only on the server.

- [ ] Add the package, TypeScript, Next.js, Tailwind, Docker, and Vitest configuration from `scaffold/`, updating scripts for the installed toolchain.
- [ ] Write a failing environment test: `readServerEnv({})` must return field errors without exposing secrets.
- [ ] Implement `readServerEnv` with zod and make the test pass.
- [ ] Run `npm run lint`, `npm test`, and `npm run build`.
- [ ] Commit `feat(foundation): bootstrap application` after verification.

```ts
const result = readServerEnv({});
expect(result.success).toBe(false);
```

### Task 2: Phase 1 schema and migrations

**Files:** `src/db/schema/common.ts`, `src/db/schema/identity.ts`, `src/db/schema/channel.ts`, `src/db/schema/catalog.ts`, `src/db/schema/index.ts`, `src/db/client.ts`, `src/db/seed.ts`, and generated `drizzle/` SQL.

**Interfaces:** Export typed tables `users`, `partners`, `partnerContracts`, `partnerComplianceProfiles`, `customers`, `machineModels`, `specCategories`, `items`, `priceBookVersions`, and `prices`.

- [ ] Write schema tests that assert required business columns, uniqueness, and `numeric(14,2)` prices.
- [ ] Implement the ten tables in §§4.1–4.3 with common audit and soft-delete columns.
- [ ] Generate SQL with `npm run db:generate`; read every generated statement before migration.
- [ ] Seed the supplied models, categories, partners, items, and price book example idempotently.
- [ ] Run schema tests, then migrate and seed when PostgreSQL is available.
- [ ] Commit `feat(db): add master data schema and seed` after verification.

```ts
export const prices = pgTable('prices', {
  ...auditColumns,
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull()
});
```

### Task 3: Login, sessions, and role checks

**Files:** `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/password.ts`, `src/lib/authorization.ts`, `src/app/login/page.tsx`, and auth tests.

**Interfaces:** `requireUser()` returns an authenticated user or redirects. `requireRole(...roles)` refuses an unauthorized mutation on the server.

- [ ] Write failing tests for invalid password, inactive user, and disallowed role.
- [ ] Implement credentials login using password hashes and database users.
- [ ] Keep role and user ID in the server session; audit writes use that ID.
- [ ] Run auth tests and build.
- [ ] Commit `feat(auth): add credentials login and roles` after verification.

```ts
await expect(requireRoleForSession({ role: 'viewer' }, ['admin'])).rejects.toThrow();
```

### Task 4: Bilingual shell and master data pages

**Files:** `src/i18n/request.ts`, `src/i18n/messages.ts`, `src/components/app-shell.tsx`, `src/app/(app)/partners/`, `src/app/(app)/products/`, and reusable form/table components.

**Interfaces:** Pages call typed queries on the server. Forms submit typed server actions from Task 5.

- [ ] Add locale selection for `en` and `zh-Hant` using the supplied Traditional Chinese strings.
- [ ] Build a responsive sidebar and pages for partners, models, items, and price book versions.
- [ ] Display partner commission model and item English/Chinese names without inventing lead fields.
- [ ] Verify accessible form labels, keyboard navigation, and browser rendering.
- [ ] Commit `feat(ui): add bilingual master data shell` after verification.

```tsx
<label htmlFor="nameZh">{t('Chinese name')}</label>
<input id="nameZh" name="nameZh" required />
```

### Task 5: Server actions and master data rules

**Files:** `src/features/partners/actions.ts`, `src/features/catalog/actions.ts`, `src/features/pricing/actions.ts`, their validators, and action tests.

**Interfaces:** Each action validates input, calls `requireRole`, writes in a transaction, and returns field or conflict errors without leaking SQL details.

- [ ] Write tests for the five Review Focus cases above.
- [ ] Implement partner, item, model, and price book create/update/deactivate flows.
- [ ] Enforce unique codes and nonoverlapping published price book periods in the database and service layer.
- [ ] Confirm a viewer cannot invoke mutations directly.
- [ ] Run `npm run lint`, `npm test`, and `npm run build`.
- [ ] Commit `feat(master-data): add validated management actions` after verification.

```ts
const parsed = partnerInput.safeParse(Object.fromEntries(formData));
if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
await requireRole('admin', 'manager');
```

### Task 6: Phase acceptance

**Files:** `docs/decisions/` only if a business owner resolves a listed decision; `docs/superpowers/plans/2026-09-29-phase-1-foundation.md` checkboxes.

- [ ] Run `npm run lint`, `npm test`, and `npm run build`.
- [ ] Run `npm run db:migrate` and `npm run db:seed` against PostgreSQL when available.
- [ ] Confirm login, locale switching, and CRUD for all four master data areas in a browser.
- [ ] Run the project phase-review procedure against every Phase 1 acceptance criterion.
- [ ] Record any environment-dependent verification that could not run; do not mark Phase 1 accepted without it.
