-- ============================================================================
-- Multi-tenant conversion: any number of independent clinics, each with fully
-- isolated data, plus a 7-day free-trial self-signup path and a cross-tenant
-- super-admin view. Mirrors the existing branch-scoping pattern
-- (auth_role()/auth_branch_id()/auth_has_branch()) one level up: every table
-- gets a `clinic_id`, and every existing policy is re-declared to also
-- require `clinic_id = auth_clinic_id()`.
--
-- `clinic_id` gets `default auth_clinic_id()` everywhere, so every existing
-- insert in the app (which always goes through the normal authenticated
-- client) keeps working unchanged — Postgres fills it in automatically.
-- Only inserts made from Edge Functions via the service-role client (which
-- has no auth.uid()) must set clinic_id explicitly.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- clinics — one row per tenant. trial_ends_at = null means unlimited/no
-- trial (the original clinic, and anyone later upgraded out-of-band).
-- ----------------------------------------------------------------------------
create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table clinics enable row level security;

-- ----------------------------------------------------------------------------
-- add clinic_id everywhere (nullable for now — backfilled below, locked down after)
-- ----------------------------------------------------------------------------
alter table branches add column clinic_id uuid references clinics(id) on delete cascade;
alter table users add column clinic_id uuid references clinics(id) on delete cascade;
alter table insurances add column clinic_id uuid references clinics(id) on delete cascade;
alter table doctors add column clinic_id uuid references clinics(id) on delete cascade;
alter table doctor_branches add column clinic_id uuid references clinics(id) on delete cascade;
alter table user_branches add column clinic_id uuid references clinics(id) on delete cascade;
alter table patients add column clinic_id uuid references clinics(id) on delete cascade;
alter table appointments add column clinic_id uuid references clinics(id) on delete cascade;
alter table treatments add column clinic_id uuid references clinics(id) on delete cascade;
alter table dental_chart add column clinic_id uuid references clinics(id) on delete cascade;
alter table insurance_claims add column clinic_id uuid references clinics(id) on delete cascade;
alter table insurance_claim_collections add column clinic_id uuid references clinics(id) on delete cascade;
alter table invoices add column clinic_id uuid references clinics(id) on delete cascade;
alter table payments add column clinic_id uuid references clinics(id) on delete cascade;
alter table clinic_settings add column clinic_id uuid references clinics(id) on delete cascade;

