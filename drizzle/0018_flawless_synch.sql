CREATE TABLE IF NOT EXISTS "scorecard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"partner_id" uuid NOT NULL,
	"period" text NOT NULL,
	"commercial_score" numeric(5, 2),
	"pipeline_score" numeric(5, 2),
	"capability_score" numeric(5, 2),
	"relationship_score" numeric(5, 2),
	"composite_score" numeric(5, 2),
	"tier" "partner_tier" DEFAULT 'unrated' NOT NULL,
	"previous_tier" "partner_tier",
	"net_revenue_12m" numeric(14, 2),
	"cost_to_serve_pct" numeric(5, 2),
	"data_points" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"publication_blocked_reason" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scorecard_snapshots" ADD CONSTRAINT "scorecard_snapshots_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scorecard_partner_period_unique" ON "scorecard_snapshots" USING btree ("partner_id","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scorecard_period_idx" ON "scorecard_snapshots" USING btree ("period");