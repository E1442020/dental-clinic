-- ============================================================================
-- Fix: the CASE expression inside the trigger returned `text`, but
-- dental_chart.current_status is the `tooth_status` enum — Postgres doesn't
-- implicitly cast text -> enum inside a function body, causing error 42804
-- ("column current_status is of type tooth_status but expression is of type text")
-- whenever a treatment with a tooth_number was saved.
-- ============================================================================

create or replace function upsert_dental_chart_on_treatment()
returns trigger as $$
begin
  if new.tooth_number is not null then
    insert into dental_chart (patient_id, tooth_number, current_status, last_updated)
    values (
      new.patient_id,
      new.tooth_number,
      (case new.procedure_type
        when 'خلع' then 'extracted'
        when 'تركيب' then 'crowned'
        when 'حشو' then 'filled'
        when 'عصب' then 'root_canal'
        else 'needs_treatment'
      end)::tooth_status,
      now()
    )
    on conflict (patient_id, tooth_number)
    do update set current_status = excluded.current_status, last_updated = now();
  end if;
  return new;
end;
$$ language plpgsql;
