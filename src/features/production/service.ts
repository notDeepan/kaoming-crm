import 'server-only';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  deals, fatChecklistItems, fatRecords, orders, progressReviews, specCategories,
  specSheetLines, specSheets, workOrders,
} from '@/db/schema';
import { requireRole } from '@/lib/authorization';
import { dateUtc, daysBetween, escalationForSlip } from './dates';

const stages = ['casting', 'machining', 'assembly', 'wiring', 'run-in'] as const;
type DelayReason = typeof import('@/db/enums').delayReasons[number];
type Attribution = typeof import('@/db/enums').attributions[number];
type FatOutcome = typeof import('@/db/enums').fatOutcomes[number];

export function overdueEscalation(dueDate: string, now = new Date()) {
  const late = daysBetween(dueDate, now.toISOString().slice(0, 10));
  return late <= 0 ? 'none' : late > 60 ? 'gm' : 'dept_manager';
}

export async function getProductionState(workOrderId: string) {
  await requireRole('admin', 'manager', 'sales', 'logistics', 'service', 'viewer');
  const db = getDb();
  const [work] = await db.select({ work: workOrders, order: orders }).from(workOrders)
    .innerJoin(orders, eq(orders.id, workOrders.orderId)).where(eq(workOrders.id, workOrderId)).limit(1);
  if (!work) return null;
  const [reviews, fats] = await Promise.all([
    db.select().from(progressReviews).where(eq(progressReviews.workOrderId, workOrderId)).orderBy(asc(progressReviews.sequence)),
    db.select().from(fatRecords).where(eq(fatRecords.workOrderId, workOrderId)).orderBy(asc(fatRecords.createdAt)),
  ]);
  const checklists = fats.length ? await db.select({ item: fatChecklistItems, nameZh: specCategories.nameZh })
    .from(fatChecklistItems).innerJoin(specCategories, eq(specCategories.id, fatChecklistItems.specCategoryId))
    .where(eq(fatChecklistItems.fatRecordId, fats[fats.length - 1]!.id)).orderBy(asc(specCategories.sortOrder)) : [];
  return { ...work, reviews: reviews.map((row) => ({ ...row,
    exceptionLevel: row.filledAt || row.closedAt ? row.escalationLevel : overdueEscalation(row.dueDate),
  })), fats, checklists };
}

export async function recordProgressReview(reviewId: string, input: {
  reportedStage: typeof stages[number]; expectedCompletion: string;
  delayReason?: DelayReason | null; attribution?: Attribution | null;
}) {
  const actor = await requireRole('admin', 'manager', 'sales');
  if (!stages.includes(input.reportedStage)) throw new Error('Choose a production stage');
  dateUtc(input.expectedCompletion);
  return getDb().transaction(async (tx) => {
    const [review] = await tx.select().from(progressReviews).where(eq(progressReviews.id, reviewId)).for('update').limit(1);
    if (!review || review.filledAt || review.closedAt) throw new Error('This review is no longer open');
    const [work] = await tx.select().from(workOrders).where(eq(workOrders.id, review.workOrderId)).limit(1);
    const [order] = work ? await tx.select().from(orders).where(eq(orders.id, work.orderId)).limit(1) : [];
    if (!work?.issuedAt || !order?.contractualDeliveryDate) throw new Error('MI and contractual delivery date are required');
    const history = await tx.select().from(progressReviews).where(eq(progressReviews.workOrderId, review.workOrderId))
      .orderBy(asc(progressReviews.sequence));
    const prior = history.filter((row) => row.sequence < review.sequence);
    if (prior.some((row) => !row.filledAt)) throw new Error('Complete earlier monthly reviews first');
    const previous = prior.length ? prior[prior.length - 1]!.expectedCompletion : order.contractualDeliveryDate;
    if (!previous) throw new Error('Previous expected date is missing');
    const delta = daysBetween(previous, input.expectedCompletion);
    const slip = daysBetween(order.contractualDeliveryDate, input.expectedCompletion);
    if (delta > 0 && (!input.delayReason || !input.attribution)) {
      throw new Error('Record the delay cause and responsibility when the expected date moves later');
    }
    const now = new Date();
    const [saved] = await tx.update(progressReviews).set({
      filledAt: now, reportedStage: input.reportedStage,
      expectedCompletion: input.expectedCompletion, previousExpected: previous,
      deltaDays: delta, cumulativeSlipDays: slip, delayReason: input.delayReason ?? null,
      attribution: input.attribution ?? null, reportedBy: actor.name,
      escalationLevel: escalationForSlip(slip), updatedAt: now, updatedBy: actor.id,
    }).where(eq(progressReviews.id, reviewId)).returning();
    return saved!;
  });
}

