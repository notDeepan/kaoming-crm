import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityTable: text('entity_table').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  actorId: uuid('actor_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('audit_log_entity_idx').on(table.entityTable, table.entityId, table.at),
  index('audit_log_at_idx').on(table.at)]);
