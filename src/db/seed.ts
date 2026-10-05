import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Papa from 'papaparse';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { and, eq, isNull } from 'drizzle-orm';
import { closeDb, getDb } from './client';
import { commissionBases, commissionModels, exclusivities, itemTypes, partnerRelationships, regions } from './enums';
import {
  customers, deals, designReviews, items, machineModels, partnerComplianceProfiles,
  partnerContracts, partners, priceBookVersions, prices, quotationApprovals,
  quotationLines, quotations, specCategories, technicalProposals, users,
} from './schema';
import { hashPassword } from '../lib/password';
import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '../lib/money';
import { calculateLine, calculateTotals } from '../features/deals/quote-math';
import { ensureReferenceData, referenceSpecCategories } from './reference-data';

function csvRows<T extends Record<string, string>>(file: string): T[] {
  const source = readFileSync(resolve(process.cwd(), file), 'utf8');
  const result = Papa.parse<T>(source, { header: true, skipEmptyLines: true });
  if (result.errors.length) {
    throw new Error(`${file}: ${result.errors.map((error) => `row ${error.row}: ${error.message}`).join('; ')}`);
  }
  return result.data;
}

function field(row: Record<string, string>, key: string): string {
  const value = row[key];
  if (value === undefined || value === '') throw new Error(`Missing ${key} in seed data`);
  return value;
}

function fromList<T extends string>(value: string, options: readonly T[], label: string): T {
  if (options.some((option) => option === value)) return value as T;
  throw new Error(`Invalid ${label} in seed data: ${value}`);
}

function referencedId(value: string | undefined, ids: Map<string, string>, label: string): string | null {
  if (!value) return null;
  const id = ids.get(value);
  if (!id) throw new Error(`Unknown ${label} in seed data: ${value}`);
  return id;
}

