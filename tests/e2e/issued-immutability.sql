-- Run against a seeded disposable database after migrations.
-- Each attempted edit is caught in a PL/pgSQL subtransaction, so the
-- quotation remains unchanged even if a guard unexpectedly fails.
DO $test$
DECLARE
  quote_id uuid;
  line_id uuid;
  blocked boolean;
BEGIN
  SELECT id INTO quote_id FROM quotations
    WHERE deal_id = (SELECT id FROM deals WHERE deal_number = 'Q-2026-0147')
      AND revision = 3 AND status = 'issued';
  IF quote_id IS NULL THEN RAISE EXCEPTION 'Seeded issued quotation is missing'; END IF;
  SELECT id INTO line_id FROM quotation_lines WHERE quotation_id = quote_id LIMIT 1;
  IF line_id IS NULL THEN RAISE EXCEPTION 'Seeded quotation lines are missing'; END IF;

  blocked := false;
  BEGIN
    UPDATE quotations SET net_total = net_total + 1 WHERE id = quote_id;
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Issued quotation content is immutable' THEN RAISE; END IF;
    blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Issued quotation content edit was accepted'; END IF;

  blocked := false;
  BEGIN
    UPDATE quotation_lines SET unit_price = unit_price + 1 WHERE id = line_id;
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Issued quotation lines are immutable' THEN RAISE; END IF;
    blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Issued quotation line edit was accepted'; END IF;
END
$test$;
