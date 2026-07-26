-- ============================================================================
-- نظام إدارة عيادة الأسنان — Initial schema
-- عيادة واحدة بعدة فروع (single clinic, multiple branches)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUM types
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'doctor', 'receptionist', 'accountant');
create type appointment_status as enum ('booked', 'completed', 'cancelled', 'no_show');
create type tooth_status as enum ('healthy', 'filled', 'extracted', 'crowned', 'needs_treatment', 'root_canal', 'implant');
create type claim_status as enum ('pending', 'approved', 'rejected');
create type invoice_status as enum ('unpaid', 'partial', 'paid');
create type payment_method as enum ('cash', 'card', 'installment', 'insurance', 'transfer');
create type gender as enum ('male', 'female');

-- ----------------------------------------------------------------------------
-- branches (فروع العيادة)
-- ----------------------------------------------------------------------------
create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- users (مستخدمو النظام) — mirrors auth.users, adds role/branch scoping
-- ----------------------------------------------------------------------------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'receptionist',
  branch_id uuid references branches(id) on delete set null, -- null = admin sees all branches
  linked_doctor_id uuid, -- FK added after doctors table exists
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- insurances (شركات التأمين)
-- ----------------------------------------------------------------------------
create table insurances (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  coverage_percentage numeric(5,2) not null default 0 check (coverage_percentage >= 0 and coverage_percentage <= 100),
  contact_phone text,
  contract_details text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- doctors (الأطباء)
-- ----------------------------------------------------------------------------
create table doctors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  specialty text,
  phone text,
  email text,
  working_days jsonb not null default '[]', -- e.g. ["sat","sun","mon"]
  working_hours_start time,
  working_hours_end time,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table users
  add constraint users_linked_doctor_id_fkey
  foreign key (linked_doctor_id) references doctors(id) on delete set null;

-- doctors <-> branches (many-to-many: a doctor can work across branches)
create table doctor_branches (
  doctor_id uuid not null references doctors(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  primary key (doctor_id, branch_id)
);

-- ----------------------------------------------------------------------------
-- patients (المرضى) — shared across branches (one clinic identity)
-- ----------------------------------------------------------------------------
create table patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  date_of_birth date,
  gender gender,
  address text,
  national_id text,
  medical_history text,
  allergies text,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_id uuid references insurances(id) on delete set null,
  primary_branch_id uuid references branches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create extension if not exists "pg_trgm";

create index patients_full_name_idx on patients using gin (full_name gin_trgm_ops);
create index patients_phone_idx on patients (phone);
create index patients_national_id_idx on patients (national_id);

-- ----------------------------------------------------------------------------
-- appointments (المواعيد)
-- ----------------------------------------------------------------------------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid not null references doctors(id) on delete restrict,
  branch_id uuid not null references branches(id) on delete restrict,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status appointment_status not null default 'booked',
  reason text,
  notes text,
  reminder_sent boolean not null default false,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint appointment_time_valid check (end_time > start_time)
);

create index appointments_doctor_date_idx on appointments (doctor_id, appointment_date);
create index appointments_patient_idx on appointments (patient_id);
create index appointments_branch_date_idx on appointments (branch_id, appointment_date);

-- Prevent double-booking: no overlapping active appointments for the same doctor
create extension if not exists "btree_gist";

alter table appointments
  add constraint appointments_no_doctor_overlap
  exclude using gist (
    doctor_id with =,
    tsrange(appointment_date + start_time, appointment_date + end_time) with &&
  )
  where (status = 'booked');

-- ----------------------------------------------------------------------------
-- treatments (العلاجات/الإجراءات)
-- ----------------------------------------------------------------------------
create table treatments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid not null references doctors(id) on delete restrict,
  appointment_id uuid references appointments(id) on delete set null,
  branch_id uuid not null references branches(id) on delete restrict,
  tooth_number smallint check (tooth_number between 1 and 32),
  procedure_type text not null, -- حشو / خلع / تركيب / تنظيف / عصب ...
  procedure_date date not null default current_date,
  cost numeric(10,2) not null default 0,
  notes text,
  before_image_url text,
  after_image_url text,
  created_at timestamptz not null default now()
);

create index treatments_patient_idx on treatments (patient_id);
create index treatments_tooth_idx on treatments (patient_id, tooth_number);

-- ----------------------------------------------------------------------------
-- dental_chart (الخريطة السنية — حالة كل سنة حاليًا)
-- ----------------------------------------------------------------------------
create table dental_chart (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  tooth_number smallint not null check (tooth_number between 1 and 32),
  current_status tooth_status not null default 'healthy',
  last_updated timestamptz not null default now(),
  unique (patient_id, tooth_number)
);

-- ----------------------------------------------------------------------------
-- insurance_claims (مطالبات التأمين)
-- ----------------------------------------------------------------------------
create table insurance_claims (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  insurance_id uuid not null references insurances(id) on delete restrict,
  treatment_id uuid not null references treatments(id) on delete cascade,
  claim_amount numeric(10,2) not null,
  approved_amount numeric(10,2),
  status claim_status not null default 'pending',
  submitted_date date not null default current_date,
  resolved_date date
);

create index insurance_claims_patient_idx on insurance_claims (patient_id);

-- ----------------------------------------------------------------------------
-- invoices (الفواتير)
-- ----------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  treatment_id uuid references treatments(id) on delete set null,
  branch_id uuid not null references branches(id) on delete restrict,
  total_amount numeric(10,2) not null default 0,
  insurance_covered_amount numeric(10,2) not null default 0,
  patient_due_amount numeric(10,2) not null default 0,
  status invoice_status not null default 'unpaid',
  issue_date date not null default current_date,
  due_date date,
  created_at timestamptz not null default now()
);

create index invoices_patient_idx on invoices (patient_id);
create index invoices_status_idx on invoices (status);

-- ----------------------------------------------------------------------------
-- payments (المدفوعات)
-- ----------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount_paid numeric(10,2) not null,
  payment_method payment_method not null,
  payment_date date not null default current_date,
  received_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index payments_invoice_idx on payments (invoice_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger for patients
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger patients_set_updated_at
  before update on patients
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- keep dental_chart / invoice totals in sync when a treatment is recorded
-- ----------------------------------------------------------------------------
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

create trigger treatments_sync_dental_chart
  after insert on treatments
  for each row execute function upsert_dental_chart_on_treatment();
