-- ============================================================================
-- Some receptionists (and possibly accountants) work across more than one
-- branch. The old single users.branch_id can't represent that, and RLS built
-- on it (`branch_id = auth_branch_id()`) silently returns zero rows for any
-- branch beyond a user's one assigned branch — which reads as "the page is
-- empty/broken" rather than an access error.
--
-- Mirrors the existing doctor_branches pattern: a user can now be assigned to
-- any number of branches via user_branches, and branch-scoped RLS checks
-- membership there instead of a single column. users.branch_id is kept as
-- the user's default/primary branch (used to preselect the branch switcher),
-- but is no longer what RLS itself checks.
-- ============================================================================

create table user_branches (
  user_id uuid not null references users(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  primary key (user_id, branch_id)
);

alter table user_branches enable row level security;

create policy user_branches_select on user_branches for select to authenticated
  using (user_id = auth.uid() or auth_role() = 'admin');
create policy user_branches_write on user_branches for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- Backfill: every existing user with a branch_id gets that one row here, so nothing currently
-- working breaks the moment this migration runs.
insert into user_branches (user_id, branch_id)
select id, branch_id from users where branch_id is not null
on conflict do nothing;

create or replace function auth_has_branch(target_branch_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_branches where user_id = auth.uid() and branch_id = target_branch_id
  );
$$;

-- ----------------------------------------------------------------------------
-- appointments — re-declared to check auth_has_branch() instead of the old
-- single-branch equality
-- ----------------------------------------------------------------------------
drop policy appointments_select on appointments;
create policy appointments_select on appointments for select to authenticated
  using (
    auth_role() = 'admin'
    or auth_has_branch(branch_id)
    or doctor_id = auth_doctor_id()
  );

drop policy appointments_insert on appointments;
create policy appointments_insert on appointments for insert to authenticated
  with check (
    auth_role() = 'admin'
    or (auth_role() in ('receptionist', 'doctor') and auth_has_branch(branch_id))
  );

drop policy appointments_update on appointments;
create policy appointments_update on appointments for update to authenticated
  using (
    auth_role() = 'admin'
    or auth_has_branch(branch_id)
    or doctor_id = auth_doctor_id()
  )
  with check (
    auth_role() = 'admin'
    or auth_has_branch(branch_id)
    or doctor_id = auth_doctor_id()
  );

-- ----------------------------------------------------------------------------
-- invoices — same re-declare
-- ----------------------------------------------------------------------------
drop policy invoices_select on invoices;
create policy invoices_select on invoices for select to authenticated
  using (auth_role() in ('admin', 'accountant') or auth_has_branch(branch_id));

drop policy invoices_insert on invoices;
create policy invoices_insert on invoices for insert to authenticated
  with check (
    auth_role() in ('admin', 'accountant')
    or (auth_role() = 'receptionist' and auth_has_branch(branch_id))
  );

drop policy invoices_update on invoices;
create policy invoices_update on invoices for update to authenticated
  using (
    auth_role() in ('admin', 'accountant')
    or (auth_role() = 'receptionist' and auth_has_branch(branch_id))
  )
  with check (
    auth_role() in ('admin', 'accountant')
    or (auth_role() = 'receptionist' and auth_has_branch(branch_id))
  );

-- ----------------------------------------------------------------------------
-- payments — follows the parent invoice's branch scoping
-- ----------------------------------------------------------------------------
drop policy payments_select on payments;
create policy payments_select on payments for select to authenticated
  using (
    auth_role() in ('admin', 'accountant')
    or exists (
      select 1 from invoices i
      where i.id = payments.invoice_id and auth_has_branch(i.branch_id)
    )
  );
