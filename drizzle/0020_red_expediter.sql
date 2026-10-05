CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_table" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_entity_idx" ON "audit_log" USING btree ("entity_table","entity_id","at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION crm_capture_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_data jsonb;
  new_data jsonb;
  record_id uuid;
  record_actor uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_data := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_data := to_jsonb(NEW); END IF;
  record_id := COALESCE(new_data->>'id', old_data->>'id')::uuid;
  record_actor := NULLIF(COALESCE(new_data->>'updated_by', new_data->>'created_by',
    old_data->>'updated_by', old_data->>'created_by'), '')::uuid;
  old_data := old_data - ARRAY['password_hash', 'file_base64', 'pdf_base64', 'key_hash'];
  new_data := new_data - ARRAY['password_hash', 'file_base64', 'pdf_base64', 'key_hash'];
  INSERT INTO audit_log (entity_table, entity_id, action, actor_id, before, after)
    VALUES (TG_TABLE_NAME, record_id, lower(TG_OP), record_actor, old_data, new_data);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION crm_protect_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END $$;--> statement-breakpoint
CREATE TRIGGER crm_audit_immutable BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION crm_protect_audit();--> statement-breakpoint
DO $$
DECLARE business_table text;
BEGIN
  FOR business_table IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'created_by'
      AND table_name <> 'login_attempts'
  LOOP
    EXECUTE format('CREATE TRIGGER crm_audit_change AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION crm_capture_audit()', business_table);
  END LOOP;
END $$;
