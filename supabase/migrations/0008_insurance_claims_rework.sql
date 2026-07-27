-- ============================================================================
-- Insurance claims tracking: submit a claim per invoice -> insurer
-- approves/rejects with an amount -> clinic collects that money, possibly in
-- several installments. `insurance_claims` existed since 0001 but was never
-- wired to the app; rework it to key off invoices (so non-treatment invoices
-- can be claimed too) and add a child table for partial collections.
-- ============================================================================

alter table insurance_claims add column if not exists invoice_id uuid references invoices(id) on delete cascade;

update insurance_claims c
set invoice_id = i.id
from invoices i
where i.treatment_id = c.treatment_id and c.invoice_id is null;

delete from insurance_claims where invoice_id is null;

alter table insurance_claims alter column invoice_id set not null;
alter table insurance_claims add constraint insurance_claims_invoice_id_unique unique (invoice_id);
alter table insurance_claims drop column treatment_id;
alter table insurance_claims add column if not exists notes text;

create table insurance_claim_collections (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references insurance_claims(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  received_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index insurance_claim_collections_claim_idx on insurance_claim_collections (claim_id);

alter table insurance_claim_collections enable row level security;

create policy insurance_claim_collections_select on insurance_claim_collections for select to authenticated using (true);
create policy insurance_claim_collections_write on insurance_claim_collections for insert to authenticated
  with check (auth_role() in ('admin', 'receptionist', 'accountant'));
create policy insurance_claim_collections_delete on insurance_claim_collections for delete to authenticated
  using (auth_role() = 'admin');
