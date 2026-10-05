import { closeDb } from '@/db/client';
import { snapshotClosedQuarter } from '@/features/scorecards/snapshot';

async function main() {
  try {
    const result = await snapshotClosedQuarter();
    process.stdout.write(`Quarter ${result.period}: ${result.created} immutable scorecard snapshots created\n`);
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
