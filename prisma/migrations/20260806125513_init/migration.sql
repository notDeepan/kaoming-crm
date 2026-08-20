-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fullNameZh" TEXT,
    "role" TEXT NOT NULL,
    "languagePreference" TEXT NOT NULL DEFAULT 'en',
    "jobTitle" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLoginAt" DATETIME,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "system_setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "summary" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "payloadJson" JSONB,
    "readAt" DATETIME,
    "emailSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_preference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "delivery" TEXT NOT NULL DEFAULT 'digest',
    CONSTRAINT "notification_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "saved_view" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "saved_view_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentCode" TEXT NOT NULL,
    "companyNameEn" TEXT NOT NULL,
    "companyNameLocal" TEXT,
    "agentType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "website" TEXT,
    "logoDocumentId" TEXT,
    "territoryNotes" TEXT,
    "exclusivity" TEXT,
    "exclusiveProductFamilies" JSONB,
    "agreementStartDate" DATETIME,
    "agreementEndDate" DATETIME,
    "commissionPercent" DECIMAL,
    "standardDiscountPercent" DECIMAL,
    "pricingBasis" TEXT,
    "paymentTerms" TEXT,
    "preferredCurrency" TEXT,
    "preferredIncoterms" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "primaryContactId" TEXT,
    "workingLanguage" TEXT,
    "lastContactDate" DATETIME,
    "nextContactDue" DATETIME,
    "contactCadenceDays" INTEGER,
    "firstAppointedDate" DATETIME,
    "notes" TEXT,
    "tags" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "agent_territory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "exclusivity" TEXT,
    "productFamily" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_territory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerCode" TEXT NOT NULL,
    "companyNameEn" TEXT NOT NULL,
    "companyNameLocal" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "addressEn" TEXT,
    "addressLocal" TEXT,
    "industry" TEXT,
    "customerType" TEXT NOT NULL,
    "primaryAgentId" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "website" TEXT,
    "employeeCount" INTEGER,
    "existingMachinesNotes" TEXT,
    "notes" TEXT,
    "tags" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "customer_primaryAgentId_fkey" FOREIGN KEY ("primaryAgentId") REFERENCES "agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentType" TEXT NOT NULL,
    "agentId" TEXT,
    "customerId" TEXT,
    "fullName" TEXT NOT NULL,
    "nameLocal" TEXT,
    "jobTitle" TEXT,
    "roleInDeal" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "messagingHandle" TEXT,
    "preferredLanguage" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "contact_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "enquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enquiryNo" TEXT NOT NULL,
    "receivedDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "sourceDetail" TEXT,
    "enquiryType" TEXT NOT NULL,
    "agentId" TEXT,
    "customerId" TEXT,
    "customerNameRaw" TEXT,
    "country" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "productInterest" JSONB,
    "requirementSummary" TEXT,
    "status" TEXT NOT NULL,
    "notPursuedReason" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "nextActionDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "enquiry_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "enquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "agentId" TEXT,
    "country" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "probability" INTEGER,
    "estimatedValue" DECIMAL,
    "currency" TEXT NOT NULL,
    "expectedOrderDate" DATETIME,
    "expectedDeliveryDate" DATETIME,
    "productFamilies" JSONB,
    "machineQuantity" INTEGER DEFAULT 1,
    "requirementSummary" TEXT,
    "competitors" JSONB,
    "sourceEnquiryId" TEXT,
    "nextAction" TEXT,
    "nextActionDate" DATETIME,
    "lostReason" TEXT,
    "lostToCompetitor" TEXT,
    "stageChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opportunity_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "opportunity_sourceEnquiryId_fkey" FOREIGN KEY ("sourceEnquiryId") REFERENCES "enquiry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opportunity_stage_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "changedById" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_stage_history_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quotation" (
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
    CONSTRAINT "quotation_previousRevisionId_fkey" FOREIGN KEY ("previousRevisionId") REFERENCES "quotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quotation_line" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "lineType" TEXT NOT NULL,
    "machineModelId" TEXT,
    "modelOptionId" TEXT,
    "descriptionEn" TEXT NOT NULL,
    "descriptionZh" TEXT,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL,
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

