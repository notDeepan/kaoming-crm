CREATE TYPE "public"."approval_type" AS ENUM('supervisor', 'dept_manager', 'gm', 'deputy_manager_signature', 'accounts_stamp', 'company_chop_cfo');--> statement-breakpoint
CREATE TYPE "public"."attachment_group" AS ENUM('quotation', 'order', 'manufacturing', 'delivery', 'aftermarket');--> statement-breakpoint
CREATE TYPE "public"."attachment_kind" AS ENUM('customer_po', 'custom_change_image', 'model_proposal', 'technical_proposal', 'other');--> statement-breakpoint
CREATE TYPE "public"."doc_language" AS ENUM('en', 'zh_hant', 'both');--> statement-breakpoint
CREATE TYPE "public"."spec_value_source" AS ENUM('base', 'quotation_line', 'compliance_profile', 'manual');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deal_id" uuid NOT NULL,
	"group" "attachment_group" NOT NULL,
	"kind" "attachment_kind" NOT NULL,
	"spec_sheet_id" uuid,
	"file_url" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text,
	"file_base64" text,
	"uploaded_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deal_spec_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deal_id" uuid NOT NULL,
	"spec_category_id" uuid NOT NULL,
	"value_en" text NOT NULL,
	"value_zh" text NOT NULL,
	"is_upgraded" boolean DEFAULT false NOT NULL,
	"source" "spec_value_source" NOT NULL,
	"source_quotation_id" uuid,
	"source_item_ids" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"document_id" uuid NOT NULL,
	"approval_type" "approval_type" NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"completed_by" text,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deal_id" uuid NOT NULL,
	"doc_type" "doc_type" NOT NULL,
	"doc_number" text NOT NULL,
	"revision" integer,
	"language" "doc_language" NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"pdf_url" text,
	"pdf_base64" text,
	"generated_at" timestamp with time zone,
	"printed_at" timestamp with time zone,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deal_id" uuid NOT NULL,
	"pi_number" text NOT NULL,
	"customer_po_ref" text NOT NULL,
	"customer_po_url" text NOT NULL,
	"po_verified_at" timestamp with time zone,
	"po_variance_notes" text,
	"order_value" numeric(14, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"deposit_percent" numeric(5, 2),
	"deposit_received_at" timestamp with time zone,
	"contractual_delivery_date" date,
	"document_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spec_sheet_distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"spec_sheet_id" uuid NOT NULL,
	"department" text NOT NULL,
	"distributed_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spec_sheet_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"spec_sheet_id" uuid NOT NULL,
	"spec_category_id" uuid NOT NULL,
	"value_en" text NOT NULL,
	"value_zh" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spec_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"work_order_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"issued_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"document_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"order_id" uuid NOT NULL,
	"mi_number" text NOT NULL,
	"batch_number" text,
	"issued_at" timestamp with time zone,
	"planned_start" date,
	"planned_finish" date,
	"actual_finish" date,
	"production_status" text,
	"is_provisional" boolean DEFAULT false NOT NULL,
	"provisional_hold_stage" text,
	"document_id" uuid
);
--> statement-breakpoint
ALTER TABLE "machine_models" ADD COLUMN "base_specs" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_spec_sheet_id_spec_sheets_id_fk" FOREIGN KEY ("spec_sheet_id") REFERENCES "public"."spec_sheets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deal_spec_values" ADD CONSTRAINT "deal_spec_values_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deal_spec_values" ADD CONSTRAINT "deal_spec_values_spec_category_id_spec_categories_id_fk" FOREIGN KEY ("spec_category_id") REFERENCES "public"."spec_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deal_spec_values" ADD CONSTRAINT "deal_spec_values_source_quotation_id_quotations_id_fk" FOREIGN KEY ("source_quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_approvals" ADD CONSTRAINT "document_approvals_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spec_sheet_distributions" ADD CONSTRAINT "spec_sheet_distributions_spec_sheet_id_spec_sheets_id_fk" FOREIGN KEY ("spec_sheet_id") REFERENCES "public"."spec_sheets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spec_sheet_lines" ADD CONSTRAINT "spec_sheet_lines_spec_sheet_id_spec_sheets_id_fk" FOREIGN KEY ("spec_sheet_id") REFERENCES "public"."spec_sheets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spec_sheet_lines" ADD CONSTRAINT "spec_sheet_lines_spec_category_id_spec_categories_id_fk" FOREIGN KEY ("spec_category_id") REFERENCES "public"."spec_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spec_sheets" ADD CONSTRAINT "spec_sheets_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spec_sheets" ADD CONSTRAINT "spec_sheets_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_deal_group_idx" ON "attachments" USING btree ("deal_id","group");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_spec_sheet_idx" ON "attachments" USING btree ("spec_sheet_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "deal_spec_values_deal_category_unique" ON "deal_spec_values" USING btree ("deal_id","spec_category_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "document_approvals_type_unique" ON "document_approvals" USING btree ("document_id","approval_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_deal_type_idx" ON "documents" USING btree ("deal_id","doc_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "documents_number_revision_unique" ON "documents" USING btree ("doc_type","doc_number","revision");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_deal_unique" ON "orders" USING btree ("deal_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_pi_number_unique" ON "orders" USING btree ("pi_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spec_sheet_distributions_department_unique" ON "spec_sheet_distributions" USING btree ("spec_sheet_id","department");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spec_sheet_lines_category_unique" ON "spec_sheet_lines" USING btree ("spec_sheet_id","spec_category_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spec_sheets_work_order_revision_unique" ON "spec_sheets" USING btree ("work_order_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "work_orders_order_unique" ON "work_orders" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "work_orders_mi_number_unique" ON "work_orders" USING btree ("mi_number");