CREATE TYPE "public"."claim_category" AS ENUM('late_delivery', 'spec_mismatch', 'documentation_error', 'installation_labour', 'freight_difference', 'design_defect', 'performance_shortfall', 'other');--> statement-breakpoint
CREATE TYPE "public"."claim_event_type" AS ENUM('received', 'position_sent', 'counter_offer', 'meeting', 'agreed', 'rejected', 'settled');--> statement-breakpoint
CREATE TYPE "public"."claim_responsibility" AS ENUM('kao_ming', 'agent', 'customer', 'supplier', 'forwarder', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('received', 'under_review', 'position_stated', 'negotiating', 'agreed', 'rejected', 'settled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."leakage_category" AS ENUM('late_delivery_penalty', 'downtime_claim', 'performance_shortfall', 'warranty_extension', 'discount', 'options_bundled_free', 'extras_added_late', 'price_held_past_revision', 'deposit_waived', 'foc_in_warranty', 'foc_out_of_warranty', 'foc_undeterminable', 'service_not_charged', 'travel_absorbed', 'rework_after_fat', 'scrap', 'expedite_freight', 'overtime_recovery', 'second_fat_visit', 'transit_damage', 'demurrage', 'customs_error', 'packing_rework', 'freight_rate_movement', 'fx_loss', 'lc_discrepancy', 'bad_debt', 'cost_of_capital', 'commission_overpaid', 'marketing_no_return', 'demo_unsold', 'dormant_territory', 'ce_rework', 'certification_reissue', 'local_approval_delay');--> statement-breakpoint
CREATE TYPE "public"."recovery_status" AS ENUM('absorbed', 'claimed', 'recovered', 'chargeable_unbilled');--> statement-breakpoint
CREATE TYPE "public"."settlement_method" AS ENUM('cash', 'credit_note', 'free_goods', 'cost_share', 'rejected', 'none');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claim_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"claim_id" uuid NOT NULL,
	"event_type" "claim_event_type" NOT NULL,
	"occurred_at" date NOT NULL,
	"summary" text NOT NULL,
	"attachment_url" text,
	"recorded_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claim_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"claim_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"accepted" boolean,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"claim_number" text NOT NULL,
	"machine_id" uuid NOT NULL,
	"order_id" uuid,
	"partner_id" uuid NOT NULL,
	"customer_id" uuid,
	"linked_case_id" uuid,
	"received_at" date NOT NULL,
	"source_reference" text,
	"category" "claim_category" NOT NULL,
	"description" text NOT NULL,
	"claimed_amount" numeric(14, 2) NOT NULL,
	"claimed_currency" varchar(3) NOT NULL,
	"offered_amount" numeric(14, 2),
	"offered_currency" varchar(3),
	"settled_amount" numeric(14, 2),
	"settled_currency" varchar(3),
	"base_amount_usd" numeric(14, 2),
	"fx_rate" numeric(12, 6),
	"fx_rate_date" date,
	"kao_ming_position" text,
	"outcome" text,
	"responsibility" "claim_responsibility" NOT NULL,
	"settlement_method" "settlement_method",
	"cost_share_pct" numeric(5, 2),
	"pending_credit" boolean DEFAULT false NOT NULL,
	"applied_to_order_id" uuid,
	"status" "claim_status" DEFAULT 'received' NOT NULL,
	"owner_id" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leakage_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deal_id" uuid NOT NULL,
	"category" "leakage_category" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"incurred_on" date NOT NULL,
	"attribution" "attribution" NOT NULL,
	"recovery_status" "recovery_status" NOT NULL,
	"evidence_document_id" uuid,
	"source_claim_id" uuid,
	"notes" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claim_events" ADD CONSTRAINT "claim_events_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claim_events" ADD CONSTRAINT "claim_events_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claim_lines" ADD CONSTRAINT "claim_lines_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_applied_to_order_id_orders_id_fk" FOREIGN KEY ("applied_to_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leakage_entries" ADD CONSTRAINT "leakage_entries_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leakage_entries" ADD CONSTRAINT "leakage_entries_evidence_document_id_documents_id_fk" FOREIGN KEY ("evidence_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leakage_entries" ADD CONSTRAINT "leakage_entries_source_claim_id_claims_id_fk" FOREIGN KEY ("source_claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_events_claim_date_idx" ON "claim_events" USING btree ("claim_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "claim_lines_number_unique" ON "claim_lines" USING btree ("claim_id","line_no");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "claims_number_unique" ON "claims" USING btree ("claim_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_partner_status_idx" ON "claims" USING btree ("partner_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_machine_idx" ON "claims" USING btree ("machine_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leakage_source_claim_unique" ON "leakage_entries" USING btree ("source_claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leakage_deal_idx" ON "leakage_entries" USING btree ("deal_id");