-- CreateTable
CREATE TABLE "machine_model" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelCode" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "productFamily" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tableSize" TEXT,
    "travelX" TEXT,
    "travelY" TEXT,
    "travelZ" TEXT,
    "maxLoad" TEXT,
    "standardSpindle" TEXT,
    "standardController" TEXT,
    "basePriceUsd" DECIMAL,
    "basePriceTwd" DECIMAL,
    "standardLeadTimeDays" INTEGER,
    "netWeight" TEXT,
    "specSheetDocumentId" TEXT,
    "descriptionEn" TEXT,
    "descriptionZh" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "model_option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionCode" TEXT NOT NULL,
    "optionNameEn" TEXT NOT NULL,
    "optionNameZh" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priceUsd" DECIMAL,
    "priceTwd" DECIMAL,
    "isStandard" BOOLEAN NOT NULL DEFAULT false,
    "mutexGroup" TEXT,
    "leadTimeImpactDays" INTEGER,
    "requiresEngineeringReview" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "model_option_applicability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelOptionId" TEXT NOT NULL,
    "machineModelId" TEXT NOT NULL,
    CONSTRAINT "model_option_applicability_modelOptionId_fkey" FOREIGN KEY ("modelOptionId") REFERENCES "model_option" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "model_option_applicability_machineModelId_fkey" FOREIGN KEY ("machineModelId") REFERENCES "machine_model" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "relatedToType" TEXT NOT NULL,
    "agentId" TEXT,
    "customerId" TEXT,
    "opportunityId" TEXT,
    "installedMachineId" TEXT,
    "contactsInvolved" JSONB,
    "activityDate" DATETIME NOT NULL,
    "durationMinutes" INTEGER,
    "location" TEXT,
    "direction" TEXT,
    "summary" TEXT,
    "outcome" TEXT,
    "nextAction" TEXT,
    "nextActionDate" DATETIME,
    "nextActionOwnerId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "activity_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "activity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "activity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "activity_installedMachineId_fkey" FOREIGN KEY ("installedMachineId") REFERENCES "installed_machine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "installed_machine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNo" TEXT NOT NULL,
    "machineModelId" TEXT NOT NULL,
    "configurationSnapshot" JSONB,
    "customerId" TEXT NOT NULL,
    "agentId" TEXT,
    "sourceOpportunityId" TEXT,
    "sourceQuotationId" TEXT,
    "country" TEXT NOT NULL,
    "siteAddress" TEXT,
    "orderDate" DATETIME,
    "shipDate" DATETIME,
    "installationDate" DATETIME,
    "commissioningDate" DATETIME,
    "warrantyStartDate" DATETIME,
    "warrantyEndDate" DATETIME,
    "controllerBrand" TEXT,
    "controllerVersion" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "installed_machine_machineModelId_fkey" FOREIGN KEY ("machineModelId") REFERENCES "machine_model" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "installed_machine_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "installed_machine_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "installed_machine_sourceOpportunityId_fkey" FOREIGN KEY ("sourceOpportunityId") REFERENCES "opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "installed_machine_sourceQuotationId_fkey" FOREIGN KEY ("sourceQuotationId") REFERENCES "quotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_handover" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNo" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "quotationId" TEXT,
    "poNumber" TEXT,
    "poDate" DATETIME,
    "poDocumentId" TEXT,
    "orderValue" DECIMAL,
    "currency" TEXT,
    "promisedDeliveryDate" DATETIME,
    "actualShipDate" DATETIME,
    "fatDate" DATETIME,
    "fatStatus" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "order_handover_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "sensitivity" TEXT NOT NULL,
    "relatedToType" TEXT NOT NULL,
    "agentId" TEXT,
    "customerId" TEXT,
    "opportunityId" TEXT,
    "quotationId" TEXT,
    "installedMachineId" TEXT,
    "machineModelId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "description" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "checksum" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "document_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "document_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "document_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_access_grant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "grantedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_access_grant_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_access_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_access_log_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "knowledge_article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titleEn" TEXT NOT NULL,
    "titleZh" TEXT,
    "category" TEXT NOT NULL,
    "productFamilies" JSONB,
    "body" TEXT,
    "visibility" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_status_idx" ON "user"("status");

-- CreateIndex
CREATE UNIQUE INDEX "system_setting_key_key" ON "system_setting"("key");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preference_userId_type_key" ON "notification_preference"("userId", "type");