-- ----------------------------------------------------------------------------
-- users: super-admin flag (true only for the developer account) + last-seen
-- tracking (feeds the super-admin dashboard's "آخر ظهور" column)
-- ----------------------------------------------------------------------------
alter table users add column is_super_admin boolean not null default false;
alter table users add column last_seen_at timestamptz;

-- ----------------------------------------------------------------------------
-- clinic-scoping helper functions (same shape as auth_role()/auth_branch_id()).
-- Must come after the `users.clinic_id`/`users.is_super_admin` columns above —
-- Postgres parses a `language sql` function body at creation time, so these
-- columns have to already exist.
-- ----------------------------------------------------------------------------
create or replace function auth_clinic_id() returns uuid
language sql stable security definer set search_path = public as $$
  select clinic_id from users where id = auth.uid();
$$;

create or replace function auth_is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(is_super_admin, false) from users where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- backfill: everything that exists today belongs to one clinic — the real,
-- existing clinic. Named from whatever clinic_settings already has.
-- ----------------------------------------------------------------------------
do $$
declare
  v_clinic_id uuid;
  v_clinic_name text;
begin
  select name into v_clinic_name from clinic_settings limit 1;

  insert into clinics (name, is_active, trial_ends_at)
  values (coalesce(v_clinic_name, 'العيادة'), true, null)
  returning id into v_clinic_id;

  update branches set clinic_id = v_clinic_id;
  update users set clinic_id = v_clinic_id;
  update insurances set clinic_id = v_clinic_id;
  update doctors set clinic_id = v_clinic_id;
  update doctor_branches set clinic_id = v_clinic_id;
  update user_branches set clinic_id = v_clinic_id;
  update patients set clinic_id = v_clinic_id;
  update appointments set clinic_id = v_clinic_id;
  update treatments set clinic_id = v_clinic_id;
  update dental_chart set clinic_id = v_clinic_id;
  update insurance_claims set clinic_id = v_clinic_id;
  update insurance_claim_collections set clinic_id = v_clinic_id;
  update invoices set clinic_id = v_clinic_id;
  update payments set clinic_id = v_clinic_id;
  update clinic_settings set clinic_id = v_clinic_id;

  update users set is_super_admin = true where email = 'emanmasoud@dental.com';
end $$;

-- ----------------------------------------------------------------------------
-- lock clinic_id down: required from here on, auto-filled by default for
-- every future insert made through the normal authenticated client
-- ----------------------------------------------------------------------------
alter table branches alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table users alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table insurances alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table doctors alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table doctor_branches alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table user_branches alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table patients alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table appointments alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table treatments alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table dental_chart alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table insurance_claims alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table insurance_claim_collections alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table invoices alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table payments alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();
alter table clinic_settings alter column clinic_id set not null, alter column clinic_id set default auth_clinic_id();

-- ----------------------------------------------------------------------------
-- clinic_settings: was a global singleton (id boolean primary key check (id)).
-- Now one row per clinic — clinic_id becomes the primary key instead.
-- Dropping `id` automatically drops the check + primary-key constraints tied
-- to it.
-- ----------------------------------------------------------------------------
alter table clinic_settings drop column id;
alter table clinic_settings add primary key (clinic_id);

-- ============================================================================
-- RLS: re-declare every existing policy with clinic scoping AND'd in.
-- ============================================================================

-- branches
drop policy branches_select on branches;
create policy branches_select on branches for select to authenticated using (clinic_id = auth_clinic_id());
drop policy branches_write on branches;
create policy branches_write on branches for all to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id())
  with check (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- users (id = auth.uid() branch stays untouched — everyone must always be able
-- to read their own row, since that's how auth_is_super_admin() etc. resolve)
drop policy users_select on users;
create policy users_select on users for select to authenticated
  using (id = auth.uid() or (auth_role() = 'admin' and clinic_id = auth_clinic_id()));
drop policy users_update on users;
create policy users_update on users for update to authenticated
  using (id = auth.uid() or (auth_role() = 'admin' and clinic_id = auth_clinic_id()))
  with check (id = auth.uid() or (auth_role() = 'admin' and clinic_id = auth_clinic_id()));
drop policy users_admin_write on users;
create policy users_admin_write on users for insert to authenticated
  with check (auth_role() = 'admin' and clinic_id = auth_clinic_id());
drop policy users_admin_delete on users;
create policy users_admin_delete on users for delete to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- insurances
drop policy insurances_select on insurances;
create policy insurances_select on insurances for select to authenticated using (clinic_id = auth_clinic_id());
drop policy insurances_write on insurances;
create policy insurances_write on insurances for all to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id())
  with check (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- doctors
drop policy doctors_select on doctors;
create policy doctors_select on doctors for select to authenticated using (clinic_id = auth_clinic_id());
drop policy doctors_write on doctors;
create policy doctors_write on doctors for all to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id())
  with check (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- doctor_branches
drop policy doctor_branches_select on doctor_branches;
create policy doctor_branches_select on doctor_branches for select to authenticated using (clinic_id = auth_clinic_id());
drop policy doctor_branches_write on doctor_branches;
create policy doctor_branches_write on doctor_branches for all to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id())
  with check (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- user_branches
drop policy user_branches_select on user_branches;
create policy user_branches_select on user_branches for select to authenticated
  using (user_id = auth.uid() or (auth_role() = 'admin' and clinic_id = auth_clinic_id()));
drop policy user_branches_write on user_branches;
create policy user_branches_write on user_branches for all to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id())
  with check (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- patients
drop policy patients_select on patients;
create policy patients_select on patients for select to authenticated using (clinic_id = auth_clinic_id());
drop policy patients_insert on patients;
create policy patients_insert on patients for insert to authenticated
  with check (auth_role() in ('admin', 'receptionist', 'doctor') and clinic_id = auth_clinic_id());
drop policy patients_update on patients;
create policy patients_update on patients for update to authenticated
  using (auth_role() in ('admin', 'receptionist', 'doctor') and clinic_id = auth_clinic_id())
  with check (auth_role() in ('admin', 'receptionist', 'doctor') and clinic_id = auth_clinic_id());
drop policy patients_delete on patients;
create policy patients_delete on patients for delete to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- appointments
drop policy appointments_select on appointments;
create policy appointments_select on appointments for select to authenticated
  using (
    (auth_role() = 'admin' or auth_has_branch(branch_id) or doctor_id = auth_doctor_id())
    and clinic_id = auth_clinic_id()
  );
drop policy appointments_insert on appointments;
create policy appointments_insert on appointments for insert to authenticated
  with check (
    (auth_role() = 'admin' or (auth_role() in ('receptionist', 'doctor') and auth_has_branch(branch_id)))
    and clinic_id = auth_clinic_id()
  );
drop policy appointments_update on appointments;
create policy appointments_update on appointments for update to authenticated
  using (
    (auth_role() = 'admin' or auth_has_branch(branch_id) or doctor_id = auth_doctor_id())
    and clinic_id = auth_clinic_id()
  )
  with check (
    (auth_role() = 'admin' or auth_has_branch(branch_id) or doctor_id = auth_doctor_id())
    and clinic_id = auth_clinic_id()
  );
drop policy appointments_delete on appointments;
create policy appointments_delete on appointments for delete to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- treatments
drop policy treatments_select on treatments;
create policy treatments_select on treatments for select to authenticated
  using (auth_role() in ('admin', 'doctor') and clinic_id = auth_clinic_id());
drop policy treatments_write on treatments;
create policy treatments_write on treatments for insert to authenticated
  with check (auth_role() in ('admin', 'doctor') and clinic_id = auth_clinic_id());
drop policy treatments_update on treatments;
create policy treatments_update on treatments for update to authenticated
  using (auth_role() in ('admin', 'doctor') and clinic_id = auth_clinic_id())
  with check (auth_role() in ('admin', 'doctor') and clinic_id = auth_clinic_id());
drop policy treatments_delete on treatments;
create policy treatments_delete on treatments for delete to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- dental_chart (no delete policy existed before, none added now)
drop policy dental_chart_select on dental_chart;
create policy dental_chart_select on dental_chart for select to authenticated
  using (auth_role() in ('admin', 'doctor') and clinic_id = auth_clinic_id());
drop policy dental_chart_write on dental_chart;
create policy dental_chart_write on dental_chart for insert to authenticated
  with check (auth_role() in ('admin', 'doctor') and clinic_id = auth_clinic_id());
drop policy dental_chart_update on dental_chart;
create policy dental_chart_update on dental_chart for update to authenticated
  using (auth_role() in ('admin', 'doctor') and clinic_id = auth_clinic_id())
  with check (auth_role() in ('admin', 'doctor') and clinic_id = auth_clinic_id());

-- insurance_claims
drop policy insurance_claims_select on insurance_claims;
create policy insurance_claims_select on insurance_claims for select to authenticated using (clinic_id = auth_clinic_id());
drop policy insurance_claims_write on insurance_claims;
create policy insurance_claims_write on insurance_claims for insert to authenticated
  with check (auth_role() in ('admin', 'receptionist', 'accountant') and clinic_id = auth_clinic_id());
drop policy insurance_claims_update on insurance_claims;
create policy insurance_claims_update on insurance_claims for update to authenticated
  using (auth_role() in ('admin', 'receptionist', 'accountant') and clinic_id = auth_clinic_id())
  with check (auth_role() in ('admin', 'receptionist', 'accountant') and clinic_id = auth_clinic_id());
drop policy insurance_claims_delete on insurance_claims;
create policy insurance_claims_delete on insurance_claims for delete to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- insurance_claim_collections (no update policy existed before, none added now)
drop policy insurance_claim_collections_select on insurance_claim_collections;
create policy insurance_claim_collections_select on insurance_claim_collections for select to authenticated
  using (clinic_id = auth_clinic_id());
drop policy insurance_claim_collections_write on insurance_claim_collections;
create policy insurance_claim_collections_write on insurance_claim_collections for insert to authenticated
  with check (auth_role() in ('admin', 'receptionist', 'accountant') and clinic_id = auth_clinic_id());
drop policy insurance_claim_collections_delete on insurance_claim_collections;
create policy insurance_claim_collections_delete on insurance_claim_collections for delete to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- invoices
drop policy invoices_select on invoices;
create policy invoices_select on invoices for select to authenticated
  using ((auth_role() in ('admin', 'accountant') or auth_has_branch(branch_id)) and clinic_id = auth_clinic_id());
drop policy invoices_insert on invoices;
create policy invoices_insert on invoices for insert to authenticated
  with check (
    (auth_role() in ('admin', 'accountant') or (auth_role() = 'receptionist' and auth_has_branch(branch_id)))
    and clinic_id = auth_clinic_id()
  );
drop policy invoices_update on invoices;
create policy invoices_update on invoices for update to authenticated
  using (
    (auth_role() in ('admin', 'accountant') or (auth_role() = 'receptionist' and auth_has_branch(branch_id)))
    and clinic_id = auth_clinic_id()
  )
  with check (
    (auth_role() in ('admin', 'accountant') or (auth_role() = 'receptionist' and auth_has_branch(branch_id)))
    and clinic_id = auth_clinic_id()
  );
drop policy invoices_delete on invoices;
create policy invoices_delete on invoices for delete to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- payments (no update policy existed before, none added now)
drop policy payments_select on payments;
create policy payments_select on payments for select to authenticated
  using (
    (
      auth_role() in ('admin', 'accountant')
      or exists (select 1 from invoices i where i.id = payments.invoice_id and auth_has_branch(i.branch_id))
    )
    and clinic_id = auth_clinic_id()
  );
drop policy payments_insert on payments;
create policy payments_insert on payments for insert to authenticated
  with check (auth_role() in ('admin', 'receptionist', 'accountant') and clinic_id = auth_clinic_id());
drop policy payments_delete on payments;
create policy payments_delete on payments for delete to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- clinic_settings
drop policy clinic_settings_select on clinic_settings;
create policy clinic_settings_select on clinic_settings for select to authenticated using (clinic_id = auth_clinic_id());
drop policy clinic_settings_write on clinic_settings;
create policy clinic_settings_write on clinic_settings for all to authenticated
  using (auth_role() = 'admin' and clinic_id = auth_clinic_id())
  with check (auth_role() = 'admin' and clinic_id = auth_clinic_id());

-- clinics: every user can read their own clinic row (trial banner/gate need this)
create policy clinics_select on clinics for select to authenticated using (id = auth_clinic_id());

-- ----------------------------------------------------------------------------
-- Super admin: narrowly-scoped extra policies on just clinics + users, so the
-- developer's own account can see/manage every clinic without weakening
-- isolation on any of the 13 actual clinical/data tables. These are
-- additional *permissive* policies — Postgres OR's them with the policies
-- above for the same command, so normal users are unaffected.
-- ----------------------------------------------------------------------------
create policy clinics_superadmin_select on clinics for select to authenticated using (auth_is_super_admin());
create policy clinics_superadmin_update on clinics for update to authenticated
  using (auth_is_super_admin()) with check (auth_is_super_admin());
create policy users_superadmin_select on users for select to authenticated using (auth_is_super_admin());
create policy users_superadmin_update on users for update to authenticated
  using (auth_is_super_admin()) with check (auth_is_super_admin());

-- ----------------------------------------------------------------------------
-- Storage: treatment-photos paths must now be prefixed with the clinic id
-- (first path segment). Existing uploaded photos predate this prefix and
-- are not important — safe to delete from Storage rather than migrate.
-- ----------------------------------------------------------------------------
drop policy treatment_photos_select on storage.objects;
create policy treatment_photos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'treatment-photos'
    and auth_role() in ('admin', 'doctor')
    and (storage.foldername(name))[1] = auth_clinic_id()::text
  );
drop policy treatment_photos_insert on storage.objects;
create policy treatment_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'treatment-photos'
    and auth_role() in ('admin', 'doctor')
    and (storage.foldername(name))[1] = auth_clinic_id()::text
  );
drop policy treatment_photos_delete on storage.objects;
create policy treatment_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'treatment-photos'
    and auth_role() in ('admin', 'doctor')
    and (storage.foldername(name))[1] = auth_clinic_id()::text
  );

-- ----------------------------------------------------------------------------
-- Trigger functions: set clinic_id explicitly on the rows they insert rather
-- than relying solely on the column default — more robust and reads clearly.
-- ----------------------------------------------------------------------------
create or replace function upsert_dental_chart_on_treatment()
returns trigger as $$
begin
  if new.tooth_number is not null then
    insert into dental_chart (patient_id, tooth_number, current_status, last_updated, clinic_id)
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
      now(),
      new.clinic_id
    )
    on conflict (patient_id, tooth_number)
    do update set current_status = excluded.current_status, last_updated = now();
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function create_invoice_on_treatment()
returns trigger as $$
begin
  if new.cost > 0 then
    insert into invoices (
      patient_id, treatment_id, branch_id,
      total_amount, insurance_covered_amount, patient_due_amount,
      status, issue_date, clinic_id
    )
    values (
      new.patient_id, new.id, new.branch_id,
      new.cost, 0, new.cost,
      'unpaid', new.procedure_date, new.clinic_id
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
