-- ============================================================================
-- Row Level Security — role-based access (admin/doctor/receptionist/accountant)
-- and branch scoping (فروع العيادة)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read `users` regardless of
-- the caller's own RLS visibility into that table)
-- ----------------------------------------------------------------------------
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid();
$$;

create or replace function auth_branch_id() returns uuid
language sql stable security definer set search_path = public as $$
  select branch_id from users where id = auth.uid();
$$;

create or replace function auth_doctor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select linked_doctor_id from users where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS everywhere
-- ----------------------------------------------------------------------------
alter table branches enable row level security;
alter table users enable row level security;
alter table insurances enable row level security;
alter table doctors enable row level security;
alter table doctor_branches enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table treatments enable row level security;
alter table dental_chart enable row level security;
alter table insurance_claims enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;

-- ----------------------------------------------------------------------------
-- branches — everyone can read (needed for dropdowns), only admin manages
-- ----------------------------------------------------------------------------
create policy branches_select on branches for select to authenticated using (true);
create policy branches_write on branches for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ----------------------------------------------------------------------------
-- users — see self, admin sees/manages all
-- ----------------------------------------------------------------------------
create policy users_select on users for select to authenticated
  using (id = auth.uid() or auth_role() = 'admin');
create policy users_update on users for update to authenticated
  using (id = auth.uid() or auth_role() = 'admin')
  with check (id = auth.uid() or auth_role() = 'admin');
create policy users_admin_write on users for insert to authenticated
  with check (auth_role() = 'admin');
create policy users_admin_delete on users for delete to authenticated
  using (auth_role() = 'admin');

-- ----------------------------------------------------------------------------
-- insurances / doctors / doctor_branches — readable by all staff, admin manages
-- ----------------------------------------------------------------------------
create policy insurances_select on insurances for select to authenticated using (true);
create policy insurances_write on insurances for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy doctors_select on doctors for select to authenticated using (true);
create policy doctors_write on doctors for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy doctor_branches_select on doctor_branches for select to authenticated using (true);
create policy doctor_branches_write on doctor_branches for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ----------------------------------------------------------------------------
-- patients — shared clinic-wide (a patient can be seen at any branch).
-- NOTE: medical_history/allergies are still row-visible at the DB layer;
-- the app UI hides those columns for the receptionist role. Harden later
-- with a security-definer RPC if stricter column-level enforcement is needed.
-- ----------------------------------------------------------------------------
create policy patients_select on patients for select to authenticated using (true);
create policy patients_insert on patients for insert to authenticated
  with check (auth_role() in ('admin', 'receptionist', 'doctor'));
create policy patients_update on patients for update to authenticated
  using (auth_role() in ('admin', 'receptionist', 'doctor'))
  with check (auth_role() in ('admin', 'receptionist', 'doctor'));
create policy patients_delete on patients for delete to authenticated
  using (auth_role() = 'admin');

-- ----------------------------------------------------------------------------
-- appointments — scoped by branch, doctors also see their own across branches
-- ----------------------------------------------------------------------------
create policy appointments_select on appointments for select to authenticated
  using (
    auth_role() = 'admin'
    or branch_id = auth_branch_id()
    or doctor_id = auth_doctor_id()
  );

create policy appointments_insert on appointments for insert to authenticated
  with check (
    auth_role() = 'admin'
    or (auth_role() in ('receptionist', 'doctor') and branch_id = auth_branch_id())
  );

create policy appointments_update on appointments for update to authenticated
  using (
    auth_role() = 'admin'
    or branch_id = auth_branch_id()
    or doctor_id = auth_doctor_id()
  )
  with check (
    auth_role() = 'admin'
    or branch_id = auth_branch_id()
    or doctor_id = auth_doctor_id()
  );

create policy appointments_delete on appointments for delete to authenticated
  using (auth_role() = 'admin');

-- ----------------------------------------------------------------------------
-- treatments & dental_chart — clinical data, doctor/admin only
-- ----------------------------------------------------------------------------
create policy treatments_select on treatments for select to authenticated
  using (auth_role() in ('admin', 'doctor'));
create policy treatments_write on treatments for insert to authenticated
  with check (auth_role() in ('admin', 'doctor'));
create policy treatments_update on treatments for update to authenticated
  using (auth_role() in ('admin', 'doctor'))
  with check (auth_role() in ('admin', 'doctor'));
create policy treatments_delete on treatments for delete to authenticated
  using (auth_role() = 'admin');

create policy dental_chart_select on dental_chart for select to authenticated
  using (auth_role() in ('admin', 'doctor'));
create policy dental_chart_write on dental_chart for insert to authenticated
  with check (auth_role() in ('admin', 'doctor'));
create policy dental_chart_update on dental_chart for update to authenticated
  using (auth_role() in ('admin', 'doctor'))
  with check (auth_role() in ('admin', 'doctor'));

-- ----------------------------------------------------------------------------
-- insurance_claims — amounts/status only, no clinical detail: visible to all staff
-- ----------------------------------------------------------------------------
create policy insurance_claims_select on insurance_claims for select to authenticated using (true);
create policy insurance_claims_write on insurance_claims for insert to authenticated
  with check (auth_role() in ('admin', 'receptionist', 'accountant'));
create policy insurance_claims_update on insurance_claims for update to authenticated
  using (auth_role() in ('admin', 'receptionist', 'accountant'))
  with check (auth_role() in ('admin', 'receptionist', 'accountant'));
create policy insurance_claims_delete on insurance_claims for delete to authenticated
  using (auth_role() = 'admin');

-- ----------------------------------------------------------------------------
-- invoices — branch-scoped for reception, global for admin/accountant
-- ----------------------------------------------------------------------------
create policy invoices_select on invoices for select to authenticated
  using (auth_role() in ('admin', 'accountant') or branch_id = auth_branch_id());
create policy invoices_insert on invoices for insert to authenticated
  with check (
    auth_role() in ('admin', 'accountant')
    or (auth_role() = 'receptionist' and branch_id = auth_branch_id())
  );
create policy invoices_update on invoices for update to authenticated
  using (
    auth_role() in ('admin', 'accountant')
    or (auth_role() = 'receptionist' and branch_id = auth_branch_id())
  )
  with check (
    auth_role() in ('admin', 'accountant')
    or (auth_role() = 'receptionist' and branch_id = auth_branch_id())
  );
create policy invoices_delete on invoices for delete to authenticated
  using (auth_role() = 'admin');

-- ----------------------------------------------------------------------------
-- payments — follow the parent invoice's branch scoping
-- ----------------------------------------------------------------------------
create policy payments_select on payments for select to authenticated
  using (
    auth_role() in ('admin', 'accountant')
    or exists (
      select 1 from invoices i
      where i.id = payments.invoice_id and i.branch_id = auth_branch_id()
    )
  );
create policy payments_insert on payments for insert to authenticated
  with check (auth_role() in ('admin', 'receptionist', 'accountant'));
create policy payments_delete on payments for delete to authenticated
  using (auth_role() = 'admin');