export async function scheduleFat(workOrderId: string, scheduledFor: string) {
  const actor = await requireRole('admin', 'manager', 'sales');
  dateUtc(scheduledFor);
  return getDb().transaction(async (tx) => {
    const [work] = await tx.select().from(workOrders).where(eq(workOrders.id, workOrderId)).for('update').limit(1);
    if (!work?.issuedAt) throw new Error('Issue the MI before scheduling FAT');
    const [latest] = await tx.select().from(specSheets).where(eq(specSheets.workOrderId, workOrderId))
      .orderBy(desc(specSheets.revision)).limit(1);
    if (!latest?.issuedAt) throw new Error('Issue the current specification revision before FAT');
    const lines = await tx.select().from(specSheetLines).where(eq(specSheetLines.specSheetId, latest.id));
    if (!lines.length) throw new Error('The issued specification is empty');
    const [fat] = await tx.insert(fatRecords).values({ workOrderId, scheduledFor, createdBy: actor.id, updatedBy: actor.id }).returning();
    await tx.insert(fatChecklistItems).values(lines.map((line) => ({
      fatRecordId: fat!.id, specCategoryId: line.specCategoryId, expectedValue: line.valueZh,
      createdBy: actor.id, updatedBy: actor.id,
    })));
    const [order] = await tx.select({ dealId: orders.dealId }).from(orders).where(eq(orders.id, work.orderId)).limit(1);
    if (!order) throw new Error('Order not found');
    await tx.update(deals).set({ projectStage: 'fat_scheduled', updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(deals.id, order.dealId));
    return fat!;
  });
}

export async function verifyFatItem(itemId: string, verified: boolean, notes: string) {
  const actor = await requireRole('admin', 'manager', 'service');
  return getDb().transaction(async (tx) => {
    const [item] = await tx.select().from(fatChecklistItems).where(eq(fatChecklistItems.id, itemId)).for('update').limit(1);
    if (!item) throw new Error('FAT checklist item not found');
    const [fat] = await tx.select().from(fatRecords).where(eq(fatRecords.id, item.fatRecordId)).limit(1);
    if (fat?.outcome) throw new Error('This FAT has already been concluded');
    await tx.update(fatChecklistItems).set({ verified, notes: notes.trim() || null, updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(fatChecklistItems.id, itemId));
  });
}

export async function concludeFat(fatId: string, input: {
  conductedAt: string; outcome: FatOutcome; attendees: string; punchList: string[]; customerContactCaptured: boolean;
}) {
  const actor = await requireRole('admin', 'manager', 'service');
  dateUtc(input.conductedAt);
  return getDb().transaction(async (tx) => {
    const [fat] = await tx.select().from(fatRecords).where(eq(fatRecords.id, fatId)).for('update').limit(1);
    if (!fat || fat.outcome) throw new Error('FAT is missing or already concluded');
    if (!fat.scheduledFor) throw new Error('Schedule FAT first');
    if (input.outcome === 'conditional' && !input.punchList.length) throw new Error('A conditional FAT needs open punch-list items');
    if (input.outcome === 'passed') {
      const checks = await tx.select().from(fatChecklistItems).where(eq(fatChecklistItems.fatRecordId, fat.id));
      if (!checks.length || checks.some((item) => item.verified !== true)) throw new Error('Verify every specification item before passing FAT');
    }
    const now = new Date();
    await tx.update(fatRecords).set({ conductedAt: input.conductedAt, outcome: input.outcome,
      attendees: input.attendees.trim() || null, punchList: input.punchList,
      customerContactCaptured: input.customerContactCaptured, updatedAt: now, updatedBy: actor.id,
    }).where(eq(fatRecords.id, fat.id));
    const [work] = await tx.select().from(workOrders).where(eq(workOrders.id, fat.workOrderId)).limit(1);
    const [order] = await tx.select().from(orders).where(eq(orders.id, work!.orderId)).limit(1);
    await tx.update(deals).set({ projectStage: `fat_${input.outcome}` as 'fat_passed' | 'fat_conditional' | 'fat_failed',
      updatedAt: now, updatedBy: actor.id }).where(eq(deals.id, order!.dealId));
    if (input.outcome === 'passed') await tx.update(progressReviews).set({ closedAt: now, updatedAt: now, updatedBy: actor.id })
      .where(and(eq(progressReviews.workOrderId, fat.workOrderId), isNull(progressReviews.filledAt), isNull(progressReviews.closedAt)));
  });
}
