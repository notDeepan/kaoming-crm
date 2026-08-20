-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNo" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "opportunityId" TEXT,
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
    CONSTRAINT "quotation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quotation_machineModelId_fkey" FOREIGN KEY ("machineModelId") REFERENCES "machine_model" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quotation_previousRevisionId_fkey" FOREIGN KEY ("previousRevisionId") REFERENCES "quotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_quotation" ("agentId", "configurationSnapshot", "createdAt", "createdById", "currency", "customerId", "deletedAt", "discountPercent", "exchangeRateToTwd", "id", "incoterms", "internalNotes", "issueDate", "leadTimeDays", "machineConfigHeading", "machineModelId", "machineType", "namedPlace", "notesToCustomer", "opportunityId", "paymentTerms", "placeOfDelivery", "preparedById", "previousRevisionId", "quoteNo", "quoteTo", "refNo", "revision", "sectionManagerName", "showDiscountOnPrint", "specLinesJson", "status", "timeOfDelivery", "unitSystem", "updatedAt", "updatedById", "validUntil", "validityDays", "validityText", "warrantyTerms") SELECT "agentId", "configurationSnapshot", "createdAt", "createdById", "currency", "customerId", "deletedAt", "discountPercent", "exchangeRateToTwd", "id", "incoterms", "internalNotes", "issueDate", "leadTimeDays", "machineConfigHeading", "machineModelId", "machineType", "namedPlace", "notesToCustomer", "opportunityId", "paymentTerms", "placeOfDelivery", "preparedById", "previousRevisionId", "quoteNo", "quoteTo", "refNo", "revision", "sectionManagerName", "showDiscountOnPrint", "specLinesJson", "status", "timeOfDelivery", "unitSystem", "updatedAt", "updatedById", "validUntil", "validityDays", "validityText", "warrantyTerms" FROM "quotation";
DROP TABLE "quotation";
ALTER TABLE "new_quotation" RENAME TO "quotation";
CREATE UNIQUE INDEX "quotation_previousRevisionId_key" ON "quotation"("previousRevisionId");
CREATE INDEX "quotation_status_idx" ON "quotation"("status");
CREATE INDEX "quotation_opportunityId_idx" ON "quotation"("opportunityId");
CREATE UNIQUE INDEX "quotation_quoteNo_revision_key" ON "quotation"("quoteNo", "revision");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
