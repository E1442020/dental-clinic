-- ============================================================================
-- Insurance plans often cap how much they'll cover per patient per calendar
-- year (e.g. 1000 EGP/year). Add that cap and enforce it automatically in the
-- invoice-generation trigger: once a patient exhausts it for the year, the
-- rest of the treatment cost falls on the patient instead of the insurer.
-- ============================================================================

alter table insurances add column if not exists annual_limit numeric(10,2);
comment on column insurances.annual_limit is 'Max amount this plan covers per patient per calendar year. NULL = no limit.';

create or replace function create_invoice_on_treatment()
returns trigger as $$
declare
  v_insurance_id uuid;
  v_coverage numeric(5,2) := 0;
  v_annual_limit numeric(10,2);
  v_used_this_year numeric(10,2) := 0;
  v_computed numeric(10,2) := 0;
  v_covered numeric(10,2) := 0;
begin
  if new.cost > 0 then
    select insurance_id into v_insurance_id from patients where id = new.patient_id;

    if v_insurance_id is not null then
      select coverage_percentage, annual_limit into v_coverage, v_annual_limit
      from insurances where id = v_insurance_id;
    end if;

    v_computed := round(new.cost * coalesce(v_coverage, 0) / 100, 2);

    if v_annual_limit is not null then
      select coalesce(sum(insurance_covered_amount), 0) into v_used_this_year
      from invoices
      where patient_id = new.patient_id
        and date_part('year', issue_date) = date_part('year', new.procedure_date);

      v_covered := least(v_computed, greatest(v_annual_limit - v_used_this_year, 0));
    else
      v_covered := v_computed;
    end if;

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
