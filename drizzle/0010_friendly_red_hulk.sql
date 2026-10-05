CREATE TYPE "public"."forwarder_nominator" AS ENUM('customer', 'agent', 'kao_ming');--> statement-breakpoint
ALTER TYPE "public"."doc_type" ADD VALUE 'shipping_notice';--> statement-breakpoint
ALTER TYPE "public"."doc_type" ADD VALUE 'shipping_order';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipment_booking_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"shipment_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"confirmed_at" timestamp with time zone,
	"booking_reference" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipment_export_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"shipment_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_base64" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "completion_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "booking_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "booking_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "booking_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "booking_reference" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "vessel_or_flight" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "etd" date;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "eta" date;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "shipping_notice_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "export_documents_prepared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "shipping_order_printed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "shipping_notice_document_id" uuid;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "shipping_order_document_id" uuid;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "forwarder_nominated_by" "forwarder_nominator";--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "incoterm" "incoterm";--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "freight_cost" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "booking_due_by" date;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipment_booking_attempts" ADD CONSTRAINT "shipment_booking_attempts_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipment_export_documents" ADD CONSTRAINT "shipment_export_documents_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shipment_booking_attempt_number_unique" ON "shipment_booking_attempts" USING btree ("shipment_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shipment_export_kind_unique" ON "shipment_export_documents" USING btree ("shipment_id","kind");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipping_notice_document_id_documents_id_fk" FOREIGN KEY ("shipping_notice_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipping_order_document_id_documents_id_fk" FOREIGN KEY ("shipping_order_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
