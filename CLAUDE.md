# KAO MING CRM — build memory

Internal Sales & Channel Management System for **KAO MING Machinery Industrial Co., Ltd. (高明精機)**,
Taiwanese maker of CNC double-column machining centres, 5-axis/multi-face gantry machines, VMCs, hydraulic
radial drills. Replaces spreadsheets. Small overseas sales team, sells capital equipment through an agent/dealer
network in **English + Traditional Chinese**. Deals run 6–18 months. **The agent is the primary commercial object,
not the customer.**

Authoritative spec: `docs/SPEC.md`. Where this file and the spec disagree, **the spec wins** — except on visual
design, where the direction below wins (spec does not cover it).

## Locked stack — do not substitute

- Next.js (App Router) + TypeScript **strict**
- Prisma ORM. **SQLite dev, PostgreSQL-compatible schema throughout — no SQLite-only features**
- Session auth (`iron-session`), credentials, **argon2** (`@node-rs/argon2`, prebuilt — no node-gyp). No external IdP
- Tailwind CSS with a **custom token layer** (`tailwind.config.ts`) — not raw Tailwind palette values
- `next-intl`. Every user-visible string in a resource file from the first commit, never retrofitted
- **SheetJS** (`xlsx`) for Excel import/export
- Playwright for tests
- Files on local disk, hashed names, **outside the web root** (`STORAGE_ROOT`)
- Docker Compose for the eventual server move — write it, don't depend on it locally
- No cloud services. No runtime external calls except SMTP. Must run on a laptop with no internet.

### Two portability landmines (already handled — do not reintroduce)
- **Prisma enums break on SQLite** → all enums are `String` columns validated by Zod unions (`src/lib/enums.ts`).
  This also satisfies §28.3 "enums stored as strings, readable without a lookup."
- **Scalar lists (`String[]`) break on SQLite** → queryable multi-selects are **child tables**
  (`agent_territory`, `model_option_applicability`); non-queried ones are **JSON columns** (tags, competitors,
  product_interest, product_families).

## Ten non-negotiable engineering rules

1. **Audit log + document access control are load-bearing.** Documents served only through an authenticated,
   authorised route that streams the file — never a static/guessable path. Acceptance test 9 (direct-URL attempt)
   is a real Playwright test.
2. **Money is decimal + explicit currency.** Never float. Never a bare `amount` column without its currency.
3. **Issued quotations are immutable.** Catalogue changes must never alter an issued quote. Configuration is
   snapshotted as JSON at issue time. Single most important data-integrity rule.
4. **No `organization_id`.** One company. Multi-tenancy deliberately removed.
5. **Soft delete everywhere.** `deletedAt`, never a hard `DELETE`. (Exception: append-only logs never delete either.)
6. **Max six required fields per entity.** More than six red asterisks = misread spec.
7. **Bilingual data fields are two columns**, not one field + a language flag.
8. **Every list view exports to Excel.** Build the export helper once (Phase 1), reuse it.
9. **Server-side validation on everything.** Client validation is convenience only.
10. **Timestamps stored in UTC, displayed in local time.**

Append-only tables (no update, no delete, no soft-delete): `audit_log`, `document_access_log`,
`opportunity_stage_history`.

## Visual design direction — instrument, not dashboard

Precise, dense, legible, unfussy. Like the nameplate riveted to a machine / an engineering drawing's title block /
a Heidenhain panel. **Not** a SaaS landing page.

Forbidden (AI defaults): cream/serif/terracotta; near-black + one acid accent; broadsheet hairlines + zero-radius;
default shadcn indigo; raw Tailwind palette; gradient buttons; glassmorphism; glow; oversized heroes; emoji as icons;
big decorative stat cards; `rounded-3xl` everywhere; animation that doesn't communicate state.

- **Palette (6 tokens, `tailwind.config.ts`):** `ink #15181B`, `paper #EDEFF1`, `grey-line #CDD2D6`,
  `grey-mute #697077`, `kmc #BE1E2D` (brand red — **identity + meaningful state only, never decorative**),
  `alert #B26A00` (the one alert colour — overdue/warning/validation). No green; positive states via ink+red weight.
  `peak #6BA6D6` / `script #3AA0A8` are used **only inside the KMC logo SVG**.
- **Type:** IBM Plex Sans (UI), **IBM Plex Mono tabular** for every identifier + number (codes, quote nos, serials,
  prices, dates — vertically aligned for comparison), Noto Sans TC (繁中, weight-matched). No decorative serif.
- **Density:** compact. ~32px rows. Show more, not breathe more.
- **Signature element — the machine nameplate:** dark `ink` plate, `paper` mono text, one thin `kmc` top rule,
  framed dense grid — echoing the anodized plate on every KAO MING machine. Used for installed-machine + quotation
  config block (Phase 2/3); in **Phase 1 the agent record header wears the same plate**. One bold surface; everything
  around it quiet.
- **Structure:** record header = engineering **title block** (identity fields in a fixed mono grid). Derived
  performance = compact **mono stat strip**, never big stat cards. Structural devices must encode something true.
- **Motion:** almost none — state transitions only (row commit, stage move, save confirm). Respect
  `prefers-reduced-motion`.
- **Copy:** active voice, sentence case, plain verbs. "Agent overdue for contact", not "Cadence threshold exceeded".
  Errors say what happened + what to do. Empty states designed as first impressions (system starts empty).
- **Quality floor (unannounced):** keyboard navigable, visible focus rings, reduced motion respected, works to tablet
  width, every interactive element tab-reachable.

## Scope — Phase 1 ONLY this session

Users/roles/auth/audit log · bilingual shell w/ EN↔繁中 switch · system settings · agent management (territories,
terms, cadence, derived performance panel) · customer management · contact management · global search · Excel
import/export for agents/customers/contacts · the list-view framework (column selection, filtering, sorting, saved
views) that everything later reuses.

**Do not start Phase 2** (catalogue, enquiries, opportunities, quotations, activities). Schema for all 24 tables is
written now; only Phase 1 UI is built.

## Skills to use

`frontend-design` before each screen · `web-design-guidelines` after each screen (fix every finding) ·
`vercel-react-best-practices` while writing React · `vercel-composition-patterns` when a component grows boolean
props · `webapp-testing` to drive Playwright + screenshot + self-critique.

## Working rules

- Build in **vertical slices**: schema → API → UI → test, one entity at a time.
- Commit at each working milestone with a clear message.
- After each screen, screenshot it in both languages and critique vs the direction above. If it looks like every
  other admin panel, it's wrong — say what changed and why.
- Ask before inventing business rules. §9 open-items register lists what is genuinely undecided; everything else is
  specified or a question for Deepan.
- Roles: System Administrator, Sales Manager, Overseas Sales/BD, Application Engineer, Management (Viewer). Permission
  matrix in §26.2. Opportunities are read-visible to all; sensitivity is controlled at the **document** level.

## Open items affecting later phases (§9) — do not silently assume
9.1 ERP boundary UNRESOLVED · 9.5 quotation template must be obtained · 9.6 model codes/prices must be loaded (none
invented) · 9.7 default commercial terms placeholders · 9.8 commission structure (agent holds all three reps).
