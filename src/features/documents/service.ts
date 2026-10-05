import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { documentApprovals, documents } from '@/db/schema';
import { requireRole } from '@/lib/authorization';

export async function markDocumentPrinted(documentId: string) {
  const actor = await requireRole('admin', 'manager', 'sales');
  await getDb().transaction(async (tx) => {
    const [document] = await tx.select().from(documents).where(eq(documents.id, documentId)).for('update').limit(1);
    if (!document || document.status !== 'issued') throw new Error('Only an issued document can be marked printed');
    await tx.update(documents).set({ status: 'printed', printedAt: new Date(),
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(documents.id, documentId));
  });
}

export async function completeDocumentApproval(documentId: string, approvalId: string) {
  const actor = await requireRole('admin', 'manager');
  await getDb().transaction(async (tx) => {
    const [document] = await tx.select().from(documents).where(eq(documents.id, documentId)).for('update').limit(1);
    if (!document || document.status !== 'printed') throw new Error('Print the document before recording its signature or stamp');
    const [approval] = await tx.select().from(documentApprovals)
      .where(eq(documentApprovals.id, approvalId)).for('update').limit(1);
    if (!approval || approval.documentId !== documentId || approval.completedAt) throw new Error('Approval is unavailable or already completed');
    await tx.update(documentApprovals).set({ completedBy: actor.name, completedAt: new Date(),
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(documentApprovals.id, approvalId));
  });
}

export async function releaseDocument(documentId: string) {
  const actor = await requireRole('admin', 'manager');
  await getDb().transaction(async (tx) => {
    const [document] = await tx.select().from(documents).where(eq(documents.id, documentId)).for('update').limit(1);
    if (!document || document.status !== 'printed' || !document.printedAt) throw new Error('G9: Print the document before release');
    const approvals = await tx.select().from(documentApprovals)
      .where(eq(documentApprovals.documentId, documentId));
    if (approvals.some((approval) => approval.required && !approval.completedAt)) {
      throw new Error('G9: Every required signature and stamp must be recorded before release');
    }
    await tx.update(documents).set({ status: 'released', releasedAt: new Date(),
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(documents.id, documentId));
  });
}

export async function getDealDocuments(dealId: string) {
  await requireRole('admin', 'manager', 'sales', 'finance', 'service', 'viewer');
  return getDb().select().from(documents).where(eq(documents.dealId, dealId))
    .orderBy(documents.generatedAt);
}

export async function getDocumentApprovals(documentId: string) {
  await requireRole('admin', 'manager', 'sales', 'finance', 'service', 'viewer');
  return getDb().select().from(documentApprovals)
    .where(eq(documentApprovals.documentId, documentId));
}
