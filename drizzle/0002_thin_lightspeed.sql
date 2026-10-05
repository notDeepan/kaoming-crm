CREATE TYPE "public"."design_review_outcome" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('quotation', 'technical_proposal', 'pi', 'mi', 'spec_sheet', 'proforma_invoice', 'commercial_invoice', 'packing_list', 'certificate_of_origin', 'fat_report', 'acceptance_certificate', 'parts_quotation', 'progress_update', 'commission_note');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'pending_approval', 'approved', 'issued', 'printed', 'awaiting_signature', 'released', 'superseded', 'expired', 'accepted');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('uploaded', 'validated', 'failed', 'published', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."incoterm" AS ENUM('EXW', 'FOB', 'CFR', 'CIF', 'CIP', 'DAP', 'DDP');--> statement-breakpoint
CREATE TYPE "public"."lead_time_basis" AS ENUM('po', 'deposit');--> statement-breakpoint
CREATE TYPE "public"."lead_time_terminus" AS ENUM('ready_to_ship', 'arrived');--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('order_confirmed', 'deposit_received', 'spec_locked', 'work_order_released', 'in_production', 'provisional_hold', 'assembly_complete', 'fat_scheduled', 'fat_passed', 'fat_conditional', 'fat_failed', 'final_payment_received', 'shipping_docs', 'shipped', 'arrived', 'installation', 'accepted', 'in_warranty', 'closed', 'cancelled', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."sales_stage" AS ENUM('enquiry_received', 'requirements_gathering', 'draft_quotation', 'under_negotiation', 'final_quotation', 'awaiting_po', 'won', 'lost', 'expired', 'on_hold');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deal_number" text NOT NULL,
	"partner_id" uuid NOT NULL,
	"customer_id" uuid,
	"machine_model_id" uuid,
	"sales_stage" "sales_stage" DEFAULT 'enquiry_received' NOT NULL,
	"project_stage" "project_stage",
	"enquiry_date" date NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"region_band" "region_band" NOT NULL,
	"lost_reason" text,
	"owner_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "design_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deal_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"outcome" "design_review_outcome" DEFAULT 'pending' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_book_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"filename" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"target_version_id" uuid,
	"status" "import_status" DEFAULT 'uploaded' NOT NULL,
	"row_count" integer,
	"error_count" integer,
	"errors" jsonb,
	"diff_summary" jsonb,
	"source_base64" text NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotation_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"quotation_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_type" "item_type" NOT NULL,
	"description_en" text NOT NULL,
	"description_zh" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"line_discount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(14, 2) NOT NULL,
	"is_included_in_total" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deal_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"price_book_version_id" uuid NOT NULL,
	"issued_at" timestamp with time zone,
	"valid_until" date,
	"payment_terms" text,
	"delivery_terms" text,
	"lead_time_text" text,
	"lead_time_weeks_from" "lead_time_basis" DEFAULT 'deposit' NOT NULL,
	"lead_time_ends_at" "lead_time_terminus" DEFAULT 'ready_to_ship' NOT NULL,
	"incoterm" "incoterm" DEFAULT 'FOB' NOT NULL,
	"warranty_months" integer DEFAULT 12 NOT NULL,
	"list_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_approved_by" uuid,
	"discount_approved_at" timestamp with time zone,
	"design_review_id" uuid,
	"supersedes_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "technical_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"quotation_id" uuid NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pdf_url" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deals" ADD CONSTRAINT "deals_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deals" ADD CONSTRAINT "deals_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deals" ADD CONSTRAINT "deals_machine_model_id_machine_models_id_fk" FOREIGN KEY ("machine_model_id") REFERENCES "public"."machine_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "design_reviews" ADD CONSTRAINT "design_reviews_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_book_imports" ADD CONSTRAINT "price_book_imports_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_book_imports" ADD CONSTRAINT "price_book_imports_target_version_id_price_book_versions_id_fk" FOREIGN KEY ("target_version_id") REFERENCES "public"."price_book_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotations" ADD CONSTRAINT "quotations_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotations" ADD CONSTRAINT "quotations_price_book_version_id_price_book_versions_id_fk" FOREIGN KEY ("price_book_version_id") REFERENCES "public"."price_book_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotations" ADD CONSTRAINT "quotations_discount_approved_by_users_id_fk" FOREIGN KEY ("discount_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotations" ADD CONSTRAINT "quotations_design_review_id_design_reviews_id_fk" FOREIGN KEY ("design_review_id") REFERENCES "public"."design_reviews"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "technical_proposals" ADD CONSTRAINT "technical_proposals_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "deals_number_unique" ON "deals" USING btree ("deal_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deals_partner_idx" ON "deals" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deals_owner_stage_idx" ON "deals" USING btree ("owner_id","sales_stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "design_reviews_deal_idx" ON "design_reviews" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_book_imports_status_idx" ON "price_book_imports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quotation_lines_number_unique" ON "quotation_lines" USING btree ("quotation_id","line_no");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_lines_item_idx" ON "quotation_lines" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quotations_deal_revision_unique" ON "quotations" USING btree ("deal_id","revision");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "technical_proposals_quotation_unique" ON "technical_proposals" USING btree ("quotation_id");