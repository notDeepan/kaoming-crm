ALTER TABLE "orders" ADD COLUMN "source_quotation_id" uuid NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_source_quotation_id_quotations_id_fk" FOREIGN KEY ("source_quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
