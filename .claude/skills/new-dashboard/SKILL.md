---
name: new-dashboard
description: Add a report page with the shared filter set and correct measure labelling. Use when building any report from docs/05-reports.md.
argument-hint: [report-id]
---

Build report: $ARGUMENTS  (see @docs/05-reports.md, wireframe in reference/screens/)

## Non-negotiable

1. **Label the measure on every tile.** Bookings, revenue and cash place the same order in
   three different months. An unlabelled figure will be misread in its first meeting.
2. Use the shared filter component: period, **date basis**, agent, country → region,
   machine model, measure, currency. Date basis appears in the page title so a screenshot
   is unambiguous.
3. Region comes from the `regions` enum in `src/db/enums.ts`. Never a local grouping.
4. Any ranking of agents uses **net revenue after commission**, never gross.
5. Any metric built on fewer than five data points renders with a low-confidence marker.
6. Queries live in `src/queries/<report-id>.ts`, are typed, and are tested against the seed
   data with known expected values.

## Layout
Server Component page, Client Component filter bar writing to `searchParams`, Recharts for
charts, TanStack Table for grids. No client-side fetching for the initial render.
