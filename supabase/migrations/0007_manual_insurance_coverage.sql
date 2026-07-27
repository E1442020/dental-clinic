-- ============================================================================
-- The clinic doesn't work with fixed coverage percentages or annual caps —
-- it sends the procedure to the insurer, waits for their approval, and the
-- insurer returns the exact amount they'll pay. So `insurance_covered_amount`
-- on invoices is entered by hand (in the payment screen / claim approval),
-- not computed automatically. Drop the now-unused percentage/limit columns
-- and simplify the auto-invoice trigger to leave coverage at 0.
-- ============================================================================

create or replace function create_invoice_on_treatment()
returns trigger as $$
begin
  if new.cost > 0 then
    insert into invoices (
      patient_id, treatment_id, branch_id,
      total_amount, insurance_covered_amount, patient_due_amount,
      status, issue_date
    )
    values (
      new.patient_id, new.id, new.branch_id,
      new.cost, 0, new.cost,
      'unpaid', new.procedure_date
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

alter table insurances
  drop column if exists coverage_percentage,
  drop column if exists annual_limit;
