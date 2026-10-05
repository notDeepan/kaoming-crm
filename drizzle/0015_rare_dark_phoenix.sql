CREATE TYPE "public"."case_priority" AS ENUM('low', 'normal', 'high', 'machine_down');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('received', 'translated', 'with_engineering', 'response_received', 'translated_back', 'sent_to_agent', 'awaiting_customer', 'on_hold_parts', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."case_type" AS ENUM('part_failure', 'documentation_request', 'onsite_repair', 'onsite_training', 'repair_return_dispute', 'technical_query');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound_agent', 'outbound_agent', 'inbound_internal', 'outbound_internal');--> statement-breakpoint
CREATE TYPE "public"."parts_status" AS ENUM('requested', 'awaiting_identification', 'identified', 'alternative_suggested', 'alternative_accepted', 'alternative_rejected', 'unidentifiable', 'stock_checked', 'awaiting_pricing', 'priced', 'awaiting_procurement', 'quoted', 'awaiting_po', 'confirmed', 'picking', 'shipped', 'closed', 'lost');--> statement-breakpoint
CREATE TYPE "public"."price_source" AS ENUM('price_book', 'procurement_quote', 'production_quote');--> statement-breakpoint
CREATE TYPE "public"."translation_source" AS ENUM('machine', 'machine_edited', 'human');--> statement-breakpoint
CREATE TYPE "public"."warranty_determination" AS ENUM('in_warranty', 'out_of_warranty', 'undeterminable');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"case_id" uuid NOT NULL,
	"direction" "message_direction" NOT NULL,
	"source_language" varchar(7) NOT NULL,
	"source_text" text NOT NULL,
	"translated_text" text,
	"translation_source" "translation_source",
	"translated_by" uuid,
	"reviewed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_state_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"case_id" uuid NOT NULL,
	"from_status" "case_status",
	"to_status" "case_status" NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"order_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"model" "commission_model" NOT NULL,
	"rate" numeric(5, 4),
	"base" "commission_base",
	"accrued_amount" numeric(14, 2) NOT NULL,
	"accrued_at" timestamp with time zone NOT NULL,
	"becomes_due_at" date,
	"claimed_amount" numeric(14, 2),
	"claimed_at" timestamp with time zone,
	"variance" numeric(14, 2),
	"settled_at" timestamp with time zone,
	"approved_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parts_quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"parts_request_id" uuid NOT NULL,
	"quote_number" text NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"prepared_by" uuid NOT NULL,
	"supervisor_approved_by" uuid,
	"supervisor_approved_at" timestamp with time zone,
	"payment_terms" text DEFAULT 'T/T',
	"delivery_text" text,
	"total" numeric(14, 2),
	"currency" varchar(3) NOT NULL,
	"is_foc" boolean DEFAULT false NOT NULL,
	"document_id" uuid,
	"issued_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parts_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"machine_id" uuid,
	"partner_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_description" text NOT NULL,
	"requested_quantity" integer DEFAULT 1 NOT NULL,
	"identified_item_id" uuid,
	"alternative_item_id" uuid,
	"alternative_outcome" text,
	"alternative_rejection_reason" text,
	"in_stock" boolean,
	"procurement_lead_days" integer,
	"warranty_determination" "warranty_determination" NOT NULL,
	"status" "parts_status" DEFAULT 'requested' NOT NULL,
	"identification_requested_at" timestamp with time zone,
	"identification_received_at" timestamp with time zone,
	"identified_by" text,
	"pricing_requested_at" timestamp with time zone,
	"pricing_received_at" timestamp with time zone,
	"priced_by" text,
	"price_source" "price_source",
	"unit_price" numeric(14, 2),
	"currency" varchar(3),
	"linked_case_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "penalty_exposures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"order_id" uuid NOT NULL,
	"weeks_late" integer NOT NULL,
	"rate_per_week" numeric(5, 4) NOT NULL,
	"accrued_exposure" numeric(14, 2) NOT NULL,
	"cap_amount" numeric(14, 2) NOT NULL,
	"calculated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"case_number" text NOT NULL,
	"machine_id" uuid,
	"partner_id" uuid NOT NULL,
	"customer_id" uuid,
	"case_type" "case_type" NOT NULL,
	"priority" "case_priority" DEFAULT 'normal' NOT NULL,
	"status" "case_status" DEFAULT 'received' NOT NULL,
	"subject" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"owner_id" uuid NOT NULL,
	"assigned_dept" text,
	"resolution" text,
	"linked_parts_request_id" uuid,
	"linked_site_visit_id" uuid,
	"billable" boolean,
	"billed" boolean
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_translated_by_users_id_fk" FOREIGN KEY ("translated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_state_log" ADD CONSTRAINT "case_state_log_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_state_log" ADD CONSTRAINT "case_state_log_by_users_id_fk" FOREIGN KEY ("by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commissions" ADD CONSTRAINT "commissions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commissions" ADD CONSTRAINT "commissions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_quotations" ADD CONSTRAINT "parts_quotations_parts_request_id_parts_requests_id_fk" FOREIGN KEY ("parts_request_id") REFERENCES "public"."parts_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_quotations" ADD CONSTRAINT "parts_quotations_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_quotations" ADD CONSTRAINT "parts_quotations_supervisor_approved_by_users_id_fk" FOREIGN KEY ("supervisor_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_quotations" ADD CONSTRAINT "parts_quotations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_requests" ADD CONSTRAINT "parts_requests_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_requests" ADD CONSTRAINT "parts_requests_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_requests" ADD CONSTRAINT "parts_requests_identified_item_id_items_id_fk" FOREIGN KEY ("identified_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_requests" ADD CONSTRAINT "parts_requests_alternative_item_id_items_id_fk" FOREIGN KEY ("alternative_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_requests" ADD CONSTRAINT "parts_requests_linked_case_id_cases_id_fk" FOREIGN KEY ("linked_case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "penalty_exposures" ADD CONSTRAINT "penalty_exposures_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_linked_site_visit_id_site_visits_id_fk" FOREIGN KEY ("linked_site_visit_id") REFERENCES "public"."site_visits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_messages_case_created_idx" ON "case_messages" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_state_log_case_at_idx" ON "case_state_log" USING btree ("case_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commissions_order_unique" ON "commissions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commissions_partner_idx" ON "commissions" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "parts_quotations_number_unique" ON "parts_quotations" USING btree ("quote_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "parts_quotations_request_unique" ON "parts_quotations" USING btree ("parts_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parts_requests_partner_status_idx" ON "parts_requests" USING btree ("partner_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parts_requests_case_idx" ON "parts_requests" USING btree ("linked_case_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "penalty_exposures_order_unique" ON "penalty_exposures" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cases_number_unique" ON "cases" USING btree ("case_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_partner_status_idx" ON "cases" USING btree ("partner_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_machine_idx" ON "cases" USING btree ("machine_id");