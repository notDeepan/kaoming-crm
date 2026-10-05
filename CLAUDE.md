# Kao Ming International Sales CRM

Internal system for a Taiwanese CNC machine tool manufacturer selling through ~59 overseas
agents. Full specification in @docs/ — start with @docs/01-domain.md

## Commands
- `npm run dev` — dev server
- `npm run db:generate` — generate migration from schema changes
- `npm run db:migrate` — apply migrations
- `npm run db:seed` — reset and seed
- `npm run test` — vitest
- `npm run test:e2e` — playwright
- `npm run lint` — eslint + tsc --noEmit

## Stack
Next.js 15 App Router · TypeScript strict · PostgreSQL 16 · Drizzle ORM · Auth.js v5 ·
Tailwind + shadcn/ui · next-intl (en, zh-Hant) · Puppeteer for PDF · pg-boss for jobs ·
Vitest + Playwright · Docker Compose on one office VM

## Conventions
- Server Components by default; Client Components only where interactivity requires it
- All mutations are Server Actions validated with zod; no unvalidated input
- Money: `numeric(14,2)` in Postgres, integer minor units in TypeScript. **Never float**
- Dates: `timestamptz` stored UTC, rendered `Asia/Taipei`. ROC calendar only inside
  Chinese documents (民國 year = Gregorian − 1911)
- Every table: `id uuid`, `created_at`, `updated_at`, `created_by`, `updated_by`
- Soft delete only. Never hard-delete an order, quotation or document
- No default exports except Next.js pages and layouts
- Commit format: `feat|fix|chore(scope): description`

## Domain traps — these are easy to get wrong
- An agent is a long-lived **Partner**, never a Lead
- Quotations are **versioned**; never edit one in place, create the next revision
- A quotation locks to the price book version live at its issue date
- Discount is captured **per line**, not only on the total
- Chinese documents (PI 訂單, MI 製令單, 製造規格表) are printed and circulated on paper.
  Layout fidelity matters more than screen polish
- Progress tracking records the **expected completion date**, never a percentage
- Two commission models per agent: `markup` (agent resells, no commission) and
  `commission` (customer pays Kao Ming, agent claims). Every ranking uses **net revenue
  after commission**, or the two are not comparable
- Chinese item names come from the **item master**, not machine translation. The one
  exception is after-sales correspondence (see @docs/10-aftersales-cases.md)
- Gates G1–G21 in @docs/03-business-rules.md are **server-side refusals**, not UI hints
- A **case** is "the machine has a problem"; a **claim** is "the customer wants money".
  Separate objects, separate lifecycles. A settled claim attributed to Kao Ming becomes a
  leakage entry automatically — never record the concession twice
- A spare parts quotation cannot be drafted until the part is **identified by 售後** and
  **priced by 採購/生管**. Both are waits on other departments and both are timed
- Phase E order: 完工通知 → **final payment** → 訂艙 → space confirmed → 出貨通知 →
  documents → 出貨單 → shipped. Payment gates booking, not shipment
- Booking takes 2–3 weeks and is almost never refused. It is a planned lead time, not a risk
- The **incoterm derives the forwarder**: FOB → customer appoints, CIF → Kao Ming chooses
  and carries freight and insurance. Never set `forwarder_nominated_by` directly

## Working agreement
- Build in the phase order in @docs/07-build-plan.md. Do not build ahead
- Where @docs/08-decisions.md is unresolved, implement the stated default and leave a
  `// DECISION-PENDING: <id>` comment
- Read @docs/09-anti-requirements.md before proposing anything not in the specification
- Use `/schema-change` for any database change; `/gate-check` after touching deals,
  quotations, orders, work orders, site visits or documents
