import { eq } from 'drizzle-orm';
import { closeDb, getDb } from './client';
import { deals, items, partnerComplianceProfiles, partners, priceBookVersions, prices,
  quotationApprovals, quotationLines, quotations, technicalProposals, users } from './schema';
import { verifyPassword } from '../lib/password';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function smoke() {
  const db = getDb();
  const [partner] = await db.select({ id: partners.id }).from(partners)
    .where(eq(partners.code, 'A16001')).limit(1);
  assert(partner, 'Worked-example partner A16001 was not seeded');

  const [profile] = await db.select({ complete: partnerComplianceProfiles.isComplete })
    .from(partnerComplianceProfiles)
    .where(eq(partnerComplianceProfiles.partnerId, partner.id)).limit(1);
  assert(profile?.complete === true, 'Worked-example partner A16001 has an incomplete destination profile');

  const [item] = await db.select({ id: items.id, nameZh: items.nameZh }).from(items)
    .where(eq(items.code, 'KMC-637AS')).limit(1);
  assert(item?.nameZh === '龍門式加工中心機〈五軸〉', 'The Chinese item master name did not survive seeding');

  const [book] = await db.select({ id: priceBookVersions.id, published: priceBookVersions.isPublished })
    .from(priceBookVersions).where(eq(priceBookVersions.name, '2026-H1')).limit(1);
  assert(book?.published, 'Worked-example price book is missing or unpublished');
  const itemPrices = await db.select({ amount: prices.amount }).from(prices)
    .where(eq(prices.itemId, item.id));
  assert(itemPrices.length >= 3, 'Worked-example item has fewer than three regional/currency prices');

  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    const [admin] = await db.select({ passwordHash: users.passwordHash }).from(users)
      .where(eq(users.email, process.env.SEED_ADMIN_EMAIL)).limit(1);
    assert(admin?.passwordHash, 'Seed administrator is missing');
    assert(await verifyPassword(process.env.SEED_ADMIN_PASSWORD, admin.passwordHash), 'Seed administrator password does not verify');

    const [example] = await db.select({ id: deals.id }).from(deals)
      .where(eq(deals.dealNumber, 'Q-2026-0147')).limit(1);
    assert(example, 'Worked-example deal Q-2026-0147 is missing');
    const [quote] = await db.select({
      id: quotations.id, revision: quotations.revision, status: quotations.status,
      listTotal: quotations.listTotal, discountAmount: quotations.discountAmount,
      netTotal: quotations.netTotal, priceBookVersionId: quotations.priceBookVersionId,
    }).from(quotations).where(eq(quotations.dealId, example.id)).limit(1);
    assert(quote?.revision === 3 && quote.status === 'issued', 'Worked-example r3 is not issued');
    assert(quote.listTotal === '871590.00' && quote.discountAmount === '183590.00'
      && quote.netTotal === '688000.00', 'Worked-example quotation totals do not match source');
    assert(quote.priceBookVersionId === book.id, 'Worked-example price book lock is wrong');
    const [lines, approvals, proposals] = await Promise.all([
      db.select({ id: quotationLines.id }).from(quotationLines).where(eq(quotationLines.quotationId, quote.id)),
      db.select({ stage: quotationApprovals.stage }).from(quotationApprovals)
        .where(eq(quotationApprovals.quotationId, quote.id)),
      db.select({ pdfBase64: technicalProposals.pdfBase64 }).from(technicalProposals)
        .where(eq(technicalProposals.quotationId, quote.id)),
    ]);
    assert(lines.length === 10, 'Worked-example quotation should have ten lines');
    assert(approvals.some((approval) => approval.stage === 'dept_manager')
      && approvals.some((approval) => approval.stage === 'gm'), 'Worked-example approvals are missing');
    assert(proposals[0]?.pdfBase64?.startsWith('JVBER'), 'Worked-example proposal PDF is missing');
  }

  process.stdout.write('Database smoke check passed: master data, Chinese names, price book, administrator, and worked-example quotation.\n');
}

smoke()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