-- CreateIndex
CREATE INDEX "saved_view_userId_entityType_idx" ON "saved_view"("userId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "agent_agentCode_key" ON "agent"("agentCode");

-- CreateIndex
CREATE INDEX "agent_status_idx" ON "agent"("status");

-- CreateIndex
CREATE INDEX "agent_ownerUserId_idx" ON "agent"("ownerUserId");

-- CreateIndex
CREATE INDEX "agent_territory_countryCode_idx" ON "agent_territory"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "agent_territory_agentId_countryCode_productFamily_key" ON "agent_territory"("agentId", "countryCode", "productFamily");

-- CreateIndex
CREATE UNIQUE INDEX "customer_customerCode_key" ON "customer"("customerCode");

-- CreateIndex
CREATE INDEX "customer_country_idx" ON "customer"("country");

-- CreateIndex
CREATE INDEX "customer_customerType_idx" ON "customer"("customerType");

-- CreateIndex
CREATE INDEX "customer_ownerUserId_idx" ON "customer"("ownerUserId");

-- CreateIndex
CREATE INDEX "customer_primaryAgentId_idx" ON "customer"("primaryAgentId");

-- CreateIndex
CREATE INDEX "contact_agentId_idx" ON "contact"("agentId");

-- CreateIndex
CREATE INDEX "contact_customerId_idx" ON "contact"("customerId");

-- CreateIndex
CREATE INDEX "contact_email_idx" ON "contact"("email");

-- CreateIndex
CREATE INDEX "contact_fullName_idx" ON "contact"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "enquiry_enquiryNo_key" ON "enquiry"("enquiryNo");

-- CreateIndex
CREATE INDEX "enquiry_status_idx" ON "enquiry"("status");

-- CreateIndex
CREATE INDEX "enquiry_ownerUserId_idx" ON "enquiry"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_opportunityNo_key" ON "opportunity"("opportunityNo");

-- CreateIndex
CREATE INDEX "opportunity_stage_idx" ON "opportunity"("stage");

-- CreateIndex
CREATE INDEX "opportunity_ownerUserId_idx" ON "opportunity"("ownerUserId");

-- CreateIndex
CREATE INDEX "opportunity_customerId_idx" ON "opportunity"("customerId");

-- CreateIndex
CREATE INDEX "opportunity_agentId_idx" ON "opportunity"("agentId");

-- CreateIndex
CREATE INDEX "opportunity_stage_history_opportunityId_idx" ON "opportunity_stage_history"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_previousRevisionId_key" ON "quotation"("previousRevisionId");

-- CreateIndex
CREATE INDEX "quotation_status_idx" ON "quotation"("status");

-- CreateIndex
CREATE INDEX "quotation_opportunityId_idx" ON "quotation"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_quoteNo_revision_key" ON "quotation"("quoteNo", "revision");

-- CreateIndex
CREATE INDEX "quotation_line_quotationId_idx" ON "quotation_line"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "machine_model_modelCode_key" ON "machine_model"("modelCode");

-- CreateIndex
CREATE INDEX "machine_model_productFamily_idx" ON "machine_model"("productFamily");

-- CreateIndex
CREATE INDEX "machine_model_status_idx" ON "machine_model"("status");

-- CreateIndex
CREATE UNIQUE INDEX "model_option_optionCode_key" ON "model_option"("optionCode");

-- CreateIndex
CREATE INDEX "model_option_category_idx" ON "model_option"("category");

-- CreateIndex
CREATE UNIQUE INDEX "model_option_applicability_modelOptionId_machineModelId_key" ON "model_option_applicability"("modelOptionId", "machineModelId");

-- CreateIndex
CREATE INDEX "activity_relatedToType_idx" ON "activity"("relatedToType");

-- CreateIndex
CREATE INDEX "activity_agentId_idx" ON "activity"("agentId");

-- CreateIndex
CREATE INDEX "activity_customerId_idx" ON "activity"("customerId");

-- CreateIndex
CREATE INDEX "activity_opportunityId_idx" ON "activity"("opportunityId");

-- CreateIndex
CREATE INDEX "activity_nextActionDate_idx" ON "activity"("nextActionDate");

-- CreateIndex
CREATE UNIQUE INDEX "installed_machine_serialNo_key" ON "installed_machine"("serialNo");

-- CreateIndex
CREATE INDEX "installed_machine_country_idx" ON "installed_machine"("country");

-- CreateIndex
CREATE INDEX "installed_machine_machineModelId_idx" ON "installed_machine"("machineModelId");

-- CreateIndex
CREATE INDEX "installed_machine_agentId_idx" ON "installed_machine"("agentId");

-- CreateIndex
CREATE INDEX "installed_machine_warrantyEndDate_idx" ON "installed_machine"("warrantyEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "order_handover_orderNo_key" ON "order_handover"("orderNo");

-- CreateIndex
CREATE INDEX "order_handover_status_idx" ON "order_handover"("status");

-- CreateIndex
CREATE UNIQUE INDEX "document_supersedesId_key" ON "document"("supersedesId");

-- CreateIndex
CREATE INDEX "document_documentType_idx" ON "document"("documentType");

-- CreateIndex
CREATE INDEX "document_sensitivity_idx" ON "document"("sensitivity");

-- CreateIndex
CREATE INDEX "document_relatedToType_idx" ON "document"("relatedToType");

-- CreateIndex
CREATE INDEX "document_access_grant_userId_idx" ON "document_access_grant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "document_access_grant_documentId_userId_accessType_key" ON "document_access_grant"("documentId", "userId", "accessType");

-- CreateIndex
CREATE INDEX "document_access_log_documentId_idx" ON "document_access_log"("documentId");

-- CreateIndex
CREATE INDEX "document_access_log_userId_idx" ON "document_access_log"("userId");

-- CreateIndex
CREATE INDEX "knowledge_article_category_idx" ON "knowledge_article"("category");

-- CreateIndex
CREATE INDEX "knowledge_article_status_idx" ON "knowledge_article"("status");
