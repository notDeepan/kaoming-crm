import { boolean, date, index, integer, jsonb, numeric, pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { itemTypeEnum, regionBandEnum } from '../enums';
import { auditColumns } from './common';

export const machineModels = pgTable('machine_models', {
  ...auditColumns,
  code: text('code').notNull(),
  nameEn: text('name_en').notNull(),
  nameZh: text('name_zh').notNull(),
  productLine: text('product_line'),
  proposalAssetUrl: text('proposal_asset_url'),
  proposalAssetName: text('proposal_asset_name'),
  proposalAssetBase64: text('proposal_asset_base64'),
  // Source values for the English/Chinese configuration bridge; entered from
  // model literature, never generated from an English translation.
  baseSpecs: jsonb('base_specs').$type<Record<string, { valueEn: string; valueZh: string }>>(),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => [uniqueIndex('machine_models_code_unique').on(table.code)]);

export const specCategories = pgTable('spec_categories', {
  ...auditColumns,
  code: text('code').notNull(),
  nameEn: text('name_en').notNull(),
  nameZh: text('name_zh').notNull(),
  sortOrder: integer('sort_order').notNull(),
  appearsOn: text('appears_on').array().notNull(),
}, (table) => [uniqueIndex('spec_categories_code_unique').on(table.code)]);

export const items = pgTable('items', {
  ...auditColumns,
  code: text('code').notNull(),
  nameEn: text('name_en').notNull(),
  nameZh: text('name_zh').notNull(),
  itemType: itemTypeEnum('item_type').notNull(),
  specCategoryId: uuid('spec_category_id').references(() => specCategories.id),
  machineModelId: uuid('machine_model_id').references(() => machineModels.id),
  specOverride: jsonb('spec_override').$type<{ valueEn: string; valueZh: string }>(),
  isStandardAccessory: boolean('is_standard_accessory').default(false).notNull(),
  unit: text('unit').default('set').notNull(),
}, (table) => [
  uniqueIndex('items_code_unique').on(table.code),
  index('items_machine_model_idx').on(table.machineModelId),
]);

// The initial migration adds a PostgreSQL exclusion constraint for published periods.
export const priceBookVersions = pgTable('price_book_versions', {
  ...auditColumns,
  name: text('name').notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  isPublished: boolean('is_published').default(false).notNull(),
}, (table) => [
  uniqueIndex('price_book_versions_name_unique').on(table.name),
  index('price_book_versions_effective_idx').on(table.effectiveFrom, table.effectiveTo),
]);

export const prices = pgTable('prices', {
  ...auditColumns,
  priceBookVersionId: uuid('price_book_version_id').references(() => priceBookVersions.id).notNull(),
  itemId: uuid('item_id').references(() => items.id).notNull(),
  regionBand: regionBandEnum('region_band').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
}, (table) => [
  uniqueIndex('prices_version_item_region_currency_unique').on(
    table.priceBookVersionId, table.itemId, table.regionBand, table.currency,
  ),
  index('prices_item_idx').on(table.itemId),
]);
