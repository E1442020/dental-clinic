-- ============================================================================
-- Extra fields for the super-admin "clinics management" page: an optional
-- paid-subscription end date (independent of the free trial — set once
-- someone actually pays out-of-band) and free-form notes.
-- ============================================================================

alter table clinics add column if not exists subscription_ends_at timestamptz;
alter table clinics add column if not exists notes text;
