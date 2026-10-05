import { boolean, customType, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { userRoleEnum } from '../enums';
import { auditColumns } from './common';

const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

export const users = pgTable('users', {
  ...auditColumns,
  name: text('name').notNull(),
  email: citext('email').notNull(),
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').notNull(),
  department: text('department'),
  locale: text('locale').default('en').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => [
  uniqueIndex('users_email_unique').on(table.email),
]);
