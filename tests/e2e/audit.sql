BEGIN;
DO $$
DECLARE
  partner_id uuid;
  user_id uuid;
  blocked boolean := false;
BEGIN
  SELECT id INTO partner_id FROM partners LIMIT 1;
  SELECT id INTO user_id FROM users LIMIT 1;
  UPDATE partners SET notes = notes WHERE id = partner_id;
  UPDATE users SET password_hash = password_hash WHERE id = user_id;
  IF NOT EXISTS (SELECT 1 FROM audit_log WHERE entity_table = 'partners'
      AND entity_id = partner_id AND action = 'update') THEN
    RAISE EXCEPTION 'Partner update was not audited';
  END IF;
  IF EXISTS (SELECT 1 FROM audit_log WHERE entity_table = 'users'
      AND entity_id = user_id AND action = 'update'
      AND (before ? 'password_hash' OR after ? 'password_hash')) THEN
    RAISE EXCEPTION 'Password hash leaked into audit payload';
  END IF;
  BEGIN
    UPDATE audit_log SET action = action WHERE entity_table = 'partners' AND entity_id = partner_id;
  EXCEPTION WHEN OTHERS THEN
    blocked := SQLERRM = 'audit_log is append-only';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Audit log update was allowed'; END IF;
END $$;
ROLLBACK;
