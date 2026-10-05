import { integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { auditColumns } from './common';

// Operational authentication state. Keys are HMAC hashes; no email or IP is stored.
export const loginAttempts = pgTable('login_attempts', {
  ...auditColumns,
  keyHash: text('key_hash').notNull(),
  attemptCount: integer('attempt_count').default(0).notNull(),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true }).defaultNow().notNull(),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('login_attempts_key_hash_unique').on(table.keyHash)]);
