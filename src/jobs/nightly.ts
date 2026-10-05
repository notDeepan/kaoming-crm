import { closeDb } from '@/db/client';
import { recalculatePenaltyExposures } from '@/features/commercial/recalculate';

async function main() {
  try {
    const count = await recalculatePenaltyExposures();
    process.stdout.write(`Recalculated ${count} open-order penalty exposures\n`);
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
