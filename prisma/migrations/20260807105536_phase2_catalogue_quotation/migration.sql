/*
  Warnings:

  - You are about to drop the column `maxLoad` on the `machine_model` table. All the data in the column will be lost.
  - You are about to drop the column `netWeight` on the `machine_model` table. All the data in the column will be lost.
  - You are about to drop the column `standardController` on the `machine_model` table. All the data in the column will be lost.
  - You are about to drop the column `standardSpindle` on the `machine_model` table. All the data in the column will be lost.
  - You are about to drop the column `tableSize` on the `machine_model` table. All the data in the column will be lost.
  - You are about to drop the column `travelX` on the `machine_model` table. All the data in the column will be lost.
  - You are about to drop the column `travelY` on the `machine_model` table. All the data in the column will be lost.
  - You are about to drop the column `travelZ` on the `machine_model` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "machine_series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seriesCode" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameZh" TEXT,
    "productFamily" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "codeMappingJson" JSONB,
    "descriptionEn" TEXT,
    "descriptionZh" TEXT,
    "travelXValue" DECIMAL,
    "travelXUnit" TEXT,
    "travelYValue" DECIMAL,
    "travelYUnit" TEXT,
    "travelZValue" DECIMAL,
    "travelZUnit" TEXT,
    "distanceColumnsValue" DECIMAL,
    "distanceColumnsUnit" TEXT,
    "spindleTaper" TEXT,
    "spindleNoseToTable" TEXT,
    "spindleMotorTorqueValue" DECIMAL,
    "spindleMotorTorqueUnit" TEXT,
    "spindleMotorPowerValue" DECIMAL,
    "spindleMotorPowerUnit" TEXT,
    "spindleSpeedVValue" DECIMAL,
    "spindleSpeedVUnit" TEXT,
    "spindleSpeedHValue" DECIMAL,
    "spindleSpeedHUnit" TEXT,
    "toolMagazine" TEXT,
    "tableAreaXValue" DECIMAL,
    "tableAreaXUnit" TEXT,
    "tableAreaYValue" DECIMAL,
    "tableAreaYUnit" TEXT,
    "maxTableLoadingValue" DECIMAL,
    "maxTableLoadingUnit" TEXT,
    "splashGuardText" TEXT,
    "rapidTraverseValue" DECIMAL,
    "rapidTraverseUnit" TEXT,
    "positioningAccuracy" TEXT,
    "repeatability" TEXT,
    "machineHeightValue" DECIMAL,
    "machineHeightUnit" TEXT,
    "floorSpace" TEXT,
    "netWeightValue" DECIMAL,
    "netWeightUnit" TEXT,
    "controller" TEXT,
    "electricalSupply" TEXT,
    "airPressure" TEXT,
    "toolShankShape" TEXT,
    "extraSpecsJson" JSONB,
    "standardAccessories" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "machine_series_option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "machineSeriesId" TEXT NOT NULL,
    "modelOptionId" TEXT NOT NULL,
    CONSTRAINT "machine_series_option_machineSeriesId_fkey" FOREIGN KEY ("machineSeriesId") REFERENCES "machine_series" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "machine_series_option_modelOptionId_fkey" FOREIGN KEY ("modelOptionId") REFERENCES "model_option" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "remembered_value" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "country" TEXT,
    "userId" TEXT,
    "useCount" INTEGER NOT NULL DEFAULT 1,
    "isCountryDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_machine_model" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelCode" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "productFamily" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "seriesId" TEXT,
    "basePriceUsd" DECIMAL,
    "basePriceTwd" DECIMAL,
    "standardLeadTimeDays" INTEGER,
    "specSheetDocumentId" TEXT,
    "descriptionEn" TEXT,
    "descriptionZh" TEXT,
    "travelXValue" DECIMAL,
    "travelXUnit" TEXT,
    "travelYValue" DECIMAL,
    "travelYUnit" TEXT,
    "travelZValue" DECIMAL,
    "travelZUnit" TEXT,
    "distanceColumnsValue" DECIMAL,
    "distanceColumnsUnit" TEXT,
    "spindleTaper" TEXT,
    "spindleNoseToTable" TEXT,
    "spindleMotorTorqueValue" DECIMAL,
    "spindleMotorTorqueUnit" TEXT,
    "spindleMotorPowerValue" DECIMAL,
    "spindleMotorPowerUnit" TEXT,
    "spindleSpeedVValue" DECIMAL,
    "spindleSpeedVUnit" TEXT,
    "spindleSpeedHValue" DECIMAL,
    "spindleSpeedHUnit" TEXT,
    "toolMagazine" TEXT,
    "tableAreaXValue" DECIMAL,
    "tableAreaXUnit" TEXT,
    "tableAreaYValue" DECIMAL,
    "tableAreaYUnit" TEXT,
    "maxTableLoadingValue" DECIMAL,
    "maxTableLoadingUnit" TEXT,
    "splashGuardText" TEXT,
    "rapidTraverseValue" DECIMAL,
    "rapidTraverseUnit" TEXT,
    "positioningAccuracy" TEXT,
    "repeatability" TEXT,
    "machineHeightValue" DECIMAL,
    "machineHeightUnit" TEXT,
    "floorSpace" TEXT,
    "netWeightValue" DECIMAL,
    "netWeightUnit" TEXT,
    "controller" TEXT,
    "electricalSupply" TEXT,
    "airPressure" TEXT,
    "toolShankShape" TEXT,
    "extraSpecsJson" JSONB,
    "standardAccessories" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "machine_model_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "machine_series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_machine_model" ("basePriceTwd", "basePriceUsd", "createdAt", "createdById", "deletedAt", "descriptionEn", "descriptionZh", "id", "modelCode", "modelName", "productFamily", "specSheetDocumentId", "standardLeadTimeDays", "status", "updatedAt", "updatedById") SELECT "basePriceTwd", "basePriceUsd", "createdAt", "createdById", "deletedAt", "descriptionEn", "descriptionZh", "id", "modelCode", "modelName", "productFamily", "specSheetDocumentId", "standardLeadTimeDays", "status", "updatedAt", "updatedById" FROM "machine_model";
DROP TABLE "machine_model";
ALTER TABLE "new_machine_model" RENAME TO "machine_model";
CREATE UNIQUE INDEX "machine_model_modelCode_key" ON "machine_model"("modelCode");
CREATE INDEX "machine_model_productFamily_idx" ON "machine_model"("productFamily");
CREATE INDEX "machine_model_status_idx" ON "machine_model"("status");
CREATE INDEX "machine_model_seriesId_idx" ON "machine_model"("seriesId");
CREATE TABLE "new_quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNo" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "opportunityId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "agentId" TEXT,
    "quoteTo" TEXT NOT NULL,
    "issueDate" DATETIME,
    "validityDays" INTEGER NOT NULL,
    "validUntil" DATETIME,
    "validityText" TEXT,
    "currency" TEXT NOT NULL,
    "exchangeRateToTwd" DECIMAL,
    "incoterms" TEXT,
    "namedPlace" TEXT,
    "paymentTerms" TEXT,
    "leadTimeDays" INTEGER,
    "warrantyTerms" TEXT,
    "status" TEXT NOT NULL,
    "preparedById" TEXT NOT NULL,
    "notesToCustomer" TEXT,
    "internalNotes" TEXT,
    "refNo" TEXT,
    "unitSystem" TEXT NOT NULL DEFAULT 'metric',
    "machineType" TEXT,
    "machineConfigHeading" TEXT,
    "placeOfDelivery" TEXT,
    "timeOfDelivery" TEXT,
    "sectionManagerName" TEXT,
    "showDiscountOnPrint" BOOLEAN NOT NULL DEFAULT false,
    "discountPercent" DECIMAL,
    "machineModelId" TEXT,
    "specLinesJson" JSONB,
    "configurationSnapshot" JSONB,
    "previousRevisionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "quotation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quotation_machineModelId_fkey" FOREIGN KEY ("machineModelId") REFERENCES "machine_model" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quotation_previousRevisionId_fkey" FOREIGN KEY ("previousRevisionId") REFERENCES "quotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_quotation" ("agentId", "configurationSnapshot", "createdAt", "createdById", "currency", "customerId", "deletedAt", "exchangeRateToTwd", "id", "incoterms", "internalNotes", "issueDate", "leadTimeDays", "namedPlace", "notesToCustomer", "opportunityId", "paymentTerms", "preparedById", "previousRevisionId", "quoteNo", "quoteTo", "revision", "status", "updatedAt", "updatedById", "validUntil", "validityDays", "warrantyTerms") SELECT "agentId", "configurationSnapshot", "createdAt", "createdById", "currency", "customerId", "deletedAt", "exchangeRateToTwd", "id", "incoterms", "internalNotes", "issueDate", "leadTimeDays", "namedPlace", "notesToCustomer", "opportunityId", "paymentTerms", "preparedById", "previousRevisionId", "quoteNo", "quoteTo", "revision", "status", "updatedAt", "updatedById", "validUntil", "validityDays", "warrantyTerms" FROM "quotation";
DROP TABLE "quotation";
ALTER TABLE "new_quotation" RENAME TO "quotation";
CREATE UNIQUE INDEX "quotation_previousRevisionId_key" ON "quotation"("previousRevisionId");
CREATE INDEX "quotation_status_idx" ON "quotation"("status");
CREATE INDEX "quotation_opportunityId_idx" ON "quotation"("opportunityId");
CREATE UNIQUE INDEX "quotation_quoteNo_revision_key" ON "quotation"("quoteNo", "revision");
CREATE TABLE "new_quotation_line" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "lineType" TEXT NOT NULL,
    "lineKind" TEXT NOT NULL DEFAULT 'option',
    "machineModelId" TEXT,
    "modelOptionId" TEXT,
    "descriptionEn" TEXT NOT NULL,
    "descriptionZh" TEXT,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL,
    "discountPercent" DECIMAL,
    "lineTotal" DECIMAL,
    "leadTimeImpactDays" INTEGER,
    "requiresEngineeringReview" BOOLEAN NOT NULL DEFAULT false,
    "engineeringReviewStatus" TEXT,
    "internalCost" DECIMAL,
    CONSTRAINT "quotation_line_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quotation_line_machineModelId_fkey" FOREIGN KEY ("machineModelId") REFERENCES "machine_model" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quotation_line_modelOptionId_fkey" FOREIGN KEY ("modelOptionId") REFERENCES "model_option" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_quotation_line" ("descriptionEn", "descriptionZh", "discountPercent", "engineeringReviewStatus", "id", "internalCost", "leadTimeImpactDays", "lineNo", "lineTotal", "lineType", "machineModelId", "modelOptionId", "quantity", "quotationId", "requiresEngineeringReview", "unitPrice") SELECT "descriptionEn", "descriptionZh", "discountPercent", "engineeringReviewStatus", "id", "internalCost", "leadTimeImpactDays", "lineNo", "lineTotal", "lineType", "machineModelId", "modelOptionId", "quantity", "quotationId", "requiresEngineeringReview", "unitPrice" FROM "quotation_line";
DROP TABLE "quotation_line";
ALTER TABLE "new_quotation_line" RENAME TO "quotation_line";
CREATE INDEX "quotation_line_quotationId_idx" ON "quotation_line"("quotationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "machine_series_seriesCode_key" ON "machine_series"("seriesCode");

-- CreateIndex
CREATE INDEX "machine_series_productFamily_idx" ON "machine_series"("productFamily");

-- CreateIndex
CREATE UNIQUE INDEX "machine_series_option_machineSeriesId_modelOptionId_key" ON "machine_series_option"("machineSeriesId", "modelOptionId");

-- CreateIndex
CREATE INDEX "remembered_value_fieldKey_country_idx" ON "remembered_value"("fieldKey", "country");

-- CreateIndex
CREATE INDEX "remembered_value_fieldKey_isCountryDefault_idx" ON "remembered_value"("fieldKey", "isCountryDefault");
