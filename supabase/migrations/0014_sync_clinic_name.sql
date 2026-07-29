-- ============================================================================
-- `clinics.name` was only ever set once, at signup time, to the ADMIN's own
-- full name (a placeholder, since the real clinic name doesn't exist yet at
-- that point) — it never got updated afterward when the admin actually named
-- their clinic during onboarding (clinic_settings.name), so the super-admin
-- "إدارة العيادات" page kept showing the admin's personal name instead of
-- the clinic's real name. Keep clinics.name in sync automatically from here
-- on, and backfill every clinic that has already finished onboarding.
-- ============================================================================

create or replace function sync_clinic_name_from_settings()
returns trigger as $$
begin
  update clinics set name = new.name where id = new.clinic_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger clinic_settings_sync_name
  after insert or update on clinic_settings
  for each row execute function sync_clinic_name_from_settings();

update clinics c
set name = cs.name
from clinic_settings cs
where cs.clinic_id = c.id and c.name is distinct from cs.name;
