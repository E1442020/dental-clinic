-- ============================================================================
-- CLEANUP — removes old manually-typed test data (patients, doctors,
-- insurance companies, branches) while keeping exactly the records created
-- by seed_demo_data.sql. Run this AFTER seed_demo_data.sql.
--
-- Safe by construction: it never touches a row whose name matches the known
-- seed list. Deleting a patient cascades to their own appointments/
-- treatments/invoices/payments automatically (that's already how the schema
-- works). Doctors and branches use RESTRICT instead of CASCADE on
-- appointments/treatments, so this explicitly clears those first, then
-- removes the doctor/branch. Safe to re-run — anything already deleted is
-- just skipped.
-- ============================================================================

do $$
declare
  keep_patient_names text[] := array[
    'محمود سعيد','فاطمة الزهراء','عمر خالد','نور الهدى','كريم عادل','منى إبراهيم',
    'يوسف حسن','هبة الله طارق','مصطفى جمال','رنا وليد','طارق منير','إيمان صبري',
    'حسام الدين محمد','سلمى ماهر','أحمد رفعت','ندى شوقي','خالد عبد الرحمن','مريم لطفي',
    'عمرو صلاح','دينا فوزي','وليد نبيل','شيرين عاطف','تامر إسماعيل','آية جمال'
  ];
  keep_doctor_names text[] := array[
    'د. محمد الشريف','د. سارة عبد الوهاب','د. أحمد فتحي','د. ياسمين كمال'
  ];
  keep_insurance_names text[] := array[
    'تأمين مصر الصحي','ميدنت للتأمين','الأهلي للرعاية الصحية'
  ];
  keep_branch_names text[] := array[
    'الفرع الرئيسي - المهندسين','فرع مدينة نصر'
  ];
  old_doctor_ids uuid[];
  old_branch_ids uuid[];
  deleted_patients int;
  deleted_doctors int;
  deleted_insurances int;
  deleted_branches int;
begin
  -- 1) Old patients — cascades to remove their own appointments/treatments/invoices/payments
  delete from patients where full_name <> all(keep_patient_names);
  get diagnostics deleted_patients = row_count;

  -- 2) Old doctors — clear anything still pointing at them first (RESTRICT, not CASCADE)
  select array_agg(id) into old_doctor_ids from doctors where full_name <> all(keep_doctor_names);

  if old_doctor_ids is not null then
    delete from appointments where doctor_id = any(old_doctor_ids);
    delete from treatments where doctor_id = any(old_doctor_ids);
    delete from doctors where id = any(old_doctor_ids);
  end if;
  deleted_doctors := coalesce(array_length(old_doctor_ids, 1), 0);

  -- 3) Old insurance companies (any patient reference already gone with step 1)
  delete from insurances where company_name <> all(keep_insurance_names);
  get diagnostics deleted_insurances = row_count;

  -- 4) Old branches — clear anything still pointing at them first (RESTRICT, not CASCADE)
  select array_agg(id) into old_branch_ids from branches where name <> all(keep_branch_names);

  if old_branch_ids is not null then
    delete from appointments where branch_id = any(old_branch_ids);
    delete from treatments where branch_id = any(old_branch_ids);
    delete from invoices where branch_id = any(old_branch_ids);
    delete from branches where id = any(old_branch_ids);
  end if;
  deleted_branches := coalesce(array_length(old_branch_ids, 1), 0);

  raise notice 'Removed % old patients, % old doctors, % old insurance companies, % old branches.',
    deleted_patients, deleted_doctors, deleted_insurances, deleted_branches;
end $$;
