-- ============================================================================
-- Auto-generate an invoice whenever a treatment with a cost is recorded,
-- applying the patient's insurance coverage percentage automatically:
--   insurance_covered_amount = cost * coverage_percentage / 100
--   patient_due_amount       = cost - insurance_covered_amount
-- This removes the need to manually create an invoice for every treatment.
-- ============================================================================

create or replace function create_invoice_on_treatment()
returns trigger as $$
declare
  v_insurance_id uuid;
  v_coverage numeric(5,2) := 0;
  v_covered numeric(10,2) := 0;
begin
  if new.cost > 0 then
    select insurance_id into v_insurance_id from patients where id = new.patient_id;

    if v_insurance_id is not null then
      select coverage_percentage into v_coverage from insurances where id = v_insurance_id;
    end if;

    v_covered := round(new.cost * coalesce(v_coverage, 0) / 100, 2);

    insert into invoices (
      patient_id, treatment_id, branch_id,
      total_amount, insurance_covered_amount, patient_due_amount,
      status, issue_date
    )
    values (
      new.patient_id, new.id, new.branch_id,
      new.cost, v_covered, new.cost - v_covered,
      'unpaid', new.procedure_date
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger treatments_create_invoice
  after insert on treatments
  for each row execute function create_invoice_on_treatment();

-- ----------------------------------------------------------------------------
-- Backfill: create the missing invoice for any treatment recorded before
-- this trigger existed.
-- ----------------------------------------------------------------------------
insert into invoices (patient_id, treatment_id, branch_id, total_amount, insurance_covered_amount, patient_due_amount, status, issue_date)
select
  t.patient_id,
  t.id,
  t.branch_id,
  t.cost,
  round(t.cost * coalesce(i.coverage_percentage, 0) / 100, 2),
  t.cost - round(t.cost * coalesce(i.coverage_percentage, 0) / 100, 2),
  'unpaid',
  t.procedure_date
from treatments t
left join patients p on p.id = t.patient_id
left join insurances i on i.id = p.insurance_id
where t.cost > 0
  and not exists (select 1 from invoices inv where inv.treatment_id = t.id);
