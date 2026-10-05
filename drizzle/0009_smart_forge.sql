CREATE TYPE "public"."attribution" AS ENUM('kao_ming', 'supplier', 'customer', 'agent', 'forwarder', 'external');--> statement-breakpoint
CREATE TYPE "public"."capture_point" AS ENUM('fat', 'loading', 'installation', 'service');--> statement-breakpoint
CREATE TYPE "public"."delay_reason" AS ENUM('supplier', 'capacity', 'design_change', 'customer_change', 'provisional_hold', 'quality_rework', 'logistics', 'other');--> statement-breakpoint
CREATE TYPE "public"."escalation_level" AS ENUM('none', 'dept_manager', 'gm');--> statement-breakpoint
CREATE TYPE "public"."fat_outcome" AS ENUM('passed', 'conditional', 'failed');--> statement-breakpoint
CREATE TYPE "public"."visit_type" AS ENUM('installation', 'warranty', 'chargeable', 'inspection');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "condition_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"machine_id" uuid NOT NULL,
	"site_visit_id" uuid,
	"capture_point" "capture_point" NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"file_url" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_base64" text NOT NULL,
	"caption" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fat_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"fat_record_id" uuid NOT NULL,
	"spec_category_id" uuid NOT NULL,
	"expected_value" text NOT NULL,
	"verified" boolean,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fat_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"work_order_id" uuid NOT NULL,
	"scheduled_for" date,
	"conducted_at" date,
	"outcome" "fat_outcome",
	"punch_list" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attendees" text,
	"customer_contact_captured" boolean DEFAULT false NOT NULL,
	"report_document_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "machines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"serial_number" text NOT NULL,
	"order_id" uuid NOT NULL,
	"machine_model_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"customer_id" uuid,
	"installed_at" date,
	"accepted_at" date,
	"warranty_months" integer,
	"warranty_expires_at" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "progress_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"work_order_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"due_date" date NOT NULL,
	"filled_at" timestamp with time zone,
	"reported_stage" text,
	"expected_completion" date,
	"previous_expected" date,
	"delta_days" integer,
	"cumulative_slip_days" integer,
	"delay_reason" "delay_reason",
	"attribution" "attribution",
	"reported_by" text,
	"escalation_level" "escalation_level" DEFAULT 'none' NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"order_id" uuid NOT NULL,
	"final_payment_received_at" timestamp with time zone,
	"forwarder_name" text,
	"package_length_mm" integer,
	"package_width_mm" integer,
	"package_height_mm" integer,
	"gross_weight_kg" numeric(10, 2),
	"requires_shipping_mark" boolean,
	"shipped_at" timestamp with time zone,
	"arrived_at" timestamp with time zone,
	"bill_of_lading_ref" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"machine_id" uuid NOT NULL,
	"visit_type" "visit_type" NOT NULL,
	"visited_at" date NOT NULL,
	"engineer" text NOT NULL,
	"work_performed" text,
	"acknowledged_by" text,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "condition_photos" ADD CONSTRAINT "condition_photos_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "condition_photos" ADD CONSTRAINT "condition_photos_site_visit_id_site_visits_id_fk" FOREIGN KEY ("site_visit_id") REFERENCES "public"."site_visits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fat_checklist_items" ADD CONSTRAINT "fat_checklist_items_fat_record_id_fat_records_id_fk" FOREIGN KEY ("fat_record_id") REFERENCES "public"."fat_records"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fat_checklist_items" ADD CONSTRAINT "fat_checklist_items_spec_category_id_spec_categories_id_fk" FOREIGN KEY ("spec_category_id") REFERENCES "public"."spec_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fat_records" ADD CONSTRAINT "fat_records_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fat_records" ADD CONSTRAINT "fat_records_report_document_id_documents_id_fk" FOREIGN KEY ("report_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "machines" ADD CONSTRAINT "machines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "machines" ADD CONSTRAINT "machines_machine_model_id_machine_models_id_fk" FOREIGN KEY ("machine_model_id") REFERENCES "public"."machine_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "machines" ADD CONSTRAINT "machines_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "machines" ADD CONSTRAINT "machines_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "progress_reviews" ADD CONSTRAINT "progress_reviews_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "condition_photos_machine_visit_idx" ON "condition_photos" USING btree ("machine_id","site_visit_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fat_checklist_record_category_unique" ON "fat_checklist_items" USING btree ("fat_record_id","spec_category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fat_records_work_idx" ON "fat_records" USING btree ("work_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "machines_serial_unique" ON "machines" USING btree ("serial_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "machines_order_unique" ON "machines" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "progress_reviews_work_sequence_unique" ON "progress_reviews" USING btree ("work_order_id","sequence");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_reviews_due_idx" ON "progress_reviews" USING btree ("due_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shipments_order_unique" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_visits_machine_idx" ON "site_visits" USING btree ("machine_id");