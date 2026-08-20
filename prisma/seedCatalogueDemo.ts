/**
 * DEMO catalogue seed — a placeholder Minerva (HMA) series + one model + options, so the quotation
 * flow is demonstrable end to end. The Bow Way catalogue PDF is scanned (no text layer) and could
 * not be machine-read, so these spec numbers are PLACEHOLDERS, prices are null (A7), and this must
 * be replaced by the real HMA data (§9.6 / Q-06A) before any real quotation is sent.
 *
 * Run:  npx tsx prisma/seedCatalogueDemo.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.machineSeriesOption.deleteMany();
  await prisma.modelOptionApplicability.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.modelOption.deleteMany();
  await prisma.machineModel.deleteMany();
  await prisma.machineSeries.deleteMany();

  // Series holds the constant fields (A10 Q-33). PLACEHOLDER values.
  const hma = await prisma.machineSeries.create({
    data: {
      seriesCode: "HMA",
      nameEn: "Minerva (HMA) — PLACEHOLDER, load real catalogue",
      nameZh: "Minerva 系列（HMA）— 佔位資料",
      productFamily: "multi_face",
      status: "active",
      // per-series digit→mm mapping for add-variant prefill (Q-37) — PLACEHOLDER
      codeMappingJson: {
        xDigits: 1, distanceDigits: 2, unit: "mm",
        xMap: { "3": 3000, "4": 4000, "5": 5000, "6": 6000 },
        distanceMap: { "18": 1800, "20": 2000, "25": 2500 },
      },
      travelZValue: 1000, travelZUnit: "mm",
      spindleTaper: "BBT-50",
      spindleNoseToTable: "150–1150 mm",
      spindleMotorTorqueValue: 120, spindleMotorTorqueUnit: "Nm",
      spindleMotorPowerValue: 45, spindleMotorPowerUnit: "kW",
      spindleSpeedVValue: 6000, spindleSpeedVUnit: "rpm",
      spindleSpeedHValue: 3500, spindleSpeedHUnit: "rpm",
      toolMagazine: "30 ATC standard",
      splashGuardText: "Fully enclosed splash guard",
      controller: "FANUC 0iMF Plus",
      positioningAccuracy: "±0.005 mm",
      repeatability: "±0.003 mm",
      standardAccessories:
        "Heat exchanger for electrical cabinet\nAutomatic lubrication system\nWork lamp\nLevelling bolts and blocks\nTool box and tool kit\nOperation and maintenance manuals",
    },
  });

  // Model holds the size-varying fields (Q-34). PLACEHOLDER for KMC-318HMA15.
  const m = await prisma.machineModel.create({
    data: {
      modelCode: "KMC-318HMA15",
      modelName: "Minerva HMA — 318 (variant 15)",
      productFamily: "multi_face",
      status: "active",
      seriesId: hma.id,
      descriptionEn: "PLACEHOLDER specs — replace with Bow Way catalogue values.",
      travelXValue: 3000, travelXUnit: "mm",
      travelYValue: 1800, travelYUnit: "mm",
      distanceColumnsValue: 1800, distanceColumnsUnit: "mm",
      tableAreaXValue: 3000, tableAreaXUnit: "mm",
      tableAreaYValue: 1600, tableAreaYUnit: "mm",
      maxTableLoadingValue: 8, maxTableLoadingUnit: "t",
      netWeightValue: 22000, netWeightUnit: "kg",
      // basePrice left null (A7) — the salesperson types it on the quote (Q-25)
    },
  });

  // Options — two available on HMA, two deliberately NOT (A2 example: 90° Head, Manual Universal Head).
  const [linear, coolant, head90, universal] = await Promise.all([
    prisma.modelOption.create({ data: { optionCode: "OPT-LS-XYZ", optionNameEn: "Linear scales (X/Y/Z)", optionNameZh: "光學尺（X/Y/Z）", category: "linear_scales" } }),
    prisma.modelOption.create({ data: { optionCode: "OPT-CTS-20", optionNameEn: "Coolant through spindle, 20 bar", optionNameZh: "主軸中心出水 20 bar", category: "coolant" } }),
    prisma.modelOption.create({ data: { optionCode: "OPT-HEAD-90", optionNameEn: "90° Head", optionNameZh: "90 度角度頭", category: "attachment_head", mutexGroup: "head" } }),
    prisma.modelOption.create({ data: { optionCode: "OPT-HEAD-UNI", optionNameEn: "Manual Universal Head", optionNameZh: "手動萬向頭", category: "attachment_head", mutexGroup: "head" } }),
  ]);

  // HMA's applicable set — linear scales + coolant only; the two heads are NOT applicable.
  await prisma.machineSeriesOption.createMany({
    data: [
      { machineSeriesId: hma.id, modelOptionId: linear.id },
      { machineSeriesId: hma.id, modelOptionId: coolant.id },
    ],
  });
  // head options exist and apply to OTHER series, proving availability is real (they must not show on HMA)
  void head90; void universal;

  console.log("Demo catalogue seeded:", {
    series: hma.seriesCode, model: m.modelCode,
    optionsOnHMA: ["OPT-LS-XYZ", "OPT-CTS-20"], optionsNotOnHMA: ["OPT-HEAD-90", "OPT-HEAD-UNI"],
    note: "PLACEHOLDER specs, prices null — replace with real Bow Way catalogue data.",
  });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
