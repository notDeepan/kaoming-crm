import 'server-only';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { caseMessages, caseStateLog, machines, partners, serviceCases } from '@/db/schema';
import type { casePriorities, caseStatuses, caseTypes, messageDirections, translationSources } from '@/db/enums';
import { requireRole } from '@/lib/authorization';

type CaseType = typeof caseTypes[number];
type Priority = typeof casePriorities[number];
type Status = typeof caseStatuses[number];
type Direction = typeof messageDirections[number];
type TranslationSource = typeof translationSources[number];

const next: Record<Status, readonly Status[]> = {
  received: ['translated'], translated: ['with_engineering'],
  with_engineering: ['response_received'], response_received: ['translated_back'],
  translated_back: ['sent_to_agent'], sent_to_agent: ['awaiting_customer'],
  awaiting_customer: ['with_engineering', 'resolved'],
  on_hold_parts: [], resolved: ['closed'], closed: [],
};
export function availableCaseTransitions(status: Status, states: { fromStatus: Status | null;
  toStatus: Status }[]): Status[] {
  if (status === 'closed') return [];
  if (status === 'on_hold_parts') {
    const held = [...states].reverse().find((entry) => entry.toStatus === 'on_hold_parts');
    return held?.fromStatus ? [held.fromStatus] : [];
  }
  return [...next[status], ...(status === 'resolved' ? [] : ['on_hold_parts' as const])];
}

export async function listCases() {
  await requireRole('admin', 'manager', 'sales', 'service', 'viewer');
  return getDb().select({ case: serviceCases, partnerName: partners.name,
    serialNumber: machines.serialNumber }).from(serviceCases)
    .innerJoin(partners, eq(partners.id, serviceCases.partnerId))
    .leftJoin(machines, eq(machines.id, serviceCases.machineId))
    .where(isNull(serviceCases.deletedAt)).orderBy(desc(serviceCases.openedAt));
}

export async function caseOptions() {
  await requireRole('admin', 'manager', 'sales', 'service', 'viewer');
  const db = getDb();
  return Promise.all([
    db.select({ id: partners.id, name: partners.name }).from(partners).where(isNull(partners.deletedAt)),
    db.select({ id: machines.id, serialNumber: machines.serialNumber,
      partnerId: machines.partnerId }).from(machines).where(isNull(machines.deletedAt)),
  ]);
}

export async function getCase(caseId: string) {
  await requireRole('admin', 'manager', 'sales', 'service', 'viewer');
  const db = getDb();
  const [row] = await db.select({ case: serviceCases, partnerName: partners.name,
    serialNumber: machines.serialNumber }).from(serviceCases)
    .innerJoin(partners, eq(partners.id, serviceCases.partnerId))
    .leftJoin(machines, eq(machines.id, serviceCases.machineId))
    .where(and(eq(serviceCases.id, caseId), isNull(serviceCases.deletedAt))).limit(1);
  if (!row) return null;
  const [messages, states] = await Promise.all([
    db.select().from(caseMessages).where(and(eq(caseMessages.caseId, caseId), isNull(caseMessages.deletedAt)))
      .orderBy(asc(caseMessages.createdAt)),
    db.select().from(caseStateLog).where(eq(caseStateLog.caseId, caseId))
      .orderBy(asc(caseStateLog.at)),
  ]);
  return { ...row, messages, states };
}

