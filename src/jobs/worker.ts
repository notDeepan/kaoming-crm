import { closeDb } from '@/db/client';
import { recalculatePenaltyExposures } from '@/features/commercial/recalculate';
import { snapshotClosedQuarter } from '@/features/scorecards/snapshot';
import { nextTaipeiRun } from './schedule';

const RETRY_DELAY_MS = 60 * 60 * 1000;
let timer: NodeJS.Timeout | undefined;
let active: Promise<void> | undefined;
let stopping = false;

async function cycle() {
  let failed = false;
  try {
    const exposures = await recalculatePenaltyExposures();
    const quarter = await snapshotClosedQuarter();
    process.stdout.write(`${new Date().toISOString()} jobs complete: ${exposures} penalty exposures; `
      + `${quarter.period}: ${quarter.created} new scorecard snapshots\n`);
  } catch (error) {
    failed = true;
    process.stderr.write(`${new Date().toISOString()} jobs failed: `
      + `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  }
  if (stopping) return;
  const delay = failed ? RETRY_DELAY_MS : nextTaipeiRun(new Date()).getTime() - Date.now();
  timer = setTimeout(startCycle, delay);
}

function startCycle() {
  if (stopping || active) return;
  timer = undefined;
  active = cycle().finally(() => { active = undefined; });
}

async function shutdown() {
  if (stopping) return;
  stopping = true;
  if (timer) clearTimeout(timer);
  if (active) await active;
  await closeDb();
}

process.once('SIGTERM', () => { void shutdown(); });
process.once('SIGINT', () => { void shutdown(); });
startCycle();
