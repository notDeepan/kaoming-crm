ALTER TABLE "condition_photos" ALTER COLUMN "machine_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "condition_photos" ADD COLUMN "shipment_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "condition_photos" ADD CONSTRAINT "condition_photos_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "condition_photos_shipment_idx" ON "condition_photos" USING btree ("shipment_id");--> statement-breakpoint
ALTER TABLE "condition_photos" ADD CONSTRAINT "condition_photos_owner_check" CHECK ("condition_photos"."machine_id" IS NOT NULL OR "condition_photos"."shipment_id" IS NOT NULL);