ALTER TABLE "parts_quotations" ADD COLUMN "pdf_base64" text;--> statement-breakpoint
ALTER TABLE "parts_requests" ADD COLUMN "request_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "parts_requests" ADD COLUMN "identified_part_number" text;--> statement-breakpoint
ALTER TABLE "parts_requests" ADD COLUMN "alternative_part_number" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "parts_requests_number_unique" ON "parts_requests" USING btree ("request_number");