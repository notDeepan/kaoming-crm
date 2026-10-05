ALTER TABLE "orders" ADD COLUMN "deposit_received_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "final_payment_received_amount" numeric(14, 2);