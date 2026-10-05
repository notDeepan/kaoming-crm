import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { closeDb, getDb } from './client';

async function main() {
  await migrate(getDb(), { migrationsFolder: './drizzle' });
  process.stdout.write('Database migrations applied\n');
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}).finally(async () => { await closeDb(); });
