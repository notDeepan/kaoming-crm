import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let connection: ReturnType<typeof postgres> | undefined;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  connection ??= postgres(url, { max: 10 });
  return drizzle(connection, { schema });
}

export async function closeDb() {
  if (connection) await connection.end();
  connection = undefined;
}