export async function openCase(input: {
  partnerId: string; machineId: string | null; caseType: CaseType;
  priority: Priority; subject: string;
}) {
  const actor = await requireRole('admin', 'manager', 'sales', 'service');
  if (!input.subject.trim()) throw new Error('Enter a case subject');
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(6147292)`);
    const [partner] = await tx.select().from(partners).where(eq(partners.id, input.partnerId)).limit(1);
    if (!partner) throw new Error('Select an agent');
    const [machine] = input.machineId ? await tx.select().from(machines)
      .where(eq(machines.id, input.machineId)).limit(1) : [];
    if (input.machineId && (!machine || machine.partnerId !== partner.id)) {
      throw new Error('Machine must belong to the selected agent');
    }
    const year = new Date().toISOString().slice(0, 4);
    const prefix = `CS-${year}-`;
    const [last] = await tx.select({ caseNumber: serviceCases.caseNumber }).from(serviceCases)
      .where(sql`${serviceCases.caseNumber} LIKE ${`${prefix}%`}`)
      .orderBy(desc(serviceCases.caseNumber)).limit(1);
    const number = last ? Number(last.caseNumber.slice(prefix.length)) + 1 : 1;
    if (number > 9999) throw new Error('Case number range exhausted');
    const now = new Date();
    const [row] = await tx.insert(serviceCases).values({
      caseNumber: `${prefix}${String(number).padStart(4, '0')}`,
      partnerId: partner.id, machineId: machine?.id ?? null, customerId: machine?.customerId ?? null,
      caseType: input.caseType, priority: input.priority, subject: input.subject.trim(),
      ownerId: actor.id, openedAt: now, createdBy: actor.id, updatedBy: actor.id,
    }).returning();
    await tx.insert(caseStateLog).values({ caseId: row!.id, fromStatus: null,
      toStatus: 'received', at: now, by: actor.id, createdBy: actor.id, updatedBy: actor.id });
    return row!;
  });
}

export async function addCaseMessage(caseId: string, input: {
  direction: Direction; sourceLanguage: 'en' | 'zh-Hant'; sourceText: string;
}) {
  const actor = await requireRole('admin', 'manager', 'sales', 'service');
  if (!input.sourceText.trim()) throw new Error('Enter the message exactly as received');
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select({ status: serviceCases.status }).from(serviceCases)
      .where(eq(serviceCases.id, caseId)).for('update').limit(1);
    if (!row || row.status === 'closed') throw new Error('Open case required');
    const [message] = await tx.insert(caseMessages).values({ caseId,
      direction: input.direction, sourceLanguage: input.sourceLanguage,
      sourceText: input.sourceText, createdBy: actor.id, updatedBy: actor.id }).returning();
    return message!;
  });
}

export async function reviewCaseTranslation(messageId: string, input: {
  translatedText: string; source: TranslationSource;
}) {
  const actor = await requireRole('admin', 'manager', 'sales', 'service');
  if (!input.translatedText.trim()) throw new Error('Enter and review the translation');
  if (input.source === 'machine') throw new Error('Unreviewed machine text cannot be approved; use machine_edited or human');
  return getDb().transaction(async (tx) => {
    const [message] = await tx.select().from(caseMessages).where(eq(caseMessages.id, messageId))
      .for('update').limit(1);
    if (!message || message.sentAt) throw new Error('Message not found or already sent');
    if (input.source === 'machine_edited' && message.translationSource !== 'machine') {
      throw new Error('A machine-edited translation requires a machine draft');
    }
    const [row] = await tx.select({ status: serviceCases.status }).from(serviceCases)
      .where(eq(serviceCases.id, message.caseId)).limit(1);
    if (!row || row.status === 'closed') throw new Error('Closed case cannot be edited');
    const [updated] = await tx.update(caseMessages).set({
      translatedText: input.translatedText.trim(), translationSource: input.source,
      translatedBy: actor.id, reviewedAt: new Date(), updatedAt: new Date(), updatedBy: actor.id,
    }).where(eq(caseMessages.id, messageId)).returning();
    return updated!;
  });
}

export async function markCaseMessageSent(messageId: string) {
  const actor = await requireRole('admin', 'manager', 'sales', 'service');
  return getDb().transaction(async (tx) => {
    const [message] = await tx.select().from(caseMessages).where(eq(caseMessages.id, messageId))
      .for('update').limit(1);
    if (!message || !message.direction.startsWith('outbound_') || !message.reviewedAt
      || !message.translatedText?.trim() || message.sentAt) {
      throw new Error('Only a reviewed outbound translation can be marked sent');
    }
    const [row] = await tx.select({ status: serviceCases.status }).from(serviceCases)
      .where(eq(serviceCases.id, message.caseId)).limit(1);
    if (!row || row.status === 'closed') throw new Error('Closed case cannot send messages');
    const [updated] = await tx.update(caseMessages).set({ sentAt: new Date(),
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(caseMessages.id, messageId)).returning();
    return updated!;
  });
}

export async function transitionCase(caseId: string, target: Status, resolution = '') {
  const actor = await requireRole('admin', 'manager', 'sales', 'service');
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(serviceCases).where(eq(serviceCases.id, caseId)).for('update').limit(1);
    if (!row || row.status === 'closed') throw new Error('Open case required');
    if (target === 'on_hold_parts') {
      if (row.status === 'resolved') throw new Error('Resolved cases cannot be held for parts');
    } else if (row.status === 'on_hold_parts') {
      const [previous] = await tx.select({ fromStatus: caseStateLog.fromStatus }).from(caseStateLog)
        .where(and(eq(caseStateLog.caseId, caseId), eq(caseStateLog.toStatus, 'on_hold_parts')))
        .orderBy(desc(caseStateLog.at)).limit(1);
      if (target !== previous?.fromStatus) throw new Error('Resume the state held for parts');
    } else if (!next[row.status].includes(target)) {
      throw new Error(`Invalid case transition: ${row.status} → ${target}`);
    }
    if (target === 'resolved' && !resolution.trim()) throw new Error('Record a resolution before resolving');
    if (target === 'closed') {
      if (!row.resolution?.trim()) throw new Error('G13: Record a resolution before closure');
      const messages = await tx.select({ source: caseMessages.sourceText,
        translated: caseMessages.translatedText }).from(caseMessages).where(and(
        eq(caseMessages.caseId, caseId), isNull(caseMessages.deletedAt)));
      if (!messages.length || messages.some((message) => !message.source.trim() || !message.translated?.trim())) {
        throw new Error('G13: Every case message needs source and translated text before closure');
      }
    }
    const now = new Date();
    await tx.update(serviceCases).set({ status: target,
      resolution: target === 'resolved' ? resolution.trim() : row.resolution,
      closedAt: target === 'closed' ? now : null,
      updatedAt: now, updatedBy: actor.id }).where(eq(serviceCases.id, caseId));
    await tx.insert(caseStateLog).values({ caseId, fromStatus: row.status, toStatus: target,
      at: now, by: actor.id, createdBy: actor.id, updatedBy: actor.id });
  });
}
