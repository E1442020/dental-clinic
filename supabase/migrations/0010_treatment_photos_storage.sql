-- ============================================================================
-- Private storage bucket for treatment before/after photos. Kept private
-- (not public) since these are patient dental photos — the app reads them
-- back via short-lived signed URLs rather than permanent public links.
-- Access follows the same admin/doctor-only rule as the `treatments` table.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('treatment-photos', 'treatment-photos', false)
on conflict (id) do nothing;

create policy treatment_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'treatment-photos' and auth_role() in ('admin', 'doctor'));

create policy treatment_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'treatment-photos' and auth_role() in ('admin', 'doctor'));

create policy treatment_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'treatment-photos' and auth_role() in ('admin', 'doctor'));