async function seed() {
  const databaseName = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);
  if (!databaseName.endsWith('_e2e')
    && !(databaseName === 'kaoming' && process.env.ALLOW_EXAMPLE_SEED === '1')) {
    throw new Error('Worked examples require a disposable *_e2e database or explicit demo seed permission');
  }
  const db = getDb();

  const modelRows = csvRows<Record<string, string>>('data/seed/machine-models.csv');
  const modelSpecs: Record<string, Record<string, { valueEn: string; valueZh: string }>> =
    JSON.parse(readFileSync(resolve(process.cwd(), 'data/seed/model-specs.template.json'), 'utf8'));
  for (const row of modelRows) {
    const modelCode = field(row, 'code');
    await db.insert(machineModels).values({
      code: modelCode,
      nameEn: field(row, 'name_en'),
      nameZh: field(row, 'name_zh'),
      productLine: row.product_line || null,
      proposalAssetUrl: modelCode === 'KMC-637AS' ? '/model-proposals/KMC-637AS.example.pdf' : null,
      baseSpecs: modelSpecs[modelCode] ?? null,
      isActive: row.is_active === 'true',
    }).onConflictDoNothing();
    if (modelSpecs[modelCode]) await db.update(machineModels)
      .set({ baseSpecs: modelSpecs[modelCode] })
      .where(and(eq(machineModels.code, modelCode), isNull(machineModels.baseSpecs)));
    if (modelCode === 'KMC-637AS') await db.update(machineModels)
      .set({ proposalAssetUrl: '/model-proposals/KMC-637AS.example.pdf' })
      .where(and(eq(machineModels.code, modelCode), isNull(machineModels.proposalAssetUrl)));
  }

  await ensureReferenceData();
  const categoryRows = referenceSpecCategories;

  const agentRows = csvRows<Record<string, string>>('data/seed/agents.template.csv');
  for (const row of agentRows) {
    await db.insert(partners).values({
      code: field(row, 'code'),
      name: field(row, 'name'),
      countryCode: field(row, 'country_code'),
      region: fromList(field(row, 'region'), regions, 'region'),
      lifecycleStatus: 'active',
      relationshipType: fromList(field(row, 'relationship_type'), partnerRelationships, 'relationship type'),
      commissionModel: fromList(field(row, 'commission_model'), commissionModels, 'commission model'),
      exclusivity: fromList(field(row, 'exclusivity'), exclusivities, 'exclusivity'),
    }).onConflictDoNothing();

    const [partner] = await db.select({ id: partners.id }).from(partners).where(eq(partners.code, field(row, 'code'))).limit(1);
    if (!partner) throw new Error(`Missing seeded partner ${field(row, 'code')}`);
    await db.insert(partnerComplianceProfiles).values({
      partnerId: partner.id,
      voltage: field(row, 'voltage'),
      frequency: field(row, 'frequency'),
      phase: field(row, 'phase'),
      ceVariant: field(row, 'ce_variant'),
      labelLanguages: field(row, 'label_languages').split(',').map((value) => value.trim()),
      nameplateRequired: row.nameplate_required === 'true',
      defaultColourCodes: row.code === 'A16001'
        ? ['790-49780H', '790-49K84', '790-47440F1H']
        : row.code === 'A11004' ? ['790-49780H', '790-49K84'] : null,
    }).onConflictDoNothing();
    if (row.code === 'A11004') await db.update(partnerComplianceProfiles)
      .set({ defaultColourCodes: ['790-49780H', '790-49K84'] })
      .where(and(eq(partnerComplianceProfiles.partnerId, partner.id), isNull(partnerComplianceProfiles.defaultColourCodes)));

    const [existingContract] = await db.select({ id: partnerContracts.id })
      .from(partnerContracts)
      .where(and(
        eq(partnerContracts.partnerId, partner.id),
        eq(partnerContracts.startDate, field(row, 'contract_start')),
        eq(partnerContracts.endDate, field(row, 'contract_end')),
      )).limit(1);
    if (!existingContract) {
      await db.insert(partnerContracts).values({
        partnerId: partner.id,
        startDate: field(row, 'contract_start'),
        endDate: field(row, 'contract_end'),
        noticePeriodDays: Number(field(row, 'notice_period_days')),
        commissionRate: row.commission_rate || null,
        commissionBase: row.commission_base
          ? fromList(row.commission_base, commissionBases, 'commission base')
          : null,
      });
    }
  }

  const modelIds = new Map((await db.select({ id: machineModels.id, code: machineModels.code }).from(machineModels))
    .map((row) => [row.code, row.id]));
  const categoryIds = new Map((await db.select({ id: specCategories.id, code: specCategories.code }).from(specCategories))
    .map((row) => [row.code, row.id]));

  const itemRows = csvRows<Record<string, string>>('data/seed/items.template.csv');
  for (const row of itemRows) {
    await db.insert(items).values({
      code: field(row, 'code'),
      nameEn: field(row, 'name_en'),
      nameZh: field(row, 'name_zh'),
      itemType: fromList(field(row, 'item_type'), itemTypes, 'item type'),
      specCategoryId: referencedId(row.spec_category, categoryIds, 'spec category'),
      machineModelId: referencedId(row.machine_model, modelIds, 'machine model'),
      unit: row.unit || 'set',
      isStandardAccessory: row.is_standard_accessory === 'true',
      specOverride: row.item_type === 'spec_change'
        ? { valueEn: field(row, 'spec_override_en'), valueZh: field(row, 'spec_override_zh') }
        : null,
    }).onConflictDoNothing();
  }

  await db.insert(priceBookVersions).values({
    name: '2026-H1', effectiveFrom: '2026-01-01', isPublished: true,
  }).onConflictDoNothing();
  const [version] = await db.select({ id: priceBookVersions.id }).from(priceBookVersions)
    .where(eq(priceBookVersions.name, '2026-H1')).limit(1);
  if (!version) throw new Error('Price book version was not seeded');
  const itemIds = new Map((await db.select({ id: items.id, code: items.code }).from(items))
    .map((row) => [row.code, row.id]));
  const priceRows = csvRows<Record<string, string>>('data/import-templates/price-list.csv');
  for (const row of priceRows) {
    const itemId = itemIds.get(field(row, 'item_code'));
    if (!itemId) throw new Error(`Price list item not in item master: ${field(row, 'item_code')}`);
    for (const [regionBand, currency, amount] of [
      ['eu', 'USD', field(row, 'price_usd_eu')],
      ['non_eu', 'USD', field(row, 'price_usd_non_eu')],
      ['non_eu', 'TWD', field(row, 'price_twd')],
    ] as const) {
      await db.insert(prices).values({
        priceBookVersionId: version.id, itemId, regionBand, currency,
        amount: minorUnitsToDecimal(parseDecimalToMinorUnits(amount)),
      }).onConflictDoNothing();
    }
  }

  // Worked example Q-2026-0147 contains additional non-EU USD option prices.
  // The supplied import template does not state their EU/TWD prices; do not invent them.
  const examplePrices: Record<string, string> = {
    'OPT-CTS40': '11228', 'OPT-CTS-H': '5273', 'OPT-AAC3': '4500',
    'OPT-PWR': '1926', 'SVC-INST': '24100', 'OPT-CHIP': '3973',
    'ACC-PROBE': '15023',
  };
  for (const [code, amount] of Object.entries(examplePrices)) {
    const itemId = itemIds.get(code);
    if (!itemId) throw new Error(`Worked-example price item missing: ${code}`);
    await db.insert(prices).values({
      priceBookVersionId: version.id, itemId, regionBand: 'non_eu', currency: 'USD',
      amount: minorUnitsToDecimal(parseDecimalToMinorUnits(amount)),
    }).onConflictDoNothing();
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error('Set both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, or neither');
  }
  if (adminEmail && adminPassword) {
    await db.insert(users).values({
      name: 'Administrator', email: adminEmail, role: 'admin',
      passwordHash: await hashPassword(adminPassword),
    }).onConflictDoNothing();
  }

  // The supplied worked example gives the issued r3 values, but not r1/r2.
  // Preserve r3 as a historical example without inventing earlier revisions.
  if (adminEmail) {
    const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.email, adminEmail)).limit(1);
    const [cp] = await db.select({ id: partners.id }).from(partners).where(eq(partners.code, 'A11004')).limit(1);
    const modelId = modelIds.get('KMC-637AS');
    if (!admin || !cp || !modelId) throw new Error('Worked-example deal references are missing');
    const [priorCustomer] = await db.select({ id: customers.id }).from(customers)
      .where(and(eq(customers.partnerId, cp.id), eq(customers.name, 'FAB TOOLS'))).limit(1);
    const customer = priorCustomer ?? (await db.insert(customers).values({
      partnerId: cp.id, name: 'FAB TOOLS', countryCode: 'IN', source: 'agent_disclosed',
      createdBy: admin.id, updatedBy: admin.id,
    }).returning({ id: customers.id }))[0]!;
    await db.insert(deals).values({
      dealNumber: 'Q-2026-0147', partnerId: cp.id, customerId: customer.id,
      machineModelId: modelId, salesStage: 'final_quotation', enquiryDate: '2026-08-14',
      currency: 'USD', regionBand: 'non_eu', ownerId: admin.id,
      createdBy: admin.id, updatedBy: admin.id,
    }).onConflictDoNothing();
    const [deal] = await db.select({ id: deals.id }).from(deals).where(eq(deals.dealNumber, 'Q-2026-0147')).limit(1);
    if (!deal) throw new Error('Worked-example deal was not seeded');
    const [priorQuote] = await db.select({ id: quotations.id }).from(quotations)
      .where(and(eq(quotations.dealId, deal.id), eq(quotations.revision, 3))).limit(1);
    if (!priorQuote) {
      const approvalActors = [
        { email: 'sample.department.manager@example.invalid', name: 'Sample department manager', department: 'Sales' },
        { email: 'sample.gm@example.invalid', name: 'Sample GM', department: 'GM' },
      ];
      for (const row of approvalActors) await db.insert(users).values({
        ...row, role: 'manager', passwordHash: null, isActive: false,
        createdBy: admin.id, updatedBy: admin.id,
      }).onConflictDoNothing();
      const [departmentManager] = await db.select({ id: users.id }).from(users)
        .where(eq(users.email, approvalActors[0]!.email)).limit(1);
      const [gm] = await db.select({ id: users.id }).from(users)
        .where(eq(users.email, approvalActors[1]!.email)).limit(1);
      if (!departmentManager || !gm) throw new Error('Sample approval actors missing');
      const [review] = await db.insert(designReviews).values({
        dealId: deal.id, requestedAt: new Date('2026-08-20T00:00:00Z'),
        reviewedBy: 'Worked-example design review', reviewedAt: new Date('2026-08-21T00:00:00Z'),
        outcome: 'confirmed', notes: 'Illustrative fixture; source review record unavailable',
        createdBy: admin.id, updatedBy: admin.id,
      }).returning({ id: designReviews.id });
      const [quote] = await db.insert(quotations).values({
        dealId: deal.id, revision: 3, status: 'draft', priceBookVersionId: version.id,
        paymentTerms: '30% down payment, balance by irrevocable at-sight LC before shipment',
        deliveryTerms: 'FOB Taiwan', leadTimeText: 'Within 10–12 months after receiving down payment',
        leadTimeWeeksFrom: 'deposit', leadTimeEndsAt: 'ready_to_ship', incoterm: 'FOB',
        warrantyMonths: 12, designReviewId: review!.id,
        createdBy: admin.id, updatedBy: admin.id,
      }).returning({ id: quotations.id });
      const exampleLines = [
        ['KMC-637AS', '686740', '0', true],
        ['OPT-ZW11', '58850', '58850', true],
        ['OPT-CTS40', '11228', '11228', true],
        ['OPT-CTS-H', '5273', '5273', true],
        ['OPT-AAC3', '4500', '4500', true],
        ['OPT-PWR', '1926', '1926', true],
        ['OPT-AUH', '75000', '75000', true],
        ['SVC-INST', '24100', '24100', true],
        ['OPT-CHIP', '3973', '2713', true],
        ['ACC-PROBE', '15023', '0', false],
      ] as const;
      const itemByCode = new Map((await db.select({
        id: items.id, code: items.code, nameEn: items.nameEn, nameZh: items.nameZh, itemType: items.itemType,
      }).from(items)).map((row) => [row.code, row]));
      for (const [index, [code, price, discount, included]] of exampleLines.entries()) {
        const item = itemByCode.get(code);
        if (!item) throw new Error(`Worked-example item missing: ${code}`);
        const line = calculateLine('1', price, discount, included);
        await db.insert(quotationLines).values({
          quotationId: quote!.id, lineNo: index + 1, itemId: item.id,
          itemType: included ? item.itemType : 'excluded', descriptionEn: item.nameEn,
          descriptionZh: item.nameZh, quantity: line.quantity, unitPrice: line.unitPrice,
          lineDiscount: line.lineDiscount, lineTotal: line.lineTotal,
          isIncludedInTotal: included, createdBy: admin.id, updatedBy: admin.id,
        });
      }
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595, 842]);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      page.drawText('KAO MING TECHNICAL PROPOSAL / WORKED EXAMPLE PART C', { x: 45, y: 790, size: 12, font });
      page.drawText('Q-2026-0147 / r3  |  CP Agencies / FAB TOOLS', { x: 45, y: 765, size: 10, font });
      page.drawText('Options quoted but not included: Renishaw RMP60 probe', { x: 45, y: 740, size: 10, font });
      page.drawText('Illustrative seed document. The full three-part merge is Phase 3.', { x: 45, y: 715, size: 9, font });
      const pdfBase64 = Buffer.from(await pdf.save()).toString('base64');
      await db.insert(technicalProposals).values({
        quotationId: quote!.id, pdfUrl: `/api/quotations/${quote!.id}/technical-proposal/pdf`,
        pdfBase64, generatedAt: new Date('2026-08-28T00:00:00Z'),
        createdBy: admin.id, updatedBy: admin.id,
      });
      await db.insert(quotationApprovals).values([
        { quotationId: quote!.id, stage: 'dept_manager', approvedBy: departmentManager.id,
          approvedAt: new Date('2026-08-27T00:00:00Z'), createdBy: admin.id, updatedBy: admin.id },
        { quotationId: quote!.id, stage: 'gm', approvedBy: gm.id,
          approvedAt: new Date('2026-08-28T00:00:00Z'), createdBy: admin.id, updatedBy: admin.id },
      ]);
      const totals = calculateTotals(exampleLines.map(([, price, discount, included]) => ({
        quantity: '1', unitPrice: price, lineDiscount: discount, isIncludedInTotal: included,
      })));
      if (totals.listTotal !== '871590.00' || totals.netTotal !== '688000.00') {
        throw new Error('Worked-example Q-2026-0147 totals do not match the source');
      }
      await db.update(quotations).set({
        ...totals, status: 'issued', issuedAt: new Date('2026-08-28T00:00:00Z'),
        validUntil: '2026-11-28', discountApprovedBy: gm.id,
        discountApprovedAt: new Date('2026-08-28T00:00:00Z'), updatedAt: new Date(), updatedBy: admin.id,
      }).where(eq(quotations.id, quote!.id));
    }
  }

  process.stdout.write(`Seeded ${modelRows.length} models, ${categoryRows.length} categories, ${agentRows.length} partners, ${itemRows.length} items, and ${priceRows.length} price-list rows.\n`);
}

seed()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
