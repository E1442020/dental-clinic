-- ============================================================================
-- clinic_settings — single-row table for the clinic's overall brand name and
-- WhatsApp contact number, filled in during the admin's first-login setup.
-- The `id boolean primary key check (id)` trick keeps this a true singleton:
-- only one row (id = true) can ever exist. No row yet = clinic not configured,
-- which is what drives the mandatory onboarding prompt in the app.
-- ============================================================================

create table clinic_settings (
  id boolean primary key default true check (id),
  name text not null,
  whatsapp_number text,
  updated_at timestamptz not null default now()
);

alter table clinic_settings enable row level security;

create policy clinic_settings_select on clinic_settings for select to authenticated using (true);
create policy clinic_settings_write on clinic_settings for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
