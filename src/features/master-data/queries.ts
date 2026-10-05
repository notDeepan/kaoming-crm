import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  items, machineModels, partnerComplianceProfiles, partners, priceBookVersions,
  prices, specCategories,
} from '@/db/schema';

export async function listPartners() {
  return getDb().select({
    id: partners.id,
    code: partners.code,
    name: partners.name,
    nameZh: partners.nameZh,
    countryCode: partners.countryCode,
    region: partners.region,
    lifecycleStatus: partners.lifecycleStatus,
    relationshipType: partners.relationshipType,
    commissionModel: partners.commissionModel,
    exclusivity: partners.exclusivity,
    defaultCurrency: partners.defaultCurrency,
    notes: partners.notes,
    isComplianceComplete: partnerComplianceProfiles.isComplete,
  }).from(partners)
    .leftJoin(partnerComplianceProfiles, eq(partnerComplianceProfiles.partnerId, partners.id))
    .where(isNull(partners.deletedAt))
    .orderBy(asc(partners.name));
}

export async function getPartner(id: string) {
  const [row] = await getDb().select({
    id: partners.id,
    code: partners.code,
    name: partners.name,
    nameZh: partners.nameZh,
    countryCode: partners.countryCode,
    region: partners.region,
    lifecycleStatus: partners.lifecycleStatus,
    relationshipType: partners.relationshipType,
    commissionModel: partners.commissionModel,
    exclusivity: partners.exclusivity,
    defaultCurrency: partners.defaultCurrency,
    notes: partners.notes,
    profile: {
      voltage: partnerComplianceProfiles.voltage,
      frequency: partnerComplianceProfiles.frequency,
      phase: partnerComplianceProfiles.phase,
      ceVariant: partnerComplianceProfiles.ceVariant,
      labelLanguages: partnerComplianceProfiles.labelLanguages,
      nameplateRequired: partnerComplianceProfiles.nameplateRequired,
      defaultColourCodes: partnerComplianceProfiles.defaultColourCodes,
      isComplete: partnerComplianceProfiles.isComplete,
    },
  }).from(partners)
    .leftJoin(partnerComplianceProfiles, eq(partnerComplianceProfiles.partnerId, partners.id))
    .where(and(eq(partners.id, id), isNull(partners.deletedAt)))
    .limit(1);
  return row;
}

export async function listMachineModels() {
  return getDb().select({
    id: machineModels.id,
    code: machineModels.code,
    nameEn: machineModels.nameEn,
    nameZh: machineModels.nameZh,
    productLine: machineModels.productLine,
    proposalAssetUrl: machineModels.proposalAssetUrl,
    proposalAssetName: machineModels.proposalAssetName,
    isActive: machineModels.isActive,
  }).from(machineModels).where(isNull(machineModels.deletedAt)).orderBy(asc(machineModels.code));
}

export async function getMachineModel(id: string) {
  const [row] = await getDb().select({
    id: machineModels.id,
    code: machineModels.code,
    nameEn: machineModels.nameEn,
    nameZh: machineModels.nameZh,
    productLine: machineModels.productLine,
    proposalAssetUrl: machineModels.proposalAssetUrl,
    proposalAssetName: machineModels.proposalAssetName,
    baseSpecs: machineModels.baseSpecs,
    isActive: machineModels.isActive,
  }).from(machineModels).where(and(eq(machineModels.id, id), isNull(machineModels.deletedAt))).limit(1);
  return row;
}

export async function listSpecCategories() {
  return getDb().select({ id: specCategories.id, code: specCategories.code, nameEn: specCategories.nameEn,
    nameZh: specCategories.nameZh })
    .from(specCategories).where(isNull(specCategories.deletedAt)).orderBy(asc(specCategories.sortOrder));
}

export async function listItems() {
  return getDb().select({
    id: items.id,
    code: items.code,
    nameEn: items.nameEn,
    nameZh: items.nameZh,
    itemType: items.itemType,
    specOverride: items.specOverride,
    specCategoryId: items.specCategoryId,
    machineModelId: items.machineModelId,
    unit: items.unit,
    isStandardAccessory: items.isStandardAccessory,
  }).from(items).where(isNull(items.deletedAt)).orderBy(asc(items.code));
}

export async function getItem(id: string) {
  const [row] = await getDb().select({
    id: items.id,
    code: items.code,
    nameEn: items.nameEn,
    nameZh: items.nameZh,
    itemType: items.itemType,
    specOverride: items.specOverride,
    specCategoryId: items.specCategoryId,
    machineModelId: items.machineModelId,
    unit: items.unit,
    isStandardAccessory: items.isStandardAccessory,
  }).from(items).where(and(eq(items.id, id), isNull(items.deletedAt))).limit(1);
  return row;
}

export async function listPriceBookVersions() {
  return getDb().select({
    id: priceBookVersions.id,
    name: priceBookVersions.name,
    effectiveFrom: priceBookVersions.effectiveFrom,
    effectiveTo: priceBookVersions.effectiveTo,
    isPublished: priceBookVersions.isPublished,
  }).from(priceBookVersions).where(isNull(priceBookVersions.deletedAt))
    .orderBy(asc(priceBookVersions.effectiveFrom));
}

export async function getPriceBookVersion(id: string) {
  const [row] = await getDb().select({
    id: priceBookVersions.id,
    name: priceBookVersions.name,
    effectiveFrom: priceBookVersions.effectiveFrom,
    effectiveTo: priceBookVersions.effectiveTo,
    isPublished: priceBookVersions.isPublished,
  }).from(priceBookVersions).where(and(eq(priceBookVersions.id, id), isNull(priceBookVersions.deletedAt))).limit(1);
  return row;
}

export async function listVersionPrices(versionId: string) {
  return getDb().select({
    itemCode: items.code,
    itemNameEn: items.nameEn,
    itemNameZh: items.nameZh,
    regionBand: prices.regionBand,
    currency: prices.currency,
    amount: prices.amount,
  }).from(prices)
    .innerJoin(items, eq(items.id, prices.itemId))
    .where(and(eq(prices.priceBookVersionId, versionId), isNull(prices.deletedAt)))
    .orderBy(asc(items.code), asc(prices.regionBand));
}
