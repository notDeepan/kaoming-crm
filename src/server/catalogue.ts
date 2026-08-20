import "server-only";
import { prisma } from "@/lib/prisma";
import type { SpecSource } from "@/lib/spec";

// Convert Prisma Decimals to plain numbers for the spec resolver (which is framework-free).
function toSpecSource(row: Record<string, unknown> | null): SpecSource | null {
  if (!row) return null;
  const num = (v: unknown) => (v == null ? null : Number(v));
  const str = (v: unknown) => (v == null ? null : String(v));
  return {
    travelXValue: num(row.travelXValue), travelXUnit: str(row.travelXUnit),
    travelYValue: num(row.travelYValue), travelYUnit: str(row.travelYUnit),
    travelZValue: num(row.travelZValue), travelZUnit: str(row.travelZUnit),
    distanceColumnsValue: num(row.distanceColumnsValue), distanceColumnsUnit: str(row.distanceColumnsUnit),
    spindleTaper: str(row.spindleTaper),
    spindleNoseToTable: str(row.spindleNoseToTable),
    spindleMotorTorqueValue: num(row.spindleMotorTorqueValue), spindleMotorTorqueUnit: str(row.spindleMotorTorqueUnit),
    spindleMotorPowerValue: num(row.spindleMotorPowerValue), spindleMotorPowerUnit: str(row.spindleMotorPowerUnit),
    spindleSpeedVValue: num(row.spindleSpeedVValue), spindleSpeedVUnit: str(row.spindleSpeedVUnit),
    spindleSpeedHValue: num(row.spindleSpeedHValue), spindleSpeedHUnit: str(row.spindleSpeedHUnit),
    toolMagazine: str(row.toolMagazine),
    tableAreaXValue: num(row.tableAreaXValue), tableAreaXUnit: str(row.tableAreaXUnit),
    tableAreaYValue: num(row.tableAreaYValue), tableAreaYUnit: str(row.tableAreaYUnit),
    maxTableLoadingValue: num(row.maxTableLoadingValue), maxTableLoadingUnit: str(row.maxTableLoadingUnit),
    splashGuardText: str(row.splashGuardText),
    standardAccessories: str(row.standardAccessories),
  };
}

export async function listSeries() {
  return prisma.machineSeries.findMany({
    where: { deletedAt: null },
    orderBy: { seriesCode: "asc" },
    include: { _count: { select: { models: { where: { deletedAt: null } } } } },
  });
}

export async function getSeries(id: string) {
  return prisma.machineSeries.findFirst({
    where: { id, deletedAt: null },
    include: {
      models: { where: { deletedAt: null }, orderBy: { modelCode: "asc" } },
      seriesOptions: { include: { modelOption: true } },
    },
  });
}

export async function listModels() {
  const models = await prisma.machineModel.findMany({
    where: { deletedAt: null },
    include: { series: { select: { seriesCode: true, nameEn: true } } },
    orderBy: [{ seriesId: "asc" }, { modelCode: "asc" }],
  });
  return models;
}

export async function getModel(id: string) {
  return prisma.machineModel.findFirst({
    where: { id, deletedAt: null },
    include: { series: true },
  });
}

/** Resolve the flattened spec for a model (model over series), as a plain SpecSource (Q-35). */
export async function resolvedSpec(modelId: string): Promise<{ model: Awaited<ReturnType<typeof getModel>>; spec: SpecSource } | null> {
  const model = await getModel(modelId);
  if (!model) return null;
  const { mergeSpec } = await import("@/lib/spec");
  const spec = mergeSpec(toSpecSource(model.series as unknown as Record<string, unknown>), toSpecSource(model as unknown as Record<string, unknown>));
  return { model, spec };
}

/**
 * Options available for a model: the series' applicable set (Q-33) unioned with any model-level
 * applicability exceptions, minus soft-deleted options. Availability is real — 90° Head and Manual
 * Universal Head are not on the HMA series, so they never appear when quoting an HMA model.
 */
export async function availableOptions(modelId: string) {
  const model = await prisma.machineModel.findUnique({ where: { id: modelId }, select: { seriesId: true } });
  const seriesOptionIds = model?.seriesId
    ? (await prisma.machineSeriesOption.findMany({ where: { machineSeriesId: model.seriesId }, select: { modelOptionId: true } })).map((r) => r.modelOptionId)
    : [];
  const modelOptionIds = (
    await prisma.modelOptionApplicability.findMany({ where: { machineModelId: modelId }, select: { modelOptionId: true } })
  ).map((r) => r.modelOptionId);
  const ids = Array.from(new Set([...seriesOptionIds, ...modelOptionIds]));
  if (ids.length === 0) return [];
  return prisma.modelOption.findMany({
    where: { id: { in: ids }, deletedAt: null },
    orderBy: [{ category: "asc" }, { optionNameEn: "asc" }],
  });
}

export async function listOptions() {
  return prisma.modelOption.findMany({ where: { deletedAt: null }, orderBy: [{ category: "asc" }, { optionCode: "asc" }] });
}

export async function getOption(id: string) {
  return prisma.modelOption.findFirst({
    where: { id, deletedAt: null },
    include: { applicabilities: true, seriesApplicabilities: true },
  });
}

export async function seriesAndModelOptionsForForm() {
  const [series, models] = await Promise.all([
    prisma.machineSeries.findMany({ where: { deletedAt: null }, select: { id: true, seriesCode: true, nameEn: true }, orderBy: { seriesCode: "asc" } }),
    prisma.machineModel.findMany({ where: { deletedAt: null }, select: { id: true, modelCode: true }, orderBy: { modelCode: "asc" } }),
  ]);
  return { series, models };
}
