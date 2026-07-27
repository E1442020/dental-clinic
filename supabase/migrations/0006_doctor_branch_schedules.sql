-- ============================================================================
-- Doctors work different days/hours at different branches. Move the working
-- schedule from the doctor (global) to doctor_branches (per assignment), so
-- switching branches on the site changes which slots are offered.
-- ============================================================================

alter table doctor_branches
  add column working_days jsonb not null default '[]',
  add column working_hours_start time,
  add column working_hours_end time;

-- Backfill: assign every existing doctor to every existing branch with their
-- old global schedule, so nothing currently bookable breaks. Admins can then
-- narrow this down per doctor from the new per-branch editor.
insert into doctor_branches (doctor_id, branch_id, working_days, working_hours_start, working_hours_end)
select d.id, b.id, d.working_days, d.working_hours_start, d.working_hours_end
from doctors d
cross join branches b
on conflict (doctor_id, branch_id) do update set
  working_days = excluded.working_days,
  working_hours_start = excluded.working_hours_start,
  working_hours_end = excluded.working_hours_end;

alter table doctors
  drop column working_days,
  drop column working_hours_start,
  drop column working_hours_end;
