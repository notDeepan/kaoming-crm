CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE TYPE "public"."commission_base" AS ENUM('gross_invoice', 'net_machine_fob', 'after_discount', 'before_discount');--> statement-breakpoint
CREATE TYPE "public"."commission_model" AS ENUM('markup', 'commission');--> statement-breakpoint
CREATE TYPE "public"."customer_source" AS ENUM('agent_disclosed', 'fat_visit', 'warranty_registration');--> statement-breakpoint
CREATE TYPE "public"."exclusivity" AS ENUM('exclusive', 'non_exclusive', 'shared');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('machine', 'spec_change', 'accessory', 'service', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."partner_relationship" AS ENUM('agent', 'distributor');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('prospect', 'in_discussion', 'under_appointment', 'active', 'dormant', 'under_review', 'notice_served', 'terminated', 'lapsed');--> statement-breakpoint
CREATE TYPE "public"."partner_tier" AS ENUM('platinum', 'core', 'develop', 'watch', 'unrated');--> statement-breakpoint
CREATE TYPE "public"."region_band" AS ENUM('eu', 'non_eu');--> statement-breakpoint
CREATE TYPE "public"."region" AS ENUM('europe', 'south_asia', 'southeast_asia', 'east_asia', 'north_america', 'latin_america', 'middle_east', 'africa', 'oceania');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'sales', 'logistics', 'finance', 'service', 'viewer');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text,
	"role" "user_role" NOT NULL,
	"department" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"partner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"country_code" varchar(2),
	"industry" text,
	"source" "customer_source"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_compliance_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"partner_id" uuid NOT NULL,
	"voltage" text,
	"frequency" text,
	"phase" text,
	"ce_variant" text,
	"label_languages" text[],
	"nameplate_required" boolean,
	"default_colour_codes" text[],
	"is_complete" boolean GENERATED ALWAYS AS (
    voltage IS NOT NULL AND frequency IS NOT NULL AND phase IS NOT NULL
    AND ce_variant IS NOT NULL AND coalesce(cardinality(label_languages), 0) > 0
    AND nameplate_required IS NOT NULL AND coalesce(cardinality(default_colour_codes), 0) > 0
  ) STORED
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"partner_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"notice_period_days" integer,
	"notice_deadline" date GENERATED ALWAYS AS (end_date - notice_period_days) STORED,
	"commission_rate" numeric(5, 4),
	"commission_base" "commission_base",
	"ld_rate_per_week" numeric(5, 4),
	"ld_cap" numeric(5, 4),
	"excludes_consequential_loss" boolean,
	"document_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name_zh" text,
	"country_code" varchar(2) NOT NULL,
	"region" "region" NOT NULL,
	"lifecycle_status" "partner_status" DEFAULT 'prospect' NOT NULL,
	"relationship_type" "partner_relationship" NOT NULL,
	"commission_model" "commission_model" NOT NULL,
	"exclusivity" "exclusivity",
	"tier" "partner_tier" DEFAULT 'unrated' NOT NULL,
	"default_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"code" text NOT NULL,
	"name_en" text NOT NULL,
	"name_zh" text NOT NULL,
	"item_type" "item_type" NOT NULL,
	"spec_category_id" uuid,
	"machine_model_id" uuid,
	"spec_override" jsonb,
	"is_standard_accessory" boolean DEFAULT false NOT NULL,
	"unit" text DEFAULT 'set' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "machine_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"code" text NOT NULL,
	"name_en" text NOT NULL,
	"name_zh" text NOT NULL,
	"product_line" text,
	"proposal_asset_url" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_book_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"price_book_version_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"region_band" "region_band" NOT NULL,
	"currency" varchar(3) NOT NULL,
	"amount" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spec_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"code" text NOT NULL,
	"name_en" text NOT NULL,
	"name_zh" text NOT NULL,
	"sort_order" integer NOT NULL,
	"appears_on" text[] NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_compliance_profiles" ADD CONSTRAINT "partner_compliance_profiles_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_contracts" ADD CONSTRAINT "partner_contracts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "items" ADD CONSTRAINT "items_spec_category_id_spec_categories_id_fk" FOREIGN KEY ("spec_category_id") REFERENCES "public"."spec_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "items" ADD CONSTRAINT "items_machine_model_id_machine_models_id_fk" FOREIGN KEY ("machine_model_id") REFERENCES "public"."machine_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prices" ADD CONSTRAINT "prices_price_book_version_id_price_book_versions_id_fk" FOREIGN KEY ("price_book_version_id") REFERENCES "public"."price_book_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prices" ADD CONSTRAINT "prices_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_partner_idx" ON "customers" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partner_compliance_profiles_partner_unique" ON "partner_compliance_profiles" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_contracts_partner_idx" ON "partner_contracts" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partners_code_unique" ON "partners" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partners_region_idx" ON "partners" USING btree ("region");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "items_code_unique" ON "items" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_machine_model_idx" ON "items" USING btree ("machine_model_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "machine_models_code_unique" ON "machine_models" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "price_book_versions_name_unique" ON "price_book_versions" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_book_versions_effective_idx" ON "price_book_versions" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prices_version_item_region_currency_unique" ON "prices" USING btree ("price_book_version_id","item_id","region_band","currency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prices_item_idx" ON "prices" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spec_categories_code_unique" ON "spec_categories" USING btree ("code");--> statement-breakpoint
ALTER TABLE "price_book_versions" ADD CONSTRAINT "price_book_valid_period" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");--> statement-breakpoint
ALTER TABLE "price_book_versions" ADD CONSTRAINT "price_book_published_no_overlap" EXCLUDE USING gist (daterange("effective_from", "effective_to", '[]') WITH &&) WHERE ("is_published" AND "deleted_at" IS NULL);
