import { sql } from 'drizzle-orm';
import { boolean, date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import {
  commissionBaseEnum, commissionModelEnum, customerSourceEnum, exclusivityEnum,
  partnerRelationshipEnum, partnerStatusEnum, partnerTierEnum, regionEnum,
} from '../enums';
import { auditColumns } from './common';

export const partners = pgTable('partners', {
  ...auditColumns,
  code: text('code').notNull(),
  name: text('name').notNull(),
  nameZh: text('name_zh'),
  countryCode: varchar('country_code', { length: 2 }).notNull(),
  region: regionEnum('region').notNull(),
  lifecycleStatus: partnerStatusEnum('lifecycle_status').default('prospect').notNull(),
  relationshipType: partnerRelationshipEnum('relationship_type').notNull(),
  // DECISION-PENDING: D12 — each partner has one commission model.
  commissionModel: commissionModelEnum('commission_model').notNull(),
  exclusivity: exclusivityEnum('exclusivity'),
  tier: partnerTierEnum('tier').default('unrated').notNull(),
  defaultCurrency: varchar('default_currency', { length: 3 }).default('USD').notNull(),
  notes: text('notes'),
}, (table) => [
  uniqueIndex('partners_code_unique').on(table.code),
  index('partners_region_idx').on(table.region),
]);

export const partnerContracts = pgTable('partner_contracts', {
  ...auditColumns,
  // DECISION-PENDING: D8 — no annual target field until contract targets are confirmed.
  partnerId: uuid('partner_id').references(() => partners.id).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  autoRenew: boolean('auto_renew').default(false).notNull(),
  noticePeriodDays: integer('notice_period_days'),
  noticeDeadline: date('notice_deadline').generatedAlwaysAs(sql`end_date - notice_period_days`),
  commissionRate: numeric('commission_rate', { precision: 5, scale: 4 }),
  commissionBase: commissionBaseEnum('commission_base'),
  ldRatePerWeek: numeric('ld_rate_per_week', { precision: 5, scale: 4 }),
  ldCap: numeric('ld_cap', { precision: 5, scale: 4 }),
  excludesConsequentialLoss: boolean('excludes_consequential_loss'),
  documentUrl: text('document_url'),
}, (table) => [index('partner_contracts_partner_idx').on(table.partnerId)]);

export const partnerComplianceProfiles = pgTable('partner_compliance_profiles', {
  ...auditColumns,
  partnerId: uuid('partner_id').references(() => partners.id).notNull(),
  voltage: text('voltage'),
  frequency: text('frequency'),
  phase: text('phase'),
  ceVariant: text('ce_variant'),
  labelLanguages: text('label_languages').array(),
  nameplateRequired: boolean('nameplate_required'),
  defaultColourCodes: text('default_colour_codes').array(),
  isComplete: boolean('is_complete').generatedAlwaysAs(sql`
    voltage IS NOT NULL AND frequency IS NOT NULL AND phase IS NOT NULL
    AND ce_variant IS NOT NULL AND coalesce(cardinality(label_languages), 0) > 0
    AND nameplate_required IS NOT NULL AND coalesce(cardinality(default_colour_codes), 0) > 0
  `),
}, (table) => [uniqueIndex('partner_compliance_profiles_partner_unique').on(table.partnerId)]);

export const customers = pgTable('customers', {
  ...auditColumns,
  partnerId: uuid('partner_id').references(() => partners.id).notNull(),
  name: text('name').notNull(),
  countryCode: varchar('country_code', { length: 2 }),
  industry: text('industry'),
  source: customerSourceEnum('source'),
}, (table) => [index('customers_partner_idx').on(table.partnerId)]);

export const scorecardSnapshots = pgTable('scorecard_snapshots', {
  ...auditColumns,
  partnerId: uuid('partner_id').references(() => partners.id).notNull(),
  period: text('period').notNull(),
  commercialScore: numeric('commercial_score', { precision: 5, scale: 2 }),
  pipelineScore: numeric('pipeline_score', { precision: 5, scale: 2 }),
  capabilityScore: numeric('capability_score', { precision: 5, scale: 2 }),
  relationshipScore: numeric('relationship_score', { precision: 5, scale: 2 }),
  compositeScore: numeric('composite_score', { precision: 5, scale: 2 }),
  tier: partnerTierEnum('tier').default('unrated').notNull(),
  previousTier: partnerTierEnum('previous_tier'),
  netRevenue12m: numeric('net_revenue_12m', { precision: 14, scale: 2 }),
  costToServePct: numeric('cost_to_serve_pct', { precision: 5, scale: 2 }),
  dataPoints: integer('data_points').default(0).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publicationBlockedReason: text('publication_blocked_reason'),
}, (table) => [uniqueIndex('scorecard_partner_period_unique').on(table.partnerId, table.period),
  index('scorecard_period_idx').on(table.period)]);
