-- Issued and superseded revisions are financial snapshots. Only the issue ->
-- superseded status change may touch an issued quotation.
CREATE FUNCTION guard_quotation_snapshot() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Issued quotations cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' THEN
    IF NOT (OLD.status = 'issued' AND NEW.status = 'superseded') AND NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Issued quotation status cannot be changed';
    END IF;
    IF ROW(NEW.deal_id, NEW.revision, NEW.price_book_version_id, NEW.issued_at,
           NEW.valid_until, NEW.payment_terms, NEW.delivery_terms, NEW.lead_time_text,
           NEW.lead_time_weeks_from, NEW.lead_time_ends_at, NEW.incoterm,
           NEW.warranty_months, NEW.list_total, NEW.discount_amount, NEW.net_total,
           NEW.discount_approved_by, NEW.discount_approved_at, NEW.design_review_id,
           NEW.supersedes_id)
       IS DISTINCT FROM
       ROW(OLD.deal_id, OLD.revision, OLD.price_book_version_id, OLD.issued_at,
           OLD.valid_until, OLD.payment_terms, OLD.delivery_terms, OLD.lead_time_text,
           OLD.lead_time_weeks_from, OLD.lead_time_ends_at, OLD.incoterm,
           OLD.warranty_months, OLD.list_total, OLD.discount_amount, OLD.net_total,
           OLD.discount_approved_by, OLD.discount_approved_at, OLD.design_review_id,
           OLD.supersedes_id) THEN
      RAISE EXCEPTION 'Issued quotation content is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER quotations_snapshot_guard BEFORE UPDATE OR DELETE ON quotations
  FOR EACH ROW EXECUTE FUNCTION guard_quotation_snapshot();
--> statement-breakpoint
CREATE FUNCTION guard_quotation_line_snapshot() RETURNS trigger AS $$
DECLARE quotation_status document_status;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.quotation_id <> OLD.quotation_id THEN
    RAISE EXCEPTION 'Quotation lines cannot move between revisions';
  END IF;
  SELECT status INTO quotation_status FROM quotations
    WHERE id = CASE WHEN TG_OP = 'INSERT' THEN NEW.quotation_id ELSE OLD.quotation_id END;
  IF quotation_status <> 'draft' THEN
    RAISE EXCEPTION 'Issued quotation lines are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER quotation_lines_snapshot_guard BEFORE INSERT OR UPDATE OR DELETE ON quotation_lines
  FOR EACH ROW EXECUTE FUNCTION guard_quotation_line_snapshot();